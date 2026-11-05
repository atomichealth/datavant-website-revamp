// hdn-benefits-section.js
// Initializes HDN Benefits sliders using Swiper.js

(function () {
  'use strict';

  // Initialize all sliders on the page
  function initHdnBenefitsSliders() {
    if (typeof Swiper === 'undefined') {
      return;
    }

    var sliders = document.querySelectorAll('.hdn-benefits-slider.swiper');
    if (!sliders.length) return;

    sliders.forEach(function (el) {
      // Avoid double init
      if (el.dataset.swiperInitialized === '1') return;
      el.dataset.swiperInitialized = '1';

      new Swiper(el, {
        loop: true,
        slidesPerView: 1,
        spaceBetween: 24,
        autoplay: {
          delay: 3000,
          disableOnInteraction: false
        },
        pagination: {
          el: el.querySelector('.hdn-benefits-pagination'),
          clickable: true
        },
        navigation: {
          nextEl: el.querySelector('.hdn-benefits-next'),
          prevEl: el.querySelector('.hdn-benefits-prev')
        }
      });
    });
  }

  // Load Swiper from CDN only if needed
  function ensureSwiperAndInit() {
    if (typeof Swiper !== 'undefined') {
      initHdnBenefitsSliders();
      return;
    }

    // Avoid adding the script twice
    var existingScript = document.querySelector('script[data-hdn-swiper]');
    if (existingScript) {
      existingScript.addEventListener('load', initHdnBenefitsSliders);
      return;
    }

    // Inject Swiper CSS
    var existingCss = document.querySelector('link[data-hdn-swiper-css]');
    if (!existingCss) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/swiper@9/swiper-bundle.min.css';
      css.setAttribute('data-hdn-swiper-css', '1');
      document.head.appendChild(css);
    }

    // Inject Swiper JS
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/swiper@9/swiper-bundle.min.js';
    script.defer = true;
    script.setAttribute('data-hdn-swiper', '1');
    script.addEventListener('load', initHdnBenefitsSliders);
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureSwiperAndInit);
  } else {
    ensureSwiperAndInit();
  }
})();
