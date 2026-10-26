import { createOrbitalSphereRenderer, ORBITAL_SPHERE_DEFAULTS } from './orbital-sphere';
import { createLiquidFormRenderer, LIQUID_FORM_DEFAULTS } from './liquid-form';
import { createConstellationRenderer, CONSTELLATION_DEFAULTS } from './constellation-field';

export type ThreeUIMode = 'orbital' | 'liquid' | 'constellation';

export function initThreeUILab() {
  const container = document.getElementById('threeui-viewport');
  if (!container) return;

  const fpsValueEl = document.getElementById('threeui-fps-val');
  const deltaValueEl = document.getElementById('threeui-delta-val');
  const modeBadgeEl = document.getElementById('threeui-active-mode-badge');
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-threeui-mode]');
  const speedButtons = document.querySelectorAll<HTMLButtonElement>('[data-threeui-speed]');

  let currentMode: ThreeUIMode = 'orbital';
  let speedMultiplier = 1.0;
  let isVisible = true;
  let animId = 0;

  // Active renderer instance
  let activeRenderer: {
    resize: (w: number, h: number) => void;
    render: (now?: number) => void;
    setPointer?: (x: number, y: number) => void;
    dispose: () => void;
  } | null = null;

  // Dedicated clean canvas generator to avoid WebGL / 2D context conflicts
  function getFreshCanvas(): HTMLCanvasElement {
    const existing = container?.querySelector('#threeui-canvas');
    if (existing) {
      existing.remove();
    }
    const canvas = document.createElement('canvas');
    canvas.id = 'threeui-canvas';
    canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    const overlay = container?.querySelector('.threeui-viewport-overlay');
    if (overlay && container) {
      container.insertBefore(canvas, overlay);
    } else if (container) {
      container.appendChild(canvas);
    }
    return canvas;
  }

  // FPS Meter calculations
  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  function mountMode(mode: ThreeUIMode) {
    if (activeRenderer) {
      activeRenderer.dispose();
      activeRenderer = null;
    }

    currentMode = mode;
    const canvas = getFreshCanvas();

    if (mode === 'orbital') {
      activeRenderer = createOrbitalSphereRenderer(canvas, () => ({
        ...ORBITAL_SPHERE_DEFAULTS,
        speed: speedMultiplier,
      }));
    } else if (mode === 'liquid') {
      activeRenderer = createLiquidFormRenderer(canvas, () => ({
        ...LIQUID_FORM_DEFAULTS,
        speed: speedMultiplier,
      }));
    } else if (mode === 'constellation') {
      activeRenderer = createConstellationRenderer(canvas, () => ({
        ...CONSTELLATION_DEFAULTS,
        speed: speedMultiplier,
      }));
    }

    // Update active badges & buttons
    tabButtons.forEach((btn) => {
      const btnMode = btn.getAttribute('data-threeui-mode');
      if (btnMode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    if (modeBadgeEl) {
      const modeLabels: Record<ThreeUIMode, string> = {
        orbital: 'Three.js · 12k Particle Orbital Sphere',
        liquid: 'WebGL GLSL · Raymarched Chrome Liquid Form',
        constellation: 'Canvas 2D · Celestial Constellation Network',
      };
      modeBadgeEl.textContent = modeLabels[mode];
    }

    handleResize();
  }

  function handleResize() {
    if (!container || !activeRenderer) return;
    const rect = container.getBoundingClientRect();
    activeRenderer.resize(rect.width, rect.height);
  }

  window.addEventListener('resize', handleResize);

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-threeui-mode') as ThreeUIMode;
      if (mode && mode !== currentMode) {
        mountMode(mode);
      }
    });
  });

  // Speed controls
  speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speedStr = btn.getAttribute('data-threeui-speed');
      if (speedStr) {
        speedMultiplier = parseFloat(speedStr);
        speedButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  // Pointer & Drag interaction across the viewport
  container.addEventListener('pointermove', (e) => {
    if (!activeRenderer || !activeRenderer.setPointer) return;
    const rect = container.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    if (currentMode === 'constellation') {
      activeRenderer.setPointer(e.clientX - rect.left, e.clientY - rect.top);
    } else {
      activeRenderer.setPointer(normX, normY);
    }
  });

  container.addEventListener('pointerleave', () => {
    if (activeRenderer?.setPointer) {
      if (currentMode === 'constellation') {
        activeRenderer.setPointer(-1000, -1000);
      } else {
        activeRenderer.setPointer(0, 0);
      }
    }
  });

  // Touch Drag Support
  let isTouching = false;
  container.addEventListener('touchstart', () => {
    isTouching = true;
  });
  container.addEventListener('touchend', () => {
    isTouching = false;
    if (activeRenderer?.setPointer) {
      activeRenderer.setPointer(0, 0);
    }
  });
  container.addEventListener(
    'touchmove',
    (e) => {
      if (!isTouching || !e.touches[0] || !activeRenderer?.setPointer) return;
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const normX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((touch.clientY - rect.top) / rect.height) * 2 - 1;

      if (currentMode === 'constellation') {
        activeRenderer.setPointer(touch.clientX - rect.left, touch.clientY - rect.top);
      } else {
        activeRenderer.setPointer(normX, normY);
      }
    },
    { passive: true }
  );

  // Render loop with live FPS meter
  function loop(now: number) {
    if (isVisible && activeRenderer) {
      activeRenderer.render(now);

      // FPS calculations
      frameCount++;
      const delta = now - lastTime;
      lastTime = now;

      if (now - lastFpsUpdate >= 350) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        if (fpsValueEl) fpsValueEl.textContent = `${Math.min(60, Math.max(1, fps))} FPS`;
        if (deltaValueEl) deltaValueEl.textContent = `${delta.toFixed(1)} ms`;
        frameCount = 0;
        lastFpsUpdate = now;
      }
    }

    animId = requestAnimationFrame(loop);
  }

  // IntersectionObserver to pause when offscreen
  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
    },
    { threshold: 0.05 }
  );
  observer.observe(container);

  // Initial mount
  mountMode('orbital');
  animId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(animId);
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    activeRenderer?.dispose();
  };
}
