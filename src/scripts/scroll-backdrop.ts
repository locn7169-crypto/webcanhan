import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollBackdrop() {
  const backdropContainer = document.querySelector<HTMLElement>('.site-backdrop-system');
  if (!backdropContainer) return;

  const scenes = {
    hero: document.getElementById('bg-scene-hero'),
    philosophy: document.getElementById('bg-scene-philosophy'),
    works: document.getElementById('bg-scene-works'),
    synthesis: document.getElementById('bg-scene-synthesis'),
    contact: document.getElementById('bg-scene-contact'),
  };

  const allSceneEls = Object.values(scenes).filter(Boolean) as HTMLElement[];

  // Function to activate a specific scene and crossfade out the rest
  function activateScene(activeKey: keyof typeof scenes) {
    allSceneEls.forEach((scene) => {
      const isTarget = scene === scenes[activeKey];
      if (isTarget) {
        scene.classList.add('active');
      } else {
        scene.classList.remove('active');
      }
    });
  }

  // Section to Scene Mapping using ScrollTrigger
  const sectionMappings: Array<{ sectionId: string; sceneKey: keyof typeof scenes }> = [
    { sectionId: '#hero', sceneKey: 'hero' },
    { sectionId: '#philosophy', sceneKey: 'philosophy' },
    { sectionId: '#works', sceneKey: 'works' },
    { sectionId: '#synthesis', sceneKey: 'synthesis' },
    { sectionId: '#explorations', sceneKey: 'synthesis' },
    { sectionId: '#principles', sceneKey: 'contact' },
    { sectionId: '#contact', sceneKey: 'contact' },
  ];

  sectionMappings.forEach(({ sectionId, sceneKey }) => {
    const section = document.querySelector<HTMLElement>(sectionId);
    if (!section) return;

    ScrollTrigger.create({
      trigger: section,
      start: 'top 60%',
      end: 'bottom 40%',
      onEnter: () => activateScene(sceneKey),
      onEnterBack: () => activateScene(sceneKey),
    });
  });

  // Parallax zoom / gentle drift on inner image layers
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    document.querySelectorAll<HTMLElement>('.scene-img-layer').forEach((imgLayer) => {
      gsap.to(imgLayer, {
        scale: 1.06,
        yPercent: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
        },
      });
    });
  }

  // Setup generative canvas for Scene Synthesis
  initSynthesisBackdropCanvas();
}

/**
 * Performant 2D Canvas ambient fluid wave simulation for Synthesis scene
 */
function initSynthesisBackdropCanvas() {
  const canvas = document.getElementById('backdrop-synthesis-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    baseAlpha: number;
  }

  const nodesCount = Math.min(Math.floor((width * height) / 25000), 45);
  const nodes: Node[] = [];

  for (let i = 0; i < nodesCount; i++) {
    const baseAlpha = 0.15 + Math.random() * 0.25;
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 1.5 + Math.random() * 2.5,
      alpha: baseAlpha,
      baseAlpha,
    });
  }

  let animationFrameId: number;
  let isSceneActive = false;
  const synthesisScene = document.getElementById('bg-scene-synthesis');

  function render() {
    isSceneActive = synthesisScene?.classList.contains('active') ?? false;

    if (isSceneActive && ctx) {
      ctx.clearRect(0, 0, width, height);

      // Render glowing soft auroral dust
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${n.alpha})`;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Subtle constellation links between close nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(184, 142, 56, ${(1 - dist / 130) * 0.18})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    }

    animationFrameId = requestAnimationFrame(render);
  }

  render();
}
