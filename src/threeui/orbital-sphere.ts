import * as THREE from 'three';

export interface OrbitalSphereOptions {
  speed: number;
  particleSize: number;
  particleOpacity: number;
  orbitOpacity: number;
  scale: number;
  haloOpacity: number;
  colorScheme: 'gold' | 'violet' | 'emerald';
}

export const ORBITAL_SPHERE_DEFAULTS: OrbitalSphereOptions = {
  speed: 1,
  particleSize: 0.018,
  particleOpacity: 0.85,
  orbitOpacity: 0.35,
  scale: 1,
  haloOpacity: 0.25,
  colorScheme: 'gold',
};

export function createOrbitalSphereRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => OrbitalSphereOptions = () => ORBITAL_SPHERE_DEFAULTS
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 5.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const networkGroup = new THREE.Group();
  scene.add(networkGroup);

  const radius = 2.0;
  const particleCount = 12000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Palettes tailored to Lộc's aesthetic: Gold & Titanium
  const colorGoldBright = new THREE.Color(0xf6d365);
  const colorGoldDim = new THREE.Color(0xb38728);

  let validIndex = 0;
  for (let index = 0; index < particleCount; index += 1) {
    const phi = Math.acos(-1 + (2 * index) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    const noise = Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) + Math.cos(x * 6) * 0.4;
    if (noise <= -0.1) continue;

    const distortion = 1 + noise * 0.1;
    positions[validIndex * 3] = x * distortion;
    positions[validIndex * 3 + 1] = y * distortion;
    positions[validIndex * 3 + 2] = z * distortion;

    const mixedColor = colorGoldDim.clone().lerp(colorGoldBright, noise > 0.4 ? 1 : 0.25);
    colors[validIndex * 3] = mixedColor.r;
    colors[validIndex * 3 + 1] = mixedColor.g;
    colors[validIndex * 3 + 2] = mixedColor.b;
    validIndex += 1;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions.slice(0, validIndex * 3), 3)
  );
  particleGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors.slice(0, validIndex * 3), 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  networkGroup.add(new THREE.Points(particleGeometry, particleMaterial));

  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0xd4af37,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  });

  const orbitGeometries: THREE.BufferGeometry[] = [];
  const nodeGeometries: THREE.BufferGeometry[] = [];
  const nodeMaterials: THREE.Material[] = [];
  const haloMaterials: THREE.MeshBasicMaterial[] = [];

  let responsiveScale = 1;

  // 6 Orbital rings with orbiting node beacons
  for (let index = 0; index < 6; index += 1) {
    const geometry = new THREE.BufferGeometry();
    const points: number[] = [];
    const orbitRadius = radius * (1.08 + Math.random() * 0.22);

    for (let point = 0; point <= 90; point += 1) {
      const angle = (point / 90) * Math.PI * 2;
      points.push(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * orbitRadius,
        Math.sin(angle * 4) * 0.08
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    orbitGeometries.push(geometry);

    const line = new THREE.Line(geometry, orbitMaterial);
    line.rotation.x = Math.random() * Math.PI * 2;
    line.rotation.y = Math.random() * Math.PI * 2;
    networkGroup.add(line);

    if (index % 2 !== 0) {
      const nodeGeometry = new THREE.SphereGeometry(0.03, 16, 16);
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const angle = Math.random() * Math.PI * 2;
      node.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
      line.add(node);

      const haloGeometry = new THREE.SphereGeometry(0.09, 16, 16);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xf39c12,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      node.add(halo);

      nodeGeometries.push(nodeGeometry, haloGeometry);
      nodeMaterials.push(nodeMaterial, haloMaterial);
      haloMaterials.push(haloMaterial);
    }
  }

  // Pointer tilt physics
  let targetRotX = 0;
  let targetRotY = 0;
  let curRotX = 0;
  let curRotY = 0;

  return {
    resize(width: number, height: number) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      const options = getOptions();
      if (width >= 1024) {
        networkGroup.position.set(0, 0, 0);
        responsiveScale = 1.1;
        camera.position.z = 5.2;
      } else {
        networkGroup.position.set(0, 0, 0);
        responsiveScale = 0.9;
        camera.position.z = 6.0;
      }
      networkGroup.scale.setScalar(responsiveScale * options.scale);
    },

    setPointer(normX: number, normY: number) {
      targetRotY = normX * 0.8;
      targetRotX = -normY * 0.6;
    },

    render() {
      const options = getOptions();
      particleMaterial.size = options.particleSize;
      particleMaterial.opacity = options.particleOpacity;
      orbitMaterial.opacity = options.orbitOpacity;
      haloMaterials.forEach((material) => (material.opacity = options.haloOpacity));

      // Inertial pointer follow
      curRotX += (targetRotX - curRotX) * 0.05;
      curRotY += (targetRotY - curRotY) * 0.05;

      networkGroup.scale.setScalar(responsiveScale * options.scale);
      networkGroup.rotation.y += 0.001 * options.speed;
      networkGroup.rotation.x += 0.0004 * options.speed;

      networkGroup.position.x = curRotY * 0.5;
      networkGroup.position.y = curRotX * 0.4;

      networkGroup.children.forEach((child: THREE.Object3D, index: number) => {
        if (child instanceof THREE.Line) {
          child.rotation.z += 0.0006 * options.speed * (index % 2 === 0 ? 1 : -1);
        }
      });

      renderer.render(scene, camera);
    },

    dispose() {
      particleGeometry.dispose();
      particleMaterial.dispose();
      orbitMaterial.dispose();
      orbitGeometries.forEach((item) => item.dispose());
      nodeGeometries.forEach((item) => item.dispose());
      nodeMaterials.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
