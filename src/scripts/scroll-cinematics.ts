import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './lenis-scroll';

gsap.registerPlugin(ScrollTrigger);

export function initScrollCinematics() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    console.info('[ScrollCinematics] prefers-reduced-motion active; skipping scroll scrubbing.');
    return;
  }

  // 1. Global Viewport Scroll Progress Bar
  setupGlobalProgressBar();

  // 2. Hero Gentle Drifting Petals Motion
  setupHeroDriftingPetals();

  // 3. Featured Works Card Enhancements (Dragon Scrub & Tilt)
  setupWorksScrollScrub();

  // 5. Synthesis Matrix 3D Reveal
  setupSynthesisScroll();

  // 6. Explorations Curtain Reveal & Internal Image Parallax
  setupExplorationsParallax();

  // 7. Carrd Master Showcase Finale Reveal & Beacon
  setupConnectFinale();

  // 8. Floating Discrete Scroll-To-Top Pill
  setupScrollToTop();

  console.info('[ScrollCinematics] Continuous scroll-driven storytelling activated from start to finish.');
}

/**
 * 1. Global Viewport Scroll Progress Bar
 */
function setupGlobalProgressBar() {
  const progressBar = document.querySelector<HTMLElement>('.global-scroll-progress-bar');
  if (!progressBar) return;

  gsap.to(progressBar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.15,
    },
  });
}

/**
 * 2. Hero Gentle Drifting Petals Motion
 * Subtle drifting blossom petals when scrolling past hero
 */
function setupHeroDriftingPetals() {
  const heroSection = document.querySelector<HTMLElement>('.section-hero');
  const petals = document.querySelectorAll<HTMLElement>('.hero-drifting-petal');
  if (!heroSection || !petals.length) return;

  // Gentle entrance on initial load
  gsap.fromTo(
    petals,
    { x: 25, y: -10, opacity: 0 },
    { x: 0, y: 0, opacity: 0.85, duration: 1.6, stagger: 0.12, ease: 'power2.out' }
  );

  // Scroll scrub drift from right to left
  const scrubTl = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.7,
    },
  });

  petals.forEach((petal, i) => {
    const driftX = -60 - i * 20;
    const driftY = 40 + i * 15;
    const rot = (i % 2 === 0 ? 1 : -1) * (25 + i * 8);

    scrubTl.to(
      petal,
      {
        x: driftX,
        y: driftY,
        rotation: rot,
        opacity: 0.45,
        ease: 'none',
      },
      0
    );
  });
}

/**
 * 3. Featured Works Card Enhancements (Dragon Scrub & Parallax)
 */
function setupWorksScrollScrub() {
  const worksSection = document.querySelector<HTMLElement>('#works');
  if (!worksSection) return;

  // On mobile (< 768px), skip objectPosition and scrub parallax on images to avoid repaint stutter
  if (window.innerWidth < 768) return;

  // Scrub Dragon Image and Glow inside Card 02 during horizontal track progression
  const dragonImg = document.querySelector<HTMLElement>('.loc-dragon-hero-img');
  const dragonGlow = document.querySelector<HTMLElement>('.loc-dragon-ambient-glow');

  if (dragonImg && dragonGlow) {
    gsap.fromTo(
      dragonImg,
      { objectPosition: 'center 20%', scale: 1.05 },
      {
        objectPosition: 'center 45%',
        scale: 1.15,
        ease: 'none',
        scrollTrigger: {
          trigger: worksSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );

    gsap.fromTo(
      dragonGlow,
      { opacity: 0.35, scale: 0.9 },
      {
        opacity: 0.85,
        scale: 1.25,
        ease: 'none',
        scrollTrigger: {
          trigger: worksSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }
}

/**
 * 5. Synthesis Matrix 3D Reveal
 */
function setupSynthesisScroll() {
  const synthesisSection = document.querySelector<HTMLElement>('#synthesis');
  const container = synthesisSection?.querySelector<HTMLElement>('.synthesis-container');
  const buttons = synthesisSection?.querySelectorAll<HTMLElement>('.synthesis-btn');

  if (!synthesisSection || !container) return;

  gsap.fromTo(
    container,
    { y: 55, opacity: 0, rotateX: 6 },
    {
      y: 0,
      opacity: 1,
      rotateX: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
      },
    }
  );

  if (buttons?.length) {
    gsap.fromTo(
      buttons,
      { x: -25, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
        },
      }
    );
  }
}

/**
 * 6. Explorations Curtain Reveal & Internal Image Parallax
 */
function setupExplorationsParallax() {
  const explorationsSection = document.querySelector<HTMLElement>('#explorations');
  if (!explorationsSection) return;

  const cards = explorationsSection.querySelectorAll<HTMLElement>('.exploration-card');
  gsap.fromTo(
    cards,
    { y: 45, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.75,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: explorationsSection,
        start: 'top 75%',
      },
    }
  );

  // Parallax internal image scroll on photography card (desktop only to prevent mobile image jitter)
  if (window.innerWidth < 768) return;

  const realImg = explorationsSection.querySelector<HTMLElement>('.exploration-real-img');
  if (realImg) {
    gsap.fromTo(
      realImg,
      { yPercent: -12, scale: 1.08 },
      {
        yPercent: 12,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: realImg.parentElement || realImg,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }

  // Chinese calligraphy box shimmer on scroll
  const chineseBox = explorationsSection.querySelector<HTMLElement>('.exploration-chinese-box');
  if (chineseBox) {
    gsap.fromTo(
      chineseBox,
      { scale: 0.94, opacity: 0.7 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: chineseBox,
          start: 'top 85%',
        },
      }
    );
  }
}

/**
 * 7. Carrd Master Showcase Finale Reveal & Beacon
 */
function setupConnectFinale() {
  const contactSection = document.querySelector<HTMLElement>('#contact');
  const carrdCard = contactSection?.querySelector<HTMLElement>('.carrd-profile-card');
  const buttons = contactSection?.querySelectorAll<HTMLElement>('.carrd-btn-row');
  const dock = contactSection?.querySelector<HTMLElement>('.carrd-dock');
  const avatarRing = contactSection?.querySelector<HTMLElement>('.carrd-avatar-ring');

  if (!contactSection || !carrdCard) return;

  gsap.fromTo(
    carrdCard,
    { y: 65, opacity: 0, scale: 0.96 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: carrdCard,
        start: 'top 85%',
      },
    }
  );

  if (buttons?.length) {
    gsap.fromTo(
      buttons,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.carrd-buttons-list',
          start: 'top 90%',
        },
      }
    );
  }

  if (dock) {
    gsap.fromTo(
      dock,
      { y: 25, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(1.4)',
        scrollTrigger: {
          trigger: dock,
          start: 'top 95%',
        },
      }
    );
  }

  // Golden beacon pulse around the avatar ring (GPU composited opacity & transform to eliminate infinite paint)
  if (avatarRing) {
    let glowEl = avatarRing.querySelector<HTMLElement>('.carrd-avatar-glow');
    if (!glowEl) {
      glowEl = document.createElement('div');
      glowEl.className = 'carrd-avatar-glow';
      avatarRing.appendChild(glowEl);
    }
    gsap.fromTo(
      glowEl,
      { opacity: 0.25, scale: 0.98 },
      {
        opacity: 0.85,
        scale: 1.04,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: 'sine.inOut',
      }
    );
  }
}

/**
 * 8. Floating Discrete Scroll-To-Top Pill
 */
function setupScrollToTop() {
  const topBtn = document.querySelector<HTMLElement>('.scroll-top-btn');
  if (!topBtn) return;

  // Show/hide based on scroll position (passive listener for 60fps scrolling)
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 450) {
        topBtn.classList.add('visible');
      } else {
        topBtn.classList.remove('visible');
      }
    },
    { passive: true }
  );

  topBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.4 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}
