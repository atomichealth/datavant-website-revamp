// HCC Experience Section - Vanilla JS animations and behavior
const animateHccExperienceSection = () => {
  const root = document.querySelector('.hcc-experience-section');
  if (!root) return;

  // Respect reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Get animation settings from data attributes (if controlled by block settings)
  const enableAnimations = root.dataset.enableAnimations !== 'false';
  const animationDelay = parseInt(root.dataset.animationDelay) || 200;

  if (!enableAnimations || prefersReduced) return;

  // Elements to animate
  const sectionHeader = root.querySelector('.section-header');
  const stepCards = root.querySelectorAll('.step-card');

  // Set initial states for entrance animations
  if (sectionHeader) {
    sectionHeader.style.opacity = '0';
    sectionHeader.style.transform = 'translateY(20px)';
  }

  stepCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
  });

  // Create intersection observer for scroll-triggered animations
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        
        if (target.classList.contains('section-header')) {
          // Animate section header
          target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
          target.style.opacity = '1';
          target.style.transform = 'translateY(0)';
        } else if (target.classList.contains('step-card')) {
          // Animate step cards with staggered delay
          const cardIndex = Array.from(stepCards).indexOf(target);
          const delay = cardIndex * animationDelay;
          
          setTimeout(() => {
            target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            target.style.opacity = '1';
            target.style.transform = 'translateY(0)';
          }, delay);
        }
        
        // Stop observing this element
        observer.unobserve(target);
      }
    });
  }, observerOptions);

  // Start observing elements
  if (sectionHeader) {
    observer.observe(sectionHeader);
  }

  stepCards.forEach(card => {
    observer.observe(card);
  });

  // Add hover effects to step cards
  stepCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (!prefersReduced) {
        card.style.transition = 'transform 0.3s ease-out, box-shadow 0.3s ease-out';
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0px 20px 80px 0px rgba(0, 18, 38, 0.15)';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (!prefersReduced) {
        card.style.transition = 'transform 0.3s ease-out, box-shadow 0.3s ease-out';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0px 12px 60px 0px rgba(0, 18, 38, 0.1)';
      }
    });
  });

  // Cleanup function
  return () => {
    observer.disconnect();
    stepCards.forEach(card => {
      card.removeEventListener('mouseenter', () => {});
      card.removeEventListener('mouseleave', () => {});
    });
  };
};

// Initialize on document ready
jQuery(document).ready(() => {
  animateHccExperienceSection();
});

// Reinitialize on dynamic content load (if needed)
document.addEventListener('DOMContentLoaded', () => {
  animateHccExperienceSection();
});
