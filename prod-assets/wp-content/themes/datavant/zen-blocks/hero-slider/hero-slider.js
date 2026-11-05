(() => {
    if (window.__zenbHeroSliderInit) return;
    window.__zenbHeroSliderInit = true;
  
    function ensureSwiper() {
      return new Promise((resolve) => {
        if (window.Swiper) return resolve();
  
        const cssId = 'swiper-bundle-css';
        if (!document.getElementById(cssId)) {
          const link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css';
          document.head.appendChild(link);
        }
  
        const jsId = 'swiper-bundle-js';
        if (document.getElementById(jsId)) {
          document.getElementById(jsId).addEventListener('load', () => resolve());
          return;
        }
        const script = document.createElement('script');
        script.id = jsId;
        script.src = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }
  
    function initSliders() {
      document.querySelectorAll('.newsroom-featured-section .swiper.swiper-news').forEach((swiperEl) => {
        const wrap = swiperEl.closest('.newsroom-featured-section');
        const bar  = wrap?.querySelector('.progress-blue-bar');
  
        const delay = parseInt(swiperEl.dataset.autoplayDelay || '5000', 10);
        const speed = parseInt(swiperEl.dataset.transitionSpeed || '650', 10);
        const loop  = (swiperEl.dataset.loop || 'true') === 'true';
        const show  = (swiperEl.dataset.showProgress || 'true') === 'true';
  
        if (!show && bar) bar.parentElement.style.display = 'none';
        if (bar) {
          bar.style.transition = 'none';  
          bar.style.width = '0%';
        }
  
        const swiper = new Swiper(swiperEl, {
          loop,
          slidesPerView: 1,
          speed,
          autoplay: { delay, disableOnInteraction: false }, 
          allowTouchMove: true,
          on: {
            init() {
              if (bar) bar.style.width = '0%';
            },
            autoplayTimeLeft(s, time, progress) {
              if (!bar || !show) return;
              const p = Math.min(1, Math.max(0, (delay - time) / delay));
              bar.style.width = (p * 100) + '%';
            },
            slideChangeTransitionStart() {
              if (bar && show) bar.style.width = '0%';
            }
          }
        });
      });
    }
  
    const run = () => ensureSwiper().then(initSliders);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  })();
  