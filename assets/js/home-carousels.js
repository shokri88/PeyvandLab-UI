/* Home-only native scroll-snap carousels. Cards and links are authored in HTML. */
'use strict';
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const number = new Intl.NumberFormat('fa-IR');
  document.querySelectorAll('[data-card-carousel]').forEach(carousel => {
    const track = carousel.querySelector('[data-carousel-track]');
    const controls = carousel.querySelector('[data-carousel-controls]');
    const previous = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const position = carousel.querySelector('[data-carousel-position]');
    const cards = Array.from(track.children);
    if (!cards.length) return;
    const rtl = getComputedStyle(track).direction === 'rtl';
    const metrics = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = cards[0].getBoundingClientRect().width + gap;
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      return { step, gap, max, offset: Math.abs(track.scrollLeft) };
    };
    const update = () => {
      const { step, gap, max, offset } = metrics();
      controls.hidden = max < 2;
      previous.disabled = offset < 2;
      next.disabled = offset >= max - 2;
      const first = Math.min(cards.length, Math.round(offset / step) + 1);
      const visible = Math.max(1, Math.floor((track.clientWidth + gap + 1) / step));
      const last = Math.min(cards.length, first + visible - 1);
      position.textContent = `${number.format(first)}${last > first ? ' تا ' + number.format(last) : ''} از ${number.format(cards.length)}`;
    };
    const move = direction => {
      const { step, offset, max } = metrics();
      const target = Math.max(0, Math.min(max, offset + direction * step));
      track.scrollTo({ left: rtl ? -target : target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move((event.key === 'ArrowLeft') === rtl ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const target = event.key === 'Home' ? 0 : metrics().max;
        track.scrollTo({ left: rtl ? -target : target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    });
    let frame;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame); frame = requestAnimationFrame(update);
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    else window.addEventListener('resize', update);
    update();
  });
})();
