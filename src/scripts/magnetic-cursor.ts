import gsap from 'gsap';

export function initMagneticAndCursor() {
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cursorDot = document.querySelector<HTMLElement>('.custom-cursor');
  const cursorFollower = document.querySelector<HTMLElement>('.custom-cursor-follower');

  if (!isFinePointer || prefersReduced || !cursorDot || !cursorFollower) {
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorFollower) cursorFollower.style.display = 'none';
    return;
  }

  // Fast GPU positioners
  const dotX = gsap.quickTo(cursorDot, 'x', { duration: 0.08, ease: 'power2.out' });
  const dotY = gsap.quickTo(cursorDot, 'y', { duration: 0.08, ease: 'power2.out' });
  const followerX = gsap.quickTo(cursorFollower, 'x', { duration: 0.35, ease: 'power3.out' });
  const followerY = gsap.quickTo(cursorFollower, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    dotX(x);
    dotY(y);
    followerX(x);
    followerY(y);

    // Update cursor spotlight background variables
    document.body.style.setProperty('--mouse-x', `${x}px`);
    document.body.style.setProperty('--mouse-y', `${y}px`);
  });

  // Cursor hover state triggers
  const interactiveElements = document.querySelectorAll(
    'a, button, .project-card, .synthesis-btn, .interest-tag, .learn-mockup-card'
  );

  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('cursor-hover');
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover');
    });
  });

  // Magnetic Buttons with restrained physics
  const magneticEls = document.querySelectorAll<HTMLElement>('.magnetic, .le-lab-magnetic-btn');

  magneticEls.forEach((el) => {
    const magX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const magY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    const innerIcon = el.querySelector<HTMLElement>('.inner-icon');
    const iconX = innerIcon ? gsap.quickTo(innerIcon, 'x', { duration: 0.3, ease: 'power2.out' }) : null;
    const iconY = innerIcon ? gsap.quickTo(innerIcon, 'y', { duration: 0.3, ease: 'power2.out' }) : null;

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Restrained distance
      const deltaX = (e.clientX - centerX) * 0.35;
      const deltaY = (e.clientY - centerY) * 0.35;

      magX(deltaX);
      magY(deltaY);

      if (iconX && iconY) {
        iconX(deltaX * 0.6);
        iconY(deltaY * 0.6);
      }
    });

    el.addEventListener('pointerleave', () => {
      magX(0);
      magY(0);
      if (iconX && iconY) {
        iconX(0);
        iconY(0);
      }
    });
  });
}
