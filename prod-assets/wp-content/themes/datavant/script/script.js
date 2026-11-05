;(function ($) {
  $(document).ready(function () {
    // Open external links in new Window/Tab
    $("a[href^='http']")
      .not("[href*='" + window.location.host + "']")
      .attr('target', '_blank')
    $("a[href$='.pdf']").attr('target', '_blank')

    // Header menu behaviour lives in script/main-nav.js

    // Scroll position tracker
    window.addEventListener('scroll', function () {
      if (window.scrollY > 72) {
        $('body').addClass('scrolled')
      } else {
        $('body').removeClass('scrolled')
      }
    })
    // Make sure header has scrolled state on load
    if (window.scrollY > 72) {
      $('body').addClass('scrolled')
    }

    // Initialize Sticky-Kit
    /*$("#sidebar").stick_in_parent({
		offset_top: 100
	});
	// Sticky-Kit fix
	// From: https://github.com/leafo/sticky-kit/issues/31#issuecomment-51740033
	$('#sidebar').on('sticky_kit:bottom', function(e) {
		$(this).parent().css('position', 'static');
	}).on('sticky_kit:unbottom', function(e) {
		$(this).parent().css('position', 'relative');
	});*/

    // Add "stuck" class when header is stuck to window
    // From: https://stackoverflow.com/a/57991537
    /*const stickyElm = document.querySelector('header.main');
	const observer = new IntersectionObserver(
	  ([e]) => e.target.classList.toggle('stuck', e.intersectionRatio < 1),
	  {threshold: [1]}
	);
	observer.observe(stickyElm);*/

    // Init Animate on Scroll
    $('.aos-fade').attr({
      'data-aos': 'fade',
      'data-aos-once': 'true'
    })
    AOS.init({
      disable: window.matchMedia('(prefers-reduced-motion: reduce)'),
      offset: window.innerHeight * 0.3,
      duration: 400,
      easing: 'ease',
      delay: 40,
      once: false
    })

    // AOS "Responsive"
    if (window.innerWidth < 767) {
      $('[data-aos-offset]').attr(
        'data-aos-offset',
        $('[data-aos-offset]', this).attr('data-aos-offset') / 2
      )
    }

    // Include lottie script
    if (
      $('lottie-player').length &&
      !$(
        "script[src='https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js']"
      ).length
    ) {
      $.getScript(
        'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js'
      )
    }

    // Tilt.js
    $('[data-tilt], .tilt .vc_column-inner').tilt({
      glare: true,
      maxGlare: '.4',
      scale: '1.04',
      maxTilt: '3'
    })

    // Lightboxes
    $('.fancybox, .gallery a, .wp-caption a').fancybox()
    $('.iframe').fancybox({
      type: 'iframe'
    })
    $('.embed-youtube, .embed-youtube a').fancybox({
      helpers: {
        media: true
      },
      youtube: {
        autoplay: 1
      }
    })

    // Share Link copy to clipboard
    $('.tcx-icon.link').click(function (e) {
      e.preventDefault()

      var copyText = document.getElementById('shareURL')
      copyText.select()
      copyText.setSelectionRange(0, 99999) // Mobile compat
      if (window.getSelection) {
        window.getSelection().removeAllRanges()
      } else if (document.selection) {
        document.selection.empty()
      }

      navigator.clipboard.writeText(copyText.value)
      $('.link-share').addClass('copied')
    })

    // Canopy Slideshow audio playback button
    $('.audio-overlay').click(function () {
      $(this)
        .find('audio')
        .each(function () {
          this.player.play()
        })
    })

    // Add styles to comment with active reply
    if (document.getElementById('comment_parent')) {
      var commentnum = $('#comment_parent').val()
      $('#comment-' + commentnum + '>div>.reply>.comment-reply-link').addClass(
        'active-reply'
      )
    }

    // Accordions
    $('.element').hide()
    $('.accordion').click(function () {
      $('.accordion').not(this).removeClass('active')
      $(this).toggleClass('active')

      var element = $(this).next('.element')
      element.slideToggle().addClass('toggled')
      $('.element:not(.toggled)').slideUp()
      element.removeClass('toggled')
    })

    // Smooth scroll to internal anchors
    /* From https://css-tricks.com/snippets/jquery/smooth-scrolling/#comment-1598121 */
    $('a[href*=\\#]:not([href=\\#])')
      .attrDoesntBegin('data-vc')
      .click(function () {
        if (
          location.pathname.replace(/^\//, '') ==
            this.pathname.replace(/^\//, '') &&
          location.hostname == this.hostname
        ) {
          var targetId = decodeURIComponent(this.hash.slice(1))
          var target = $(document.getElementById(targetId))
          target = target.length
            ? target
            : $('[name="' + targetId + '"]')
          
          // Skip smooth scroll for modal links (allow native hash behavior for CSS :target)
          if (target.length && target.hasClass('c-modal')) {
            return true
          }
          
          if (target.length) {
            $('html,body').on(
              'scroll mousedown wheel DOMMouseScroll mousewheel keyup touchmove',
              function () {
                $('html,body').stop()
              }
            )

            $('html,body').animate(
              {
                scrollTop: target.offset().top - 90
              },
              1000
            )
            return false
          }
        }
      })
    // On page load
    if (window.location.hash) {
      var hash = window.location.hash
      // Decode the hash to handle encoded characters
      var targetId = decodeURIComponent(hash.slice(1))
      var $target = $(document.getElementById(targetId))

      // Only scroll if the target element exists and has a valid offset
      if ($target.length && $target.offset()) {
        $('html, body').animate(
          {
            // Keep the same offset as in the click handler
            scrollTop: $target.offset().top - 90
          },
          600
        )
      } else {
        // Helpful log for debugging missing anchors
        console.warn('Anchor target not found for hash on load:', targetId)
      }
    }

    // Init animated page transitions
    $('.animsition').animsition({
      inClass: 'fade-in-up-sm',
      outClass: 'fade-out-up-sm',
      inDuration: 600,
      outDuration: 300,
      linkElement: 'header.main li:not(".deactivate") a',
      // e.g. linkElement: 'a:not([target="_blank"]):not([href^="#"])'
      loading: false,
      timeout: true,
      timeoutCountdown: 5000,
      onLoadEvent: true,
      browser: ['animation-duration', '-webkit-animation-duration'],
      overlay: false,
      overlayClass: 'animsition-overlay-slide',
      overlayParentElement: 'body',
      transition: function (url) {
        window.location.href = url
      }
    })

    $('#menu li.deactivate a').click(function (e) {
      e.preventDefault()
    })

    // Responsive oEmbeds
    /* Lorentsen Utvikling - lorut.no */
    $('.embed-responsive').each(function () {
      var ar = $(this).attr('data-aspectratio')

      if (typeof ar !== typeof undefined && ar !== false) {
        $(this).css('padding-bottom', (1 / ar) * 100 + '%')
      }
    })

    // Wrap select fields (exclude zen-blocks selects)
    $('select')
      .not('.gform_wrapper select, .zenpg-select')
      .wrap('<div class="styled-select" />')
  })

  // Form modifications
  jQuery(document).bind('gform_post_render', function () {
    // Put labels into placeholders (simple fields)
    /*$('.gform_wrapper .ginput_container:not(.ginput_complex)').each(function() {
		var currentPlaceholder = $(this).find('input, textarea').attr('placeholder');
		var label = $(this).parent().children('label');

		if (!currentPlaceholder) {
			$(this).find('input, textarea').attr('placeholder', label.text());
		}
	});

	// Put labels into placeholders (complex fields)
	$('.gform_wrapper .ginput_container.ginput_complex input:not(:file)').each(function() {
		var currentPlaceholder = $(this).attr('placeholder');
		var label = $(this).parent().children('label');

		if (!currentPlaceholder) {
			$(this).attr('placeholder', label.text());
		}
	});*/

    // Add asterisk to Gravity Form placeholders for required fields
    /*$('.gform_wrapper .gfield_contains_required input:not(:file), .gform_wrapper .gfield_contains_required textarea').each(function() {
		var placeholder = $(this).attr('placeholder');
		var addStar = '*';
		if ($(this).attr('placeholder') && ($(this).attr('placeholder').slice(-1) == '*' || $(this).parent().hasClass('address_line_2'))) {
			addStar = '';
		}
		$(this).attr('placeholder', placeholder + addStar);
	});*/

    // Wrap Gravity Form select fields
    $('.gform_wrapper select')
      .not('.gform_wrapper .styled-select select')
      .wrap('<div class="styled-select" />')

    // Add class to label for radio buttons and checkboxes
    $(
      '.gfield_radio, .gfield_checkbox, .gform_wrapper .styled-select, .ginput_product_price, .ginput_total'
    ).each(function () {
      $(this).parent().prev('label').addClass('keep-label')
    })

    // Wrap Gravity Form radio buttons
    $('.gfield_radio label').each(function () {
      if ($(this).children('span').length === 0) {
        $(this).prepend('<span></span>')
      }
    })

    // Wrap Gravity Form checkbox buttons
    $('.gfield_checkbox label').each(function () {
      if ($(this).children('span').length === 0) {
        $(this).prepend('<span></span>')
      }
    })

    // Add class to file upload fields
    if (window.mozIndexedDB !== undefined) {
      $('.gfield input:file').addClass('file-upload-ff')
    } else {
      $('.gfield input:file').addClass('file-upload')
    }
  })
})(jQuery)

// On Load
;(function ($) {
  $(window).on('load', function () {
    // Refresh AOS
    setTimeout(() => {
      AOS.refresh()
    }, 500)
  })
})(jQuery)

// Cookie Settings — reopen HubSpot consent banner.
// Fires on: any link whose href ends in "#cookie-settings", the
// .js-cookie-settings class, or a page loaded/navigated to that hash.
;(function () {
  'use strict'
  var HASH = '#cookie-settings'
  function openCookieSettings() {
    window._hsp = window._hsp || []
    window._hsp.push(['showBanner']) // HubSpot's confirmed reopen API
  }
  // Click on any #cookie-settings link (any page) or a .js-cookie-settings element
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('a[href$="' + HASH + '"], .js-cookie-settings')
    if (!t) return
    e.preventDefault()
    openCookieSettings()
  })
  // Deep link: URL already contains the hash on load
  if (window.location.hash === HASH) openCookieSettings()
  // Hash set later (back/forward, or a link not caught by the click handler)
  window.addEventListener('hashchange', function () {
    if (window.location.hash === HASH) openCookieSettings()
  })
})()

// Pre-header search: only the icon shows until it is clicked, then the field
// slides open and takes focus. Enter submits the form (empty queries are
// ignored); Escape, a click outside the form, or tabbing away closes it.
;(function () {
  'use strict'

  function setup(form) {
    var input = form.querySelector('.search')
    var button = form.querySelector('.searchsubmit')
    if (!input || !button) return

    function isOpen() {
      return form.classList.contains('is-open')
    }
    function open() {
      form.classList.add('is-open')
      button.setAttribute('aria-expanded', 'true')
      input.focus()
    }
    function close() {
      form.classList.remove('is-open')
      button.setAttribute('aria-expanded', 'false')
    }

    button.setAttribute('aria-expanded', 'false')
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Search')

    button.addEventListener('click', function (e) {
      if (!isOpen()) {
        e.preventDefault()
        open()
      } else if (input.value.trim() === '') {
        e.preventDefault()
        // Enter in the empty field reaches here as an implicit submission
        // (the browser "clicks" the button while the field keeps focus):
        // stay open. A real click on the icon closes the empty field.
        if (document.activeElement === input) return
        close()
      }
      // Open with a query: let the click submit the form.
    })

    form.addEventListener('submit', function (e) {
      if (input.value.trim() === '') {
        e.preventDefault()
        input.focus()
      }
    })

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        close()
        button.focus()
      }
    })

    document.addEventListener('click', function (e) {
      if (isOpen() && !form.contains(e.target)) close()
    })

    form.addEventListener('focusout', function () {
      setTimeout(function () {
        if (isOpen() && !form.contains(document.activeElement)) close()
      }, 0)
    })
  }

  function init() {
    document.querySelectorAll('.pre-header .searchform').forEach(setup)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
