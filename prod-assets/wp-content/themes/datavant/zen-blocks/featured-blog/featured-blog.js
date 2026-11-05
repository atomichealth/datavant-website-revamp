/**
 * Featured Blog Component JavaScript
 * Handles interactions for the featured blog post component
 */

const initFeaturedBlog = () => {
  const featuredBlog = document.querySelector('.featured-blog');
  if (!featuredBlog) return;

  // Get the button element
  const button = featuredBlog.querySelector('.featured-blog__button');
  if (!button) return;

  // Add hover effect enhancement
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
  });

  // Check for reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReduced) {
    // Simple fade-in animation on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Set initial state for animation
    featuredBlog.style.opacity = '0';
    featuredBlog.style.transform = 'translateY(20px)';
    featuredBlog.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

    // Start observing
    observer.observe(featuredBlog);
  }
};

// Initialize when DOM is ready
jQuery(document).ready(() => {
  initFeaturedBlog();
});
