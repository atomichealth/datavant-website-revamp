(function(){
  'use strict';

  // Evitar lógica en backend/editor
  function isAdminLike() {
    const b = document.body;
    if (!b) return false;
    return b.classList.contains('wp-admin') ||
           b.classList.contains('block-editor-page') ||
           b.classList.contains('is-fullscreen-mode');
  }
  if (isAdminLike()) return;

  // Actualiza el href del botón "See all resources" según el tab activo
  function updateSeeAllHref(root) {
    // Hay 2 botones (desktop + mobile). Actualiza ambos.
    const seeAllBtns = root.querySelectorAll('.see-all-resources-btn');
    if (!seeAllBtns || !seeAllBtns.length) return;
    const current = root.querySelector('.related-resouces-tab.w--current');
    const href = current && current.getAttribute('data-archive-href');
    if (href) {
      // accesibilidad opcional
      const label = (current.textContent || '').trim();

      seeAllBtns.forEach((btn) => {
        btn.setAttribute('href', href);
        if (label) btn.setAttribute('aria-label', 'See all ' + label);
      });
    }
  }

  function setupTabs(root){
    const tabsWrap = root.querySelector('.related-resouces-tabs');
    if (!tabsWrap) return;

    const links = tabsWrap.querySelectorAll('.w-tab-link');
    const panes = tabsWrap.querySelectorAll('.w-tab-pane');

    links.forEach((a, idx) => {
      a.addEventListener('click', function(e){
        e.preventDefault();
        links.forEach(l => { l.classList.remove('w--current'); l.setAttribute('aria-selected','false'); });
        a.classList.add('w--current'); a.setAttribute('aria-selected','true');

        panes.forEach(p => p.classList.remove('w--tab-active'));
        const href = a.getAttribute('href');
        const pane = href ? root.querySelector(href) : panes[idx];
        if (pane) pane.classList.add('w--tab-active');

        // <- ACTUALIZA el botón cada vez que cambias de tab
        updateSeeAllHref(root);
      });
    });

    // Inicial por si el server puso un href distinto
    updateSeeAllHref(root);

    // Observa cambios de clase por si otra lib cambia el current
    const tabMenu = root.querySelector('.related-resouces-tab-menu');
    if (tabMenu && 'MutationObserver' in window) {
      const mo = new MutationObserver(() => updateSeeAllHref(root));
      mo.observe(tabMenu, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
  }

  // Ocultar 4.º item salvo entre 768–991px
  function setupFourthVisibility(listSel){
    const list = document.querySelector(listSel);
    if (!list) return;
    const itemClass = listSel.replace('.', '').replace('-list','-item');
    const items = list.getElementsByClassName(itemClass);
    const apply = () => {
      if (!items[3]) return;
      const w = window.innerWidth;
      items[3].style.display = (w < 992 && w > 767) ? 'inline-block' : 'none';
    };
    apply(); window.addEventListener('resize', apply);
  }

  document.addEventListener('DOMContentLoaded', function(){
    document
      .querySelectorAll('.blog-featured-resources.explore-related-resouces')
      .forEach(setupTabs);

    ['.resources-list', '.all-resources-list', '.webinars-list', '.publications-list', '.events-list']
      .forEach(sel => setupFourthVisibility(sel));
  });
})();
