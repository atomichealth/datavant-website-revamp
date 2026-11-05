(function(){
    'use strict';
  
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
      });
    }
  
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', () => ensureSwiper(boot), { once:true });
    } else {
      ensureSwiper(boot);
    }
  })();
  