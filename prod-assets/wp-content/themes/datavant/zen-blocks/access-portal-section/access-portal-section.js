// Access Portal Section - Vanilla JS animations and interactions
const animateComponent = () => {
  const root = document.querySelector('.access-portal-section');
  if (!root) return;

  // Respect reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Elements to animate in
  const elements = [
    { el: root.querySelector('.text-content h2'), delay: 0.1 },
    { el: root.querySelector('.description'), delay: 0.2 },
    { el: root.querySelector('.action-button'), delay: 0.3 },
    { el: root.querySelector('.logo-section'), delay: 0.4 }
  ].filter(item => item.el); // Remove null elements

  if (!prefersReduced && elements.length > 0) {
    // Set initial states for entrance animations
    elements.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    });

    // Create entrance animations on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          elements.forEach(({ el, delay }) => {
            setTimeout(() => {
              el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            }, delay * 1000);
          });
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      once: true
    });

    observer.observe(root);
  }

  // Button hover effects
  const button = root.querySelector('.btn');
  if (button) {
    button.addEventListener('mouseenter', () => {
      if (!prefersReduced) {
        button.style.transition = 'all 0.3s ease';
        button.style.transform = 'translateY(-2px)';
        button.style.backgroundColor = '#000000';
        button.style.color = '#ffffff';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!prefersReduced) {
        button.style.transform = 'translateY(0)';
        button.style.backgroundColor = '';
        button.style.color = '';
        button.style.boxShadow = 'none';
      }
    });

    // Button click effect
    button.addEventListener('click', () => {
      if (!prefersReduced) {
        button.style.transform = 'translateY(0) scale(0.98)';
        setTimeout(() => {
          button.style.transform = 'translateY(-2px) scale(1)';
        }, 150);
      }
    });
  }

  // Logo hover effect
  const logo = root.querySelector('.portal-logo');
  if (logo) {
    logo.addEventListener('mouseenter', () => {
      if (!prefersReduced) {
        logo.style.transition = 'transform 0.3s ease';
        logo.style.transform = 'scale(1.05)';
      }
    });

    logo.addEventListener('mouseleave', () => {
      if (!prefersReduced) {
        logo.style.transform = 'scale(1)';
      }
    });
  }
};

// Initialize on document ready
jQuery(document).ready(() => {
  animateComponent();
});
