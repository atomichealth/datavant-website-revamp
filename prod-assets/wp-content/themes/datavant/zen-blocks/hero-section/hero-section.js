(function () {
    // Carga Lottie solo una vez (Promise)
    let lottieReady;
    function ensureLottie() {
      if (window.lottie) return Promise.resolve();
      if (!lottieReady) {
        lottieReady = new Promise(function (resolve) {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
          s.onload = () => resolve();
          document.head.appendChild(s);
        });
      }
      return lottieReady;
    }
  
    function initOne(el) {
      if (!el) return;
      const path     = el.getAttribute('data-lottie-path') || '';
      const renderer = el.getAttribute('data-lottie-renderer') || 'svg';
      const autoplay = el.getAttribute('data-lottie-autoplay') === '1';
      const loop     = el.getAttribute('data-lottie-loop') === '1';
      if (!path) return;
      window.lottie.loadAnimation({
        container: el,
        renderer: renderer,
        loop: loop,
        autoplay: autoplay,
        path: path
      });
    }
  
    function boot() {
      const root = document.getElementById('home-hero-section');
      if (!root) return;
      const els = root.querySelectorAll('.hero-lottie');
      if (!els.length) return;
  
      ensureLottie().then(() => {
        els.forEach(initOne);
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
  