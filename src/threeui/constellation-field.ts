// ThreeUI Constellation Field — Celestial Node & Network Engine
// Created by Meng To / ThreeUI, ported and tuned for Loc's portfolio

export interface ConstellationOptions {
  speed: number;
  nodeCount: number;
  linkDistance: number;
  accentColor: string;
}

export const CONSTELLATION_DEFAULTS: ConstellationOptions = {
  speed: 1,
  nodeCount: 85,
  linkDistance: 160,
  accentColor: '#E6C879',
};

interface NodeItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function createConstellationRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => ConstellationOptions = () => CONSTELLATION_DEFAULTS
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let width = 0;
  let height = 0;
  let nodes: NodeItem[] = [];
  let pointer = { x: -1000, y: -1000 };

  function initNodes(count: number) {
    nodes = [];
    const max = Math.max(15, count);
    for (let i = 0; i < max; i++) {
      nodes.push({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.2 + 1.6,
      });
    }
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  return {
    resize(w: number, h: number) {
      width = w;
      height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      const opts = getOptions();
      const targetCount = width < 768 ? Math.round(opts.nodeCount * 0.5) : opts.nodeCount;
      if (nodes.length === 0 || Math.abs(nodes.length - targetCount) > 20) {
        initNodes(targetCount);
      }
    },

    setPointer(px: number, py: number) {
      pointer.x = px;
      pointer.y = py;
    },

    render() {
      if (!ctx || width <= 0 || height <= 0) return;
      const options = getOptions();
      const linkDist = options.linkDistance;

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';

      // Draw Lines
      ctx.strokeStyle = options.accentColor;
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = dist(nodes[i], nodes[j]);
          if (d < linkDist) {
            ctx.globalAlpha = (0.2 + (1 - d / linkDist) * 0.55) * 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes & Physics
      const now = Date.now();
      nodes.forEach((node) => {
        node.x += node.vx * options.speed;
        node.y += node.vy * options.speed;

        // Bounce off edges
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Pointer gravity
        const pd = dist(node, pointer);
        if (pd < 200 && pd > 0) {
          node.x -= (node.x - pointer.x) * 0.006 * options.speed;
          node.y -= (node.y - pointer.y) * 0.006 * options.speed;
        }

        // Draw Gold Node with soft radial aura
        const pulse = 0.78 + Math.sin(now * 0.0012 + node.x) * 0.22;
        ctx.fillStyle = options.accentColor;

        // Outer halo
        ctx.globalAlpha = pulse * 0.25;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core
        ctx.globalAlpha = pulse * 0.9;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    },

    dispose() {
      nodes = [];
    },
  };
}
