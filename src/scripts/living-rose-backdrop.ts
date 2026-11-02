/**
 * Living Animated Rose Backdrop Engine (Bình Hoa Hồng Cổ Sống Động - High-Performance 60-120fps)
 * 
 * Performance Optimizations:
 * 1. Zero Modulo Snapping: Smooth continuous linear parallax scrolling (eliminates the jump/stutter).
 * 2. Offscreen Sprite Caching: Pre-baked window shadow canvas eliminates per-frame `ctx.filter = 'blur()'`.
 * 3. Pre-baked Bokeh & Petal Sprites: Eliminates per-frame radial/linear gradient allocations and shadowBlur thrashing.
 * 4. Layout-Thrashing Free: `scrollHeight` cached on resize instead of queried on every scroll frame.
 * 5. Retina Fill-Rate Capping: DPR clamped to 1.5 to guarantee silky smooth rendering across all devices.
 */

interface RoseNode {
  x: number;
  y: number;
  r: number;
  tint: 'cream' | 'pink';
  depth: number;
  phase: number;
}

interface BokehParticle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
  warm: boolean;
}

interface FallingPetal {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  flutter: number;
  flutterSpeed: number;
  pink: boolean;
}

export function initLivingRoseBackdrop(): () => void {
  const canvas = document.getElementById('living-rose-canvas') as HTMLCanvasElement | null;
  const cursorGlow = document.getElementById('rose-cursor-glow');

  if (!canvas) return () => {};

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  // Viewport dimensions & DPR capping for high performance
  let W = window.innerWidth;
  let H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    canvas!.style.width = `${W}px`;
    canvas!.style.height = `${H}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();

  // Mouse Parallax & Wind Interaction
  let targetMX = 0;
  let targetMY = 0;
  let curMX = 0;
  let curMY = 0;
  let mouseScreenX = W * 0.5;
  let mouseScreenY = H * 0.5;
  let mouseVelX = 0;
  let lastMouseX = W * 0.5;

  // Cached Max Scroll to eliminate layout thrashing during scroll
  let cachedMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  let scrollProgress = 0;
  let targetScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
  let curScrollY = targetScrollY;

  function updateScroll() {
    targetScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    scrollProgress = Math.min(1, Math.max(0, targetScrollY / cachedMaxScroll));
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // Pre-baked Wall Ambient Gradient
  let wallGrad: CanvasGradient | null = null;
  function updateWallGrad() {
    if (!ctx) return;
    wallGrad = ctx.createLinearGradient(0, 0, W, H);
    wallGrad.addColorStop(0, '#e8d5bc');
    wallGrad.addColorStop(0.42, '#cbb8a3');
    wallGrad.addColorStop(0.45, '#59504a');
    wallGrad.addColorStop(0.58, '#443e3a');
    wallGrad.addColorStop(0.62, '#8b7f74');
    wallGrad.addColorStop(1, '#7c7067');
  }
  updateWallGrad();

  // Pre-baked Window Shadows & Silhouette (eliminates ctx.filter = blur inside rAF)
  let windowShadowCanvas: HTMLCanvasElement | null = null;
  function buildWindowShadowCanvas() {
    const sw = 440;
    const sh = 480;
    const off = document.createElement('canvas');
    off.width = Math.round(sw * dpr);
    off.height = Math.round(sh * dpr);
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.scale(dpr, dpr);

    // Filter applied ONCE during pre-bake
    octx.filter = 'blur(16px)';

    // Window sun panes
    octx.fillStyle = 'rgba(255, 224, 175, 0.36)';
    for (let row = -2; row <= 2; row++) {
      for (let col = 0; col < 2; col++) {
        octx.fillRect(sw * 0.5 + col * 120 - 90, sh * 0.45 + row * 140 - 60, 85, 105);
      }
    }

    // Soft silhouette shadow cast
    octx.fillStyle = 'rgba(38, 30, 25, 0.32)';
    octx.beginPath();
    octx.arc(sw * 0.5 + 40, sh * 0.45 + 110, 160, 0, Math.PI * 2);
    octx.fill();

    windowShadowCanvas = off;
  }
  buildWindowShadowCanvas();

  // Pre-baked Bokeh Sprites (warm & pink)
  const bokehSprites: { warm: HTMLCanvasElement; pink: HTMLCanvasElement } = {
    warm: document.createElement('canvas'),
    pink: document.createElement('canvas'),
  };

  function buildBokehSprite(warm: boolean): HTMLCanvasElement {
    const s = 64;
    const off = document.createElement('canvas');
    off.width = s;
    off.height = s;
    const c = off.getContext('2d');
    if (!c) return off;

    const rgb = warm ? '255, 236, 195' : '250, 212, 218';
    const g = c.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, `rgba(${rgb}, 1)`);
    g.addColorStop(0.55, `rgba(${rgb}, 0.45)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);

    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.5, 0, Math.PI * 2);
    c.fill();
    return off;
  }
  bokehSprites.warm = buildBokehSprite(true);
  bokehSprites.pink = buildBokehSprite(false);

  // Pre-baked Petal Sprites (pink & cream)
  const petalSprites: { pink: HTMLCanvasElement; cream: HTMLCanvasElement } = {
    pink: document.createElement('canvas'),
    cream: document.createElement('canvas'),
  };

  function buildPetalSprite(pink: boolean): HTMLCanvasElement {
    const s = 80;
    const off = document.createElement('canvas');
    off.width = s;
    off.height = s;
    const c = off.getContext('2d');
    if (!c) return off;

    const hs = s * 0.5;
    c.translate(hs, hs);

    // Pre-baked soft shadow
    c.shadowColor = 'rgba(25, 18, 14, 0.2)';
    c.shadowBlur = 6;
    c.shadowOffsetY = 2;

    const rad = s * 0.4;
    c.beginPath();
    c.moveTo(0, -rad * 0.65);
    c.bezierCurveTo(rad * 0.85, -rad * 0.85, rad * 0.95, rad * 0.45, 0, rad * 0.85);
    c.bezierCurveTo(-rad * 0.95, rad * 0.45, -rad * 0.85, -rad * 0.85, 0, -rad * 0.65);

    const grad = c.createLinearGradient(-rad * 0.5, -rad * 0.5, rad * 0.5, rad * 0.5);
    if (pink) {
      grad.addColorStop(0, '#fce8eb');
      grad.addColorStop(1, '#eab8c0');
    } else {
      grad.addColorStop(0, '#fffaf0');
      grad.addColorStop(1, '#edd8be');
    }
    c.fillStyle = grad;
    c.fill();
    return off;
  }
  petalSprites.pink = buildPetalSprite(true);
  petalSprites.cream = buildPetalSprite(false);

  // Resize handler
  const handleResize = () => {
    resizeCanvas();
    cachedMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    updateWallGrad();
    buildWindowShadowCanvas();
    initParticles();
  };
  window.addEventListener('resize', handleResize);

  // Mouse & Touch Interaction
  const handleMouseMove = (e: MouseEvent) => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
    mouseVelX = (e.clientX - lastMouseX) * 0.08;
    lastMouseX = e.clientX;

    targetMX = e.clientX / W - 0.5;
    targetMY = e.clientY / H - 0.5;

    if (cursorGlow) {
      cursorGlow.style.setProperty('--mx', `${(e.clientX / W) * 100}%`);
      cursorGlow.style.setProperty('--my', `${(e.clientY / H) * 100}%`);
    }
  };
  window.addEventListener('mousemove', handleMouseMove, { passive: true });

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseScreenX = touch.clientX;
      mouseScreenY = touch.clientY;
      targetMX = touch.clientX / W - 0.5;
      targetMY = touch.clientY / H - 0.5;
      if (cursorGlow) {
        cursorGlow.style.setProperty('--mx', `${(touch.clientX / W) * 100}%`);
        cursorGlow.style.setProperty('--my', `${(touch.clientY / H) * 100}%`);
      }
    }
  };
  window.addEventListener('touchmove', handleTouchMove, { passive: true });

  // 37 Roses in Classic Pedestal Arrangement
  const roseData: RoseNode[] = [
    // Outer ring & high blooms (freer wind sway)
    { x: -115, y: -270, r: 44, tint: 'cream', depth: 1.35, phase: 0.2 },
    { x: -290, y: -235, r: 38, tint: 'cream', depth: 1.25, phase: 1.1 },
    { x: -220, y: -242, r: 43, tint: 'cream', depth: 1.2, phase: 0.7 },
    { x: -365, y: -175, r: 38, tint: 'pink', depth: 1.3, phase: 2.0 },
    { x: 165, y: -255, r: 40, tint: 'pink', depth: 1.3, phase: 1.5 },
    { x: 270, y: -220, r: 47, tint: 'pink', depth: 1.25, phase: 2.4 },
    { x: 365, y: -145, r: 42, tint: 'cream', depth: 1.35, phase: 3.1 },
    { x: -395, y: -95, r: 40, tint: 'cream', depth: 1.3, phase: 0.4 },
    { x: 390, y: -45, r: 36, tint: 'cream', depth: 1.35, phase: 1.9 },

    // Mid layer
    { x: -165, y: -165, r: 52, tint: 'cream', depth: 1.0, phase: 0.9 },
    { x: -75, y: -180, r: 44, tint: 'cream', depth: 0.95, phase: 1.6 },
    { x: 5, y: -220, r: 58, tint: 'pink', depth: 1.05, phase: 2.2 },
    { x: 85, y: -215, r: 44, tint: 'cream', depth: 0.95, phase: 2.8 },
    { x: 165, y: -195, r: 48, tint: 'cream', depth: 1.0, phase: 0.5 },
    { x: -355, y: -35, r: 47, tint: 'pink', depth: 1.15, phase: 1.3 },
    { x: -250, y: -105, r: 49, tint: 'pink', depth: 1.05, phase: 2.5 },
    { x: -255, y: -15, r: 44, tint: 'pink', depth: 1.1, phase: 3.0 },
    { x: -240, y: 60, r: 43, tint: 'pink', depth: 1.1, phase: 0.8 },
    { x: -370, y: 55, r: 36, tint: 'cream', depth: 1.25, phase: 1.7 },
    { x: 255, y: -115, r: 44, tint: 'cream', depth: 1.1, phase: 2.1 },
    { x: 325, y: -135, r: 44, tint: 'pink', depth: 1.2, phase: 0.3 },
    { x: 285, y: -55, r: 48, tint: 'cream', depth: 1.1, phase: 1.4 },
    { x: 245, y: 55, r: 52, tint: 'pink', depth: 1.1, phase: 2.7 },

    // Core rosette cluster (dense, luxurious)
    { x: -95, y: -95, r: 48, tint: 'cream', depth: 0.85, phase: 1.2 },
    { x: -155, y: -10, r: 54, tint: 'cream', depth: 0.9, phase: 2.3 },
    { x: -75, y: -35, r: 43, tint: 'pink', depth: 0.85, phase: 0.6 },
    { x: -90, y: 35, r: 53, tint: 'cream', depth: 0.9, phase: 1.8 },
    { x: 0, y: -120, r: 59, tint: 'pink', depth: 0.8, phase: 2.9 },
    { x: 70, y: -150, r: 46, tint: 'cream', depth: 0.85, phase: 0.1 },
    { x: 155, y: -135, r: 52, tint: 'cream', depth: 0.9, phase: 1.0 },
    { x: 85, y: -85, r: 57, tint: 'pink', depth: 0.85, phase: 2.0 },
    { x: -5, y: -15, r: 59, tint: 'cream', depth: 0.8, phase: 3.2 },
    { x: 65, y: 15, r: 55, tint: 'cream', depth: 0.85, phase: 0.7 },
    { x: 135, y: 5, r: 36, tint: 'pink', depth: 0.9, phase: 1.5 },
    { x: 145, y: 80, r: 55, tint: 'cream', depth: 0.95, phase: 2.6 },
    { x: 195, y: -40, r: 49, tint: 'pink', depth: 0.95, phase: 0.4 },
    { x: 230, y: -85, r: 50, tint: 'cream', depth: 1.0, phase: 1.9 },
  ];

  // Leaf Clusters
  const leafClusters = [
    [-280, 20],
    [-210, -50],
    [-145, 70],
    [-55, 80],
    [35, 85],
    [125, 70],
    [220, 55],
    [295, -15],
    [195, -110],
    [-95, -145],
    [-230, -145],
    [15, -170],
    [135, -155],
    [335, -80],
    [-185, 35],
    [-320, -120],
    [275, 10],
  ];

  // Offscreen Canvas Sprite Generation for 60fps Performance
  const roseSprites: Record<string, HTMLCanvasElement> = {};
  function createRoseSprite(tint: 'cream' | 'pink'): HTMLCanvasElement {
    const size = 160;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const c = off.getContext('2d');
    if (!c) return off;

    const r = 56;
    c.translate(size / 2, size / 2);

    // Soft drop shadow
    c.shadowColor = 'rgba(28, 20, 16, 0.26)';
    c.shadowBlur = 14;
    c.shadowOffsetY = 6;

    // Outer Petal Ring (11 petals)
    const outerCount = 11;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      c.save();
      c.rotate(angle);
      c.beginPath();
      c.ellipse(r * 0.45, 0, r * 0.54, r * 0.42, 0.2, 0, Math.PI * 2);
      c.fillStyle = tint === 'pink' ? '#f6dede' : '#faf4e8';
      c.fill();
      c.restore();
    }

    c.shadowColor = 'transparent';

    // Mid Petal Ring (14 layered petals)
    const midCount = 14;
    for (let i = 0; i < midCount; i++) {
      const angle = (i / midCount) * Math.PI * 2 + 0.3;
      const dist = r * (0.21 + (i % 3) * 0.08);
      c.save();
      c.rotate(angle);
      c.beginPath();
      c.ellipse(dist, 0, r * 0.36, r * 0.26, 0.4, 0, Math.PI * 2);
      if (tint === 'pink') {
        c.fillStyle = i % 2 === 0 ? '#f3cbd0' : '#fce9eb';
      } else {
        c.fillStyle = i % 2 === 0 ? '#f4e8ce' : '#fdfaf2';
      }
      c.strokeStyle = 'rgba(210, 175, 150, 0.28)';
      c.lineWidth = 1.1;
      c.fill();
      c.stroke();
      c.restore();
    }

    // Garden Rose Rosette Spiral Core
    const grad = c.createRadialGradient(0, 0, 2, 0, 0, r * 0.36);
    if (tint === 'pink') {
      grad.addColorStop(0, '#d89d8a');
      grad.addColorStop(0.55, '#f2c2c8');
      grad.addColorStop(1, '#fce9ec');
    } else {
      grad.addColorStop(0, '#cfa968');
      grad.addColorStop(0.55, '#f2dfc0');
      grad.addColorStop(1, '#fcf7ee');
    }
    c.beginPath();
    c.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();

    for (let j = 0; j < 8; j++) {
      c.save();
      c.rotate((j / 8) * Math.PI * 2);
      c.beginPath();
      c.arc(r * 0.12, 0, r * 0.14, 0, Math.PI * 1.25);
      c.strokeStyle = 'rgba(175, 135, 95, 0.42)';
      c.lineWidth = 1.4;
      c.stroke();
      c.restore();
    }

    return off;
  }

  roseSprites.cream = createRoseSprite('cream');
  roseSprites.pink = createRoseSprite('pink');

  // Bokeh Particles & Falling Rose Petals
  let bokehParticles: BokehParticle[] = [];
  let fallingPetals: FallingPetal[] = [];

  function initParticles() {
    bokehParticles = Array.from({ length: 48 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 12 + 3,
      vx: (Math.random() - 0.45) * 0.28,
      vy: -Math.random() * 0.38 - 0.08,
      alpha: Math.random() * 0.48 + 0.16,
      phase: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.3,
    }));

    fallingPetals = Array.from({ length: 16 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 11 + 9,
      vx: Math.random() * 0.45 + 0.15,
      vy: Math.random() * 0.55 + 0.35,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.016,
      flutter: Math.random() * Math.PI * 2,
      flutterSpeed: Math.random() * 0.022 + 0.014,
      pink: Math.random() > 0.35,
    }));
  }
  initParticles();

  // Animation Loop
  let animId = 0;
  let isRunning = true;

  function render(timeMs: number) {
    if (!isRunning || !ctx) return;

    // Pause when document is hidden to save GPU/CPU
    if (document.hidden) {
      animId = requestAnimationFrame(render);
      return;
    }

    const t = timeMs * 0.001;
    ctx.clearRect(0, 0, W, H);

    // Smooth Interpolation for mouse parallax & scroll
    curMX += (targetMX - curMX) * 0.06;
    curMY += (targetMY - curMY) * 0.06;
    mouseVelX *= 0.92;
    curScrollY += (targetScrollY - curScrollY) * 0.07;

    const isMobile = W < 768;
    const baseScale = isMobile
      ? Math.max(W / 1300, H / 1100) * 0.75
      : Math.max(W / 1600, H / 950);
    // Subtle breathing + scroll depth scale
    const scrollScale = 1 + scrollProgress * 0.08;
    const scale = baseScale * scrollScale;

    // Cinematic camera positioning:
    // On mobile, keep roses centered and scaled down subtly to avoid overwhelming portrait screens
    const centerX = isMobile ? W * 0.5 : W * 0.56 - curMX * 20;

    // Smooth continuous linear parallax WITHOUT modulo jumps
    // On mobile, anchor vase lower so it doesn't clash with central editorial typography
    const maxParallax = isMobile ? H * 0.12 : H * 0.16;
    const scrollParallaxY = -Math.min(maxParallax, curScrollY * (isMobile ? 0.025 : 0.035));
    const centerY = (isMobile ? H * 0.64 : H * 0.55) + scrollParallaxY;

    // ==========================================
    // 1. BACKGROUND LAYER: Wall, Shadows & Drapery
    // ==========================================
    ctx.save();
    const bgShiftX = -curMX * 18;
    const bgShiftY = -curMY * 12;
    ctx.translate(bgShiftX, bgShiftY);

    // Warm ambient wall gradient (editorial cream/gold evening ambience)
    if (wallGrad) {
      ctx.fillStyle = wallGrad;
      ctx.fillRect(-60, -60, W + 120, H + 120);
    }

    // Window sun shadows dancing on the right wall (from pre-baked canvas)
    if (windowShadowCanvas) {
      const shadowSway = Math.sin(t * 1.1) * 12;
      ctx.drawImage(
        windowShadowCanvas,
        W * 0.76 + shadowSway - 220,
        H * 0.42 - 240,
        440,
        480
      );
    }

    // Wavy white sheer voil curtain on the left
    const curtainWidth = W * 0.44;
    const foldCount = 8;
    const foldW = curtainWidth / foldCount;
    for (let i = 0; i < foldCount; i++) {
      const wave = Math.sin(t * 1.35 + i * 0.65) * 10;
      const fx = i * foldW + wave;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 236, 0.32)' : 'rgba(235, 222, 204, 0.18)';
      ctx.fillRect(fx - 10, -40, foldW + 15, H + 80);
    }

    // Silver tassel swinging like a clock pendulum
    ctx.save();
    ctx.translate(centerX + 95 * scale, centerY - 310 * scale);
    ctx.rotate(Math.sin(t * 1.5) * 0.035);
    ctx.fillStyle = '#6e6762';
    ctx.beginPath();
    ctx.arc(0, 0, 26 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-28 * scale, 16 * scale, 56 * scale, 115 * scale);
    ctx.restore();

    ctx.restore();

    // ==========================================
    // 2. MIDGROUND LAYER: Round Table & Silver Vase
    // ==========================================
    ctx.save();
    const midShiftX = -curMX * 32;
    const midShiftY = -curMY * 22;
    ctx.translate(centerX + midShiftX, centerY + midShiftY);
    ctx.scale(scale, scale);

    // Round Table in Sunlit Cream
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 380, 415, 125, 0, 0, Math.PI * 2);
    const tableGrad = ctx.createRadialGradient(-60, 340, 20, 0, 380, 415);
    tableGrad.addColorStop(0, '#fff9ef');
    tableGrad.addColorStop(0.55, '#eedec9');
    tableGrad.addColorStop(1, '#b8a693');
    ctx.fillStyle = tableGrad;
    ctx.fill();

    // Dappled Sunlight on tabletop
    ctx.clip();
    ctx.fillStyle = 'rgba(110, 88, 68, 0.18)';
    for (let s = -3; s <= 3; s++) {
      const sx = s * 95 + Math.sin(t * 1.2 + s) * 14;
      ctx.beginPath();
      ctx.ellipse(sx, 365, 65, 18, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    // Vase shadow cast to the right
    ctx.fillStyle = 'rgba(75, 58, 45, 0.34)';
    ctx.beginPath();
    ctx.ellipse(115, 395, 145, 28, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fluted Silver Pedestal Vase
    const vTop = 85;
    const vBot = 275;
    const vGrad = ctx.createLinearGradient(-95, 0, 95, 0);
    vGrad.addColorStop(0, '#4a4238');
    vGrad.addColorStop(0.18, '#dfd3c0');
    vGrad.addColorStop(0.38, '#6e6354');
    vGrad.addColorStop(0.55, '#fffaf0');
    vGrad.addColorStop(0.75, '#594f43');
    vGrad.addColorStop(0.9, '#d8cab6');
    vGrad.addColorStop(1, '#38312a');

    // Pedestal Base
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.ellipse(0, vBot + 105, 96, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-16, vBot + 18, 32, 85);
    ctx.beginPath();
    ctx.ellipse(0, vBot + 14, 72, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluted Vase Body
    ctx.beginPath();
    ctx.moveTo(-96, vTop);
    ctx.lineTo(96, vTop);
    ctx.lineTo(80, vBot);
    ctx.lineTo(-80, vBot);
    ctx.closePath();
    ctx.fillStyle = vGrad;
    ctx.fill();

    // Specular Rib Shimmer
    const shimmerPos = Math.sin(t * 1.1) * 75 + curMX * 90;
    for (let rx = -80; rx <= 80; rx += 14) {
      const distToShimmer = Math.abs(rx - shimmerPos);
      const highlight = Math.max(0, 1 - distToShimmer / 35);
      ctx.fillStyle = `rgba(255, 250, 235, ${0.22 + highlight * 0.55})`;
      ctx.fillRect(rx - 3, vTop + 6, 5, vBot - vTop - 14);
    }

    // Star Glint at the vase rim
    const glintAlpha = 0.65 + 0.35 * Math.sin(t * 2.6);
    const gx = -64;
    const gy = 148;
    const glintGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 48);
    glintGrad.addColorStop(0, `rgba(255, 253, 245, ${glintAlpha})`);
    glintGrad.addColorStop(0.35, `rgba(255, 235, 190, ${glintAlpha * 0.55})`);
    glintGrad.addColorStop(1, 'rgba(255, 235, 190, 0)');
    ctx.fillStyle = glintGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, 48, 0, Math.PI * 2);
    ctx.fill();

    // Star Spikes
    ctx.strokeStyle = `rgba(255, 252, 240, ${glintAlpha * 0.85})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(gx - 32, gy);
    ctx.lineTo(gx + 32, gy);
    ctx.moveTo(gx, gy - 32);
    ctx.lineTo(gx, gy + 32);
    ctx.stroke();

    // ==========================================
    // 3. LIVING GARDEN ROSES & LEAF CLUSTERS
    // ==========================================
    // Deep Green Foliage
    leafClusters.forEach(([lx, ly], idx) => {
      const swayX = Math.sin(t * 1.5 + idx * 0.7) * 4.5;
      const swayY = Math.cos(t * 1.3 + idx * 0.5) * 2.5;
      for (let k = 0; k < 4; k++) {
        ctx.save();
        ctx.translate(lx + swayX + (k - 1.5) * 18, ly + swayY + (k % 2) * 14);
        ctx.rotate(idx * 0.8 + k * 0.9 + Math.sin(t * 1.4 + idx) * 0.06);
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 13, 0, 0, Math.PI * 2);
        ctx.fillStyle = k % 2 === 0 ? '#1f2d1e' : '#2e3f2b';
        ctx.fill();
        ctx.restore();
      }
    });

    // Swaying Roses with Wind & Interactive Mouse Push
    roseData.forEach((rose) => {
      const windX = Math.sin(t * 1.45 + rose.phase) * 5.5 * rose.depth;
      const windY = Math.cos(t * 1.15 + rose.phase * 1.3) * 3.2 * rose.depth;
      const windRot = Math.sin(t * 1.25 + rose.phase) * 0.045 * rose.depth;

      // Mouse push reaction
      const screenRoseX = centerX + (rose.x + windX) * scale;
      const screenRoseY = centerY + (rose.y + windY) * scale;
      const dx = screenRoseX - mouseScreenX;
      const dy = screenRoseY - mouseScreenY;
      const dist = Math.hypot(dx, dy);
      const pushRadius = 180 * scale;
      let interactX = 0;
      let interactY = 0;
      if (dist < pushRadius && dist > 1) {
        const force = (1 - dist / pushRadius) * 14;
        interactX = (dx / dist) * force + mouseVelX * 2.5;
        interactY = (dy / dist) * force;
      }

      const finalX = rose.x + windX + interactX - curMX * 14 * (rose.depth - 0.8);
      const finalY = rose.y + windY + interactY - curMY * 10 * (rose.depth - 0.8);

      // Slender green stem connecting to vase
      if (rose.depth > 1.1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rose.x * 0.45, Math.min(85, rose.y + 95));
        ctx.quadraticCurveTo(rose.x * 0.75, rose.y + 35, finalX, finalY);
        ctx.strokeStyle = '#2b3b27';
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Flower from cached offscreen sprite
      const sprite = roseSprites[rose.tint] || roseSprites.cream;
      const drawSize = rose.r * 2.55;
      ctx.save();
      ctx.translate(finalX, finalY);
      ctx.rotate(windRot);
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    });

    ctx.restore();

    // ==========================================
    // 4. BOKEH DUST & 3D FALLING PETALS (GPU Sprites)
    // ==========================================
    // Bokeh rendering via pre-baked sprites (zero gradient allocation)
    bokehParticles.forEach((b) => {
      b.x += b.vx - curMX * 0.25;
      b.y += b.vy;
      b.phase += 0.025;

      if (b.y < -30) b.y = H + 30;
      if (b.x < -30) b.x = W + 30;
      if (b.x > W + 30) b.x = -30;

      const a = b.alpha * (0.6 + 0.4 * Math.sin(b.phase));
      const sprite = b.warm ? bokehSprites.warm : bokehSprites.pink;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    });
    ctx.globalAlpha = 1.0;

    // Falling Petals rendering via pre-baked sprites (zero shadowBlur/gradient thrashing)
    fallingPetals.forEach((p) => {
      p.flutter += p.flutterSpeed;
      p.x += p.vx + Math.sin(p.flutter) * 0.65 - curMX * 0.55 + mouseVelX * 0.15;
      p.y += p.vy + Math.cos(p.flutter * 0.7) * 0.15;
      p.angle += p.spin;

      if (p.y > H + 40) {
        p.y = -35;
        p.x = Math.random() * W;
      }
      if (p.x > W + 40) p.x = -35;
      if (p.x < -40) p.x = W + 35;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // 3D Flip Flutter
      const flip3D = 0.35 + 0.65 * Math.abs(Math.cos(p.flutter));
      ctx.scale(1, flip3D);

      const s = p.size;
      const sprite = p.pink ? petalSprites.pink : petalSprites.cream;
      ctx.drawImage(sprite, -s * 0.5, -s * 0.5, s, s);
      ctx.restore();
    });

    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);

  return () => {
    isRunning = false;
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('scroll', updateScroll);
  };
}
