import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function initSmoothScroll(): Lenis | null {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    console.info('[SmoothScroll] Reduced motion preferred; native scrolling active.');
    return null;
  }

  // On mobile / touch screens (< 768px or coarse pointer), disable Lenis so native 120Hz compositor scrolling runs with zero lag!
  const isTouchDevice = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) {
    console.info('[SmoothScroll] Mobile touch device detected; delegating to native 120Hz compositor scrolling.');
    return null;
  }

  lenisInstance = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  // Synchronize Lenis and GSAP ScrollTrigger on a single unified loop
  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time: number) => {
    lenisInstance?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // Handle smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        lenisInstance?.scrollTo(target as HTMLElement, { offset: -60, duration: 1.2 });
      }
    });
  });

  return lenisInstance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}
