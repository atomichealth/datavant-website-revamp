// Help Section - Vanilla JS animations and interactions
const animateHelpSection = () => {
  const root = document.querySelector('.help-section');
  if (!root) return;

  // Respect reduced motion preferences
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Get the enable_animations control value (passed from PHP)
  const enableAnimations = root.dataset.enableAnimations === 'true';

  if (!prefersReduced && enableAnimations) {
    // Elements to animate
    const title = root.querySelector('.help-header h2');
    const helpItems = root.querySelectorAll('.help-item');

    // Set initial states for animations
    if (title) {
      title.style.opacity = '0';
      title.style.transform = 'translateY(30px)';
      title.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
    }

    helpItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    });

    // Intersection Observer for scroll-triggered animations
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -15% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          if (element === title) {
            // Animate title
            setTimeout(() => {
              element.style.opacity = '1';
              element.style.transform = 'translateY(0)';
            }, 50);
          } else if (element.classList.contains('help-item')) {
            // Animate help items with stagger
            const items = Array.from(helpItems);
            const index = items.indexOf(element);
            
            setTimeout(() => {
              element.style.opacity = '1';
              element.style.transform = 'translateY(0)';
            }, index * 100 + 200); // 100ms stagger + 200ms delay after title
          }
          
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    // Observe title
    if (title) {
      observer.observe(title);
    }

    // Observe help items
    helpItems.forEach(item => {
      observer.observe(item);
    });
  }

  // Add hover interactions for help buttons using vanilla JS
  const helpButtons = root.querySelectorAll('.help-button');
  
  helpButtons.forEach(button => {
    const arrow = button.querySelector('.button-arrow');
    
    if (!prefersReduced) {
      // Enhanced hover animation with vanilla JS
      button.addEventListener('mouseenter', () => {
        button.style.transition = 'transform 0.3s ease-out';
        button.style.transform = 'translateX(5px)';
        
        if (arrow) {
          arrow.style.transition = 'transform 0.3s ease-out';
          arrow.style.transform = 'translateX(3px)';
        }
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateX(0)';
        
        if (arrow) {
          arrow.style.transform = 'translateX(0)';
        }
      });
    }
  });

  // Add click tracking for analytics (optional)
  const contactLinks = root.querySelectorAll('.contact-link, .help-button');
  
  contactLinks.forEach(link => {
    link.addEventListener('click', () => {
      const linkType = link.classList.contains('contact-link') ? 'email' : 'button';
      const linkText = link.textContent.trim();
      
      // Example analytics tracking
      // You can replace this with your preferred analytics solution
      if (typeof gtag !== 'undefined') {
        gtag('event', 'help_section_interaction', {
          'event_category': 'engagement',
          'event_label': linkText,
          'link_type': linkType
        });
      }
    });
  });
};

// Initialize animations and interactions when DOM is ready
jQuery(document).ready(() => {
  animateHelpSection();
});
