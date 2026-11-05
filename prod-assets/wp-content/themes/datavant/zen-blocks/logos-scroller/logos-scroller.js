(function(){
  "use strict";

  function pxVar(el, name, fallback){
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    if(!v) return fallback;
    if(v.endsWith('px')) return parseFloat(v);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function numAttr(el, attr, fallback){
    const v = el.getAttribute(attr);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function setupInstance(root){
    const viewport = root.querySelector('.logos-scroller__viewport');
    const track    = root.querySelector('.logos-scroller__track');
    if(!viewport || !track) return;

    const speed = numAttr(root, 'data-speed', null) ?? pxVar(root, '--ls-speed', 60);

    const baseItems = Array.from(track.children);
    if (baseItems.length === 0) return;

    let repeatWidth = 0;

    function cloneBaseItems(){
      baseItems.forEach(node => {
        const clone = node.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.clone = '1';
        clone.querySelectorAll('img').forEach(img => {
          img.setAttribute('draggable', 'false');
          img.style.pointerEvents = 'none';
          img.style.userSelect = 'none';
        });
        track.appendChild(clone);
      });
    }

    function populate(){
      track.querySelectorAll('[data-clone="1"]').forEach(n => n.remove());

      // One clone to measure the repeat distance
      cloneBaseItems();
      const firstClone = track.children[baseItems.length];
      repeatWidth = firstClone.getBoundingClientRect().left
                  - track.children[0].getBoundingClientRect().left;

      // Add just enough clones to cover viewport + one repeat of buffer
      const vw = viewport.getBoundingClientRect().width;
      while (track.scrollWidth < vw + repeatWidth) {
        cloneBaseItems();
      }
    }
    populate();

    let raf = null;
    let last = null;
    let offset = 0;

    const step = (now) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;

      offset -= speed * dt;
      if (offset <= -repeatWidth) {
        offset += repeatWidth;
      }
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          if(raf == null) { last = null; raf = requestAnimationFrame(step); }
        } else {
          if(raf != null) { cancelAnimationFrame(raf); raf = null; }
        }
      });
    }, { threshold: 0.1 });
    io.observe(viewport);

    const ro = new ResizeObserver(()=>{
      populate();
      offset = 0;
    });
    ro.observe(viewport);
  }

  function init(){
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.logos-scroller').forEach(setupInstance);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
