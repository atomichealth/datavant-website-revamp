/**
 * Main navigation behaviour (section-aware header).
 *
 * Disclosure pattern: every top-level item with a panel has a
 * <button aria-expanded aria-controls> trigger. Desktop (>= 993px, hover
 * capable) opens on hover intent and click; click toggles everywhere.
 * Escape closes and refocuses the trigger, ArrowLeft/Right, Home and End
 * move across the top level, leaving the item (focus or pointer) closes it,
 * clicking outside closes all, crossing the desktop breakpoint closes all.
 *
 * The hamburger is the CSS-only #toggle checkbox; this script keeps
 * html.open and the label's aria-expanded in sync with it.
 *
 * The pre-header "Discover Datavant" dropdown (initDiscover) follows the
 * same disclosure pattern: click toggles, hover intent opens on desktop,
 * Escape / focus leaving / clicking outside closes.
 */
(function () {
	'use strict';

	var DESKTOP_QUERY = '(min-width: 993px)';
	var HOVER_QUERY = '(hover: hover)';
	// Short enough to feel instant, long enough to ignore a cursor passing by.
	var OPEN_DELAY = 60;
	var CLOSE_DELAY = 200;
	// Matches the panel fade-out in css/shared/_header.less.
	var CLOSE_FADE = 140;

	function init() {
		var nav = document.getElementById('nav');
		if (!nav || !nav.classList.contains('main-nav') || nav.getAttribute('data-main-nav-ready')) {
			return;
		}
		nav.setAttribute('data-main-nav-ready', '1');

		var mqDesktop = window.matchMedia(DESKTOP_QUERY);
		var mqHover = window.matchMedia(HOVER_QUERY);
		var items = Array.prototype.slice.call(nav.querySelectorAll('.main-nav__item--has-panel'));
		var hoverTimer = null;

		function isDesktop() {
			return mqDesktop.matches;
		}

		function hoverEnabled() {
			return isDesktop() && mqHover.matches;
		}

		function triggerOf(item) {
			return item.querySelector(':scope > .main-nav__trigger');
		}

		function isOpen(item) {
			return item.classList.contains('is-open');
		}

		function close(item) {
			if (!isOpen(item)) {
				return;
			}
			item.classList.remove('is-open');
			var trigger = triggerOf(item);
			if (trigger) {
				trigger.setAttribute('aria-expanded', 'false');
			}
		}

		function closeAll(except) {
			items.forEach(function (item) {
				if (item !== except) {
					close(item);
				}
			});
		}

		// Centre a compact list card (Company) under its trigger, clamped to
		// the header container so it never hangs past the container edge.
		// The panel is positioned against header.main (its offsetParent).
		function positionCompactList(item) {
			var panel = item.querySelector(':scope > .mega-menu--compact-list');
			var trigger = triggerOf(item);
			if (!panel || !trigger) {
				return;
			}
			if (!isDesktop()) {
				panel.style.left = '';
				return;
			}
			var parent = panel.offsetParent;
			if (!parent) {
				return;
			}
			var container = nav.closest('.container') || parent;
			var parentBox = parent.getBoundingClientRect();
			var bounds = container.getBoundingClientRect();
			var triggerBox = trigger.getBoundingClientRect();
			var width = panel.offsetWidth;
			var left = triggerBox.left + triggerBox.width / 2 - width / 2;
			left = Math.max(bounds.left, Math.min(left, bounds.right - width));
			panel.style.left = Math.round(left - parentBox.left) + 'px';
		}

		function open(item) {
			// Desktop panels are exclusive; the mobile accordion allows one at a time too.
			closeAll(item);
			if (isOpen(item)) {
				return;
			}
			item.classList.add('is-open');
			positionCompactList(item);
			var trigger = triggerOf(item);
			if (trigger) {
				trigger.setAttribute('aria-expanded', 'true');
			}
		}

		function clearHoverTimer() {
			if (hoverTimer) {
				window.clearTimeout(hoverTimer);
				hoverTimer = null;
			}
		}

		items.forEach(function (item) {
			var trigger = triggerOf(item);
			if (!trigger) {
				return;
			}

			// Set when hover intent opened the panel, so a follow-up click on
			// the same trigger does not toggle it shut under the pointer.
			var openedByHover = false;

			trigger.addEventListener('click', function (event) {
				event.preventDefault();
				clearHoverTimer();
				if (isOpen(item)) {
					if (openedByHover && hoverEnabled()) {
						return;
					}
					close(item);
				} else {
					openedByHover = false;
					open(item);
				}
			});

			item.addEventListener('mouseenter', function () {
				if (!hoverEnabled()) {
					return;
				}
				clearHoverTimer();
				hoverTimer = window.setTimeout(function () {
					if (!isOpen(item)) {
						openedByHover = true;
					}
					open(item);
				}, OPEN_DELAY);
			});

			item.addEventListener('mouseleave', function () {
				if (!hoverEnabled()) {
					return;
				}
				clearHoverTimer();
				hoverTimer = window.setTimeout(function () {
					close(item);
					openedByHover = false;
				}, CLOSE_DELAY);
			});

			item.addEventListener('focusout', function (event) {
				if (!isDesktop()) {
					return;
				}
				var next = event.relatedTarget;
				if (next && item.contains(next)) {
					return;
				}
				close(item);
			});

			item.addEventListener('keydown', function (event) {
				if (event.key === 'Escape' && isOpen(item)) {
					event.preventDefault();
					event.stopPropagation();
					close(item);
					trigger.focus();
				}
			});
		});

		// Arrow navigation across the top level (desktop only).
		var topControls = Array.prototype.slice.call(
			nav.querySelectorAll('.main-nav__list > .main-nav__item > .main-nav__trigger, .main-nav__list > .main-nav__item > .main-nav__link')
		);

		topControls.forEach(function (control, index) {
			control.addEventListener('keydown', function (event) {
				if (!isDesktop() || topControls.length < 2) {
					return;
				}
				var target = null;
				switch (event.key) {
					case 'ArrowRight':
						target = topControls[(index + 1) % topControls.length];
						break;
					case 'ArrowLeft':
						target = topControls[(index - 1 + topControls.length) % topControls.length];
						break;
					case 'Home':
						target = topControls[0];
						break;
					case 'End':
						target = topControls[topControls.length - 1];
						break;
					default:
						return;
				}
				event.preventDefault();
				closeAll();
				target.focus();
			});
		});

		document.addEventListener('click', function (event) {
			if (!nav.contains(event.target)) {
				closeAll();
			}
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') {
				closeAll();
			}
		});

		function onBreakpointChange() {
			clearHoverTimer();
			closeAll();
			// Leaving the hamburger range with the drawer open would keep
			// html.open (and its scroll lock) on the desktop layout.
			if (isDesktop() && toggle && toggle.checked) {
				toggle.checked = false;
				syncToggle();
			}
		}
		if (typeof mqDesktop.addEventListener === 'function') {
			mqDesktop.addEventListener('change', onBreakpointChange);
		} else if (typeof mqDesktop.addListener === 'function') {
			mqDesktop.addListener(onBreakpointChange);
		}

		// Keep an open Company card centred while the window is resized.
		window.addEventListener('resize', function () {
			items.forEach(function (item) {
				if (isOpen(item)) {
					positionCompactList(item);
				}
			});
		});

		// Hamburger: keep html.open and aria-expanded in sync with the checkbox.
		var toggle = document.getElementById('toggle');
		var label = document.querySelector('label.toggle');
		var header = nav.closest ? nav.closest('header') : null;

		// The drawer is a fixed sheet hanging from the header's bottom edge
		// (css/main-nav.css reads --dv-drawer-top); the header may sit below
		// the utility bar, be partly scrolled away, or be fixed to the top.
		function setDrawerTop() {
			if (!header || !toggle || !toggle.checked) {
				return;
			}
			var bottom = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
			document.documentElement.style.setProperty('--dv-drawer-top', bottom + 'px');
		}

		function syncToggle() {
			if (!toggle) {
				return;
			}
			document.documentElement.classList.toggle('open', toggle.checked);
			if (label) {
				label.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
			}
			if (toggle.checked) {
				setDrawerTop();
			} else {
				closeAll();
				setSearchOpen(false);
			}
		}

		if (toggle) {
			toggle.addEventListener('change', syncToggle);
			window.addEventListener('resize', setDrawerTop);
			window.addEventListener('scroll', setDrawerTop, { passive: true });
			if (header) {
				header.addEventListener('transitionend', setDrawerTop);
			}
			syncToggle();
		}

		// "Search" disclosure at the foot of the drawer reveals the search form.
		var searchWrap = nav.querySelector('.main-nav__search');
		var searchToggle = searchWrap ? searchWrap.querySelector('.main-nav__search-toggle') : null;
		var searchPanel = searchWrap ? searchWrap.querySelector('.main-nav__search-panel') : null;

		function setSearchOpen(open) {
			if (!searchToggle || !searchPanel) {
				return;
			}
			searchWrap.classList.toggle('is-open', open);
			searchToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			if (open) {
				searchPanel.removeAttribute('hidden');
				var field = searchPanel.querySelector('input[type="text"], input[type="search"]');
				if (field) {
					field.focus();
				}
			} else {
				searchPanel.setAttribute('hidden', '');
			}
		}

		if (searchToggle) {
			searchToggle.addEventListener('click', function () {
				setSearchOpen(searchPanel.hasAttribute('hidden'));
			});
		}

		if (label) {
			label.addEventListener('keydown', function (event) {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					label.click();
				}
			});
		}

		// Following a link inside the drawer closes it.
		nav.addEventListener('click', function (event) {
			var link = event.target.closest ? event.target.closest('a[href]') : null;
			if (!link || isDesktop() || !toggle || !toggle.checked) {
				return;
			}
			toggle.checked = false;
			syncToggle();
		});
	}

	function initDiscover() {
		var wrapper = document.querySelector('.pre-header__discover');
		if (!wrapper || wrapper.getAttribute('data-discover-ready')) {
			return;
		}
		wrapper.setAttribute('data-discover-ready', '1');

		var bar = wrapper.closest('.pre-header');
		var trigger = wrapper.querySelector(':scope > .pre-header__discover-trigger');
		var panel = wrapper.querySelector(':scope > .pre-header__discover-panel');
		if (!trigger || !panel) {
			return;
		}

		var mqDesktop = window.matchMedia(DESKTOP_QUERY);
		var mqHover = window.matchMedia(HOVER_QUERY);
		var hoverTimer = null;
		var openedByHover = false;

		function hoverEnabled() {
			return mqDesktop.matches && mqHover.matches;
		}

		function isOpen() {
			return wrapper.classList.contains('is-open');
		}

		// The bar is lifted above header.main while the panel shows. On
		// close it stays lifted for the fade-out (css/shared/_header.less,
		// 200ms) so the panel does not drop behind the header mid-fade.
		var liftTimer = null;

		function setOpen(open) {
			wrapper.classList.toggle('is-open', open);
			trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
			if (liftTimer) {
				window.clearTimeout(liftTimer);
				liftTimer = null;
			}
			if (bar) {
				if (open) {
					bar.classList.add('pre-header--discover-open');
				} else {
					liftTimer = window.setTimeout(function () {
						liftTimer = null;
						if (!isOpen()) {
							bar.classList.remove('pre-header--discover-open');
						}
					}, CLOSE_FADE);
				}
			}
			if (!open) {
				openedByHover = false;
			}
		}

		function clearHoverTimer() {
			if (hoverTimer) {
				window.clearTimeout(hoverTimer);
				hoverTimer = null;
			}
		}

		trigger.addEventListener('click', function (event) {
			event.preventDefault();
			clearHoverTimer();
			if (isOpen()) {
				if (openedByHover && hoverEnabled()) {
					return;
				}
				setOpen(false);
			} else {
				openedByHover = false;
				setOpen(true);
			}
		});

		wrapper.addEventListener('mouseenter', function () {
			if (!hoverEnabled()) {
				return;
			}
			clearHoverTimer();
			hoverTimer = window.setTimeout(function () {
				if (!isOpen()) {
					openedByHover = true;
					setOpen(true);
				}
			}, OPEN_DELAY);
		});

		wrapper.addEventListener('mouseleave', function () {
			if (!hoverEnabled()) {
				return;
			}
			clearHoverTimer();
			hoverTimer = window.setTimeout(function () {
				setOpen(false);
			}, CLOSE_DELAY);
		});

		wrapper.addEventListener('focusout', function (event) {
			var next = event.relatedTarget;
			if (next && wrapper.contains(next)) {
				return;
			}
			setOpen(false);
		});

		wrapper.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && isOpen()) {
				event.preventDefault();
				event.stopPropagation();
				setOpen(false);
				trigger.focus();
			}
		});

		document.addEventListener('click', function (event) {
			if (isOpen() && !wrapper.contains(event.target)) {
				setOpen(false);
			}
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		});
	}

	function boot() {
		init();
		initDiscover();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
