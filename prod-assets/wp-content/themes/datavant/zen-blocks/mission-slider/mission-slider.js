(function(){
    'use strict';
  
    // Coloca el botón X junto al richtext abierto
    function placeCloseBtn(content, closeBtn, textEl){
      const pr = content.getBoundingClientRect();
      const tr = textEl.getBoundingClientRect();
      closeBtn.style.left = (tr.left - pr.left - 6) + 'px';
      closeBtn.style.top  = (tr.top  - pr.top  - 6) + 'px';
    }
  
    // Espera a que Swiper esté disponible (por si carga asíncrono)
    function ensureSwiper(cb){
      if (window.Swiper) return cb();
      const iv = setInterval(() => {
        if (window.Swiper){ clearInterval(iv); cb(); }
      }, 30);
    }
  
    function boot(){
      document.querySelectorAll('.ms-wrap').forEach((wrap) => {
        // Leer opciones del dataset (puestas por el PHP)
        const autoplay   = wrap.dataset.autoplay === '1';
        const delay      = Math.max(800, parseInt(wrap.dataset.interval || '4000', 10));
        const loop       = wrap.dataset.infinite === '1';
        const showArrows = wrap.dataset.showArrows !== '0';
        const showDots   = wrap.dataset.showDots   !== '0';
  
        // Elementos propios del bloque (muy importante: pasar ELEMENTOS, no selectores globales)
        const container  = wrap.querySelector('.ms-swiper');
        const nextEl     = wrap.querySelector('.ms-next');
        const prevEl     = wrap.querySelector('.ms-prev');
        const dotsEl     = wrap.querySelector('.ms-dots');
  
        // Inicializar Swiper
        const swiper = new Swiper(container, {
          loop,
          speed: 500,
          slidesPerView: 1,
          autoHeight: true,
          navigation: showArrows ? { nextEl, prevEl } : undefined,
          pagination: showDots ? {
            el: dotsEl,
            clickable: true,
            bulletClass: 'ms-dot',
            bulletActiveClass: 'is-active',
            renderBullet: (i, cls) => `<button class="${cls}" aria-label="Go to slide ${i+1}"></button>`
          } : undefined,
          autoplay: autoplay ? { delay, disableOnInteraction:false, pauseOnMouseEnter:true } : false,
        });
  
        // Cerrar texto abierto al cambiar de slide
        function closeOpenStates(){
          wrap.querySelectorAll('.impact-slide-txt.is-open').forEach(n => n.classList.remove('is-open'));
          wrap.querySelectorAll('.ms-content.is-open').forEach(n => n.classList.remove('is-open'));
        }
        swiper.on('slideChange', () => closeOpenStates());
  
        // Delegación: abrir/cerrar “Read more”
        wrap.addEventListener('click', (e) => {
          const open = e.target.closest('[data-ms-open]');
          if (open){
            e.preventDefault();
            const content  = open.closest('.ms-content');
            const textEl   = content?.querySelector('.impact-slide-txt');
            const closeBtn = content?.querySelector('.ms-inset-close');
            if (!content || !textEl || !closeBtn) return;
  
            closeOpenStates();
            content.classList.add('is-open');
            textEl.classList.add('is-open');
            placeCloseBtn(content, closeBtn, textEl);
  
            swiper.updateAutoHeight(300);
            if (swiper.autoplay) swiper.autoplay.stop();
          }
  
          const close = e.target.closest('[data-ms-close]');
          if (close){
            e.preventDefault();
            const content = close.closest('.ms-content');
            const textEl  = content?.querySelector('.impact-slide-txt');
            if (content && textEl){
              textEl.classList.remove('is-open');
              content.classList.remove('is-open');
              swiper.updateAutoHeight(300);
              if (swiper.params.autoplay) swiper.autoplay.start();
            }
          }
        });
  
        // Reposicionar el botón X si cambia el tamaño
        const ro = new ResizeObserver(() => {
          const content  = wrap.querySelector('.ms-content.is-open');
          const textEl   = content?.querySelector('.impact-slide-txt.is-open');
          const closeBtn = content?.querySelector('.ms-inset-close');
          if (content && textEl && closeBtn) placeCloseBtn(content, closeBtn, textEl);
        });
        ro.observe(wrap);
      });
    }
  
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', () => ensureSwiper(boot), { once:true });
    } else {
      ensureSwiper(boot);
    }
  })();
  