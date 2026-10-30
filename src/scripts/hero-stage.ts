import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHeroStage() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Master entrance timeline
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.hero-eyebrow', {
    y: -10,
    opacity: 0,
    duration: 0.5,
    delay: 0.1,
    clearProps: 'all',
  })
    .from(
      '.hero-title-line',
      {
        y: 15,
        opacity: 0,
        duration: 0.6,
        clearProps: 'all',
      },
      '-=0.2'
    )
    .from(
      '.hero-tagline',
      {
        y: 15,
        opacity: 0,
        duration: 0.6,
        clearProps: 'all',
      },
      '-=0.3'
    )
    .from(
      '.hero-stage',
      {
        y: 30,
        opacity: 0,
        duration: 0.7,
        clearProps: 'all',
      },
      '-=0.3'
    );

  // 2.5D Subtle Pointer Parallax on Hero Stage Planes
  const stage = document.querySelector<HTMLElement>('.hero-stage');
  const workbench = document.querySelector<HTMLElement>('.hero-workbench-card');
  const aside = document.querySelector<HTMLElement>('.hero-stage-aside');

  if (stage && workbench && aside) {
    const moveWorkbenchX = gsap.quickTo(workbench, 'x', { duration: 0.6, ease: 'power2.out' });
    const moveWorkbenchY = gsap.quickTo(workbench, 'y', { duration: 0.6, ease: 'power2.out' });
    const moveAsideX = gsap.quickTo(aside, 'x', { duration: 0.8, ease: 'power2.out' });
    const moveAsideY = gsap.quickTo(aside, 'y', { duration: 0.8, ease: 'power2.out' });

    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const relY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      // Independent visual planes moving at differential ratios
      moveWorkbenchX(relX * 12);
      moveWorkbenchY(relY * 12);
      moveAsideX(relX * -18);
      moveAsideY(relY * -18);
    });

    stage.addEventListener('pointerleave', () => {
      moveWorkbenchX(0);
      moveWorkbenchY(0);
      moveAsideX(0);
      moveAsideY(0);
    });
  }
}
