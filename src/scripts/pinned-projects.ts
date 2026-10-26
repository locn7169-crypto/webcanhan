import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPinnedProjects() {
  const worksSection = document.querySelector<HTMLElement>('#works');
  const cards = document.querySelectorAll<HTMLElement>('.project-card');

  if (!worksSection || !cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Fluid staggered vertical reveal on scroll (Zero Pinning, Zero Getting Stuck)
  gsap.fromTo(
    cards,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.85,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: worksSection,
        start: 'top 75%',
      },
    }
  );
}
