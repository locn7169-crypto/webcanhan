import { createConstellationRenderer } from './constellation-field';

export function initHeroAmbientConstellation() {
  const heroSection = document.querySelector<HTMLElement>('.section-hero');
  if (!heroSection) return;

  // Reduced motion check
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Create canvas container in Hero
  let container = heroSection.querySelector<HTMLElement>('.hero-threeui-canvas-wrap');
  if (!container) {
    container = document.createElement('div');
    container.className = 'hero-threeui-canvas-wrap';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      opacity: 0.55;
      mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 80%);
    `;
    heroSection.insertBefore(container, heroSection.firstChild);
  }

  let canvas = container.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    container.appendChild(canvas);
  }

  const renderer = createConstellationRenderer(canvas, () => ({
    speed: 0.65,
    nodeCount: window.innerWidth < 768 ? 28 : 55,
    linkDistance: 140,
    accentColor: '#D4AF37', // Pale antique gold
  }));

  if (!renderer) return;

  function handleResize() {
    if (!container || !renderer) return;
    const rect = container.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
  }

  handleResize();
  window.addEventListener('resize', handleResize);

  // Mouse move listener across hero
  heroSection.addEventListener('pointermove', (e) => {
    if (!container || !renderer) return;
    const rect = container.getBoundingClientRect();
    renderer.setPointer(e.clientX - rect.left, e.clientY - rect.top);
  });

  heroSection.addEventListener('pointerleave', () => {
    renderer.setPointer(-1000, -1000);
  });

  let animFrame = 0;
  let isVisible = true;

  function loop() {
    if (isVisible) {
      renderer?.render();
    }
    animFrame = requestAnimationFrame(loop);
  }

  // IntersectionObserver to pause loop when scrolled past Hero
  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
    },
    { threshold: 0.05 }
  );
  observer.observe(heroSection);

  loop();
}
