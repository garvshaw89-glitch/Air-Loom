import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Hero3DProps {
  className?: string;
}

export const Hero3D: React.FC<Hero3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect WebGL support
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 9);

    // Group to hold all 3D assets
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Central Icosahedron Wireframe Core (Transfer Node)
    const coreGeo = new THREE.IcosahedronGeometry(1.9, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Inner glowing solid crystal
    const innerGeo = new THREE.OctahedronGeometry(1.1, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.65,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // 2. Orbiting Holographic Data Cards (Floating documents)
    const cardsGroup = new THREE.Group();
    coreGroup.add(cardsGroup);

    const cardGeo = new THREE.PlaneGeometry(0.75, 1.05);
    const cardPositions = [
      { x: 2.8, y: 0.9, z: 0.6, rotY: -0.6, color: 0x06b6d4 },
      { x: -2.7, y: -0.8, z: 0.9, rotY: 0.5, color: 0x6366f1 },
      { x: 0.8, y: 2.4, z: -0.7, rotY: 0.2, color: 0x10b981 },
      { x: -1.2, y: -2.3, z: -0.5, rotY: -0.3, color: 0x8b5cf6 },
    ];

    cardPositions.forEach((pos) => {
      const cardMat = new THREE.MeshStandardMaterial({
        color: pos.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        metalness: 0.7,
      });
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.position.set(pos.x, pos.y, pos.z);
      card.rotation.y = pos.rotY;

      // Add a subtle border line
      const edges = new THREE.EdgesGeometry(cardGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const border = new THREE.LineSegments(edges, lineMat);
      card.add(border);

      cardsGroup.add(card);
    });

    // 3. Central QR Hologram Ring / Plane
    const qrPlaneGeo = new THREE.PlaneGeometry(1.2, 1.2);
    // Create procedural QR pattern texture with canvas
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#090d16';
      // Draw simulated QR finder patterns
      ctx.fillRect(16, 16, 32, 32);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(24, 24, 16, 16);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(80, 16, 32, 32);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(88, 24, 16, 16);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(16, 80, 32, 32);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(24, 88, 16, 16);

      // Random matrix cells
      ctx.fillStyle = '#090d16';
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * 100) + 14;
        const y = Math.floor(Math.random() * 100) + 14;
        ctx.fillRect(x, y, 6, 6);
      }
    }
    const qrTexture = new THREE.CanvasTexture(canvas);
    const qrMat = new THREE.MeshBasicMaterial({
      map: qrTexture,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const qrMesh = new THREE.Mesh(qrPlaneGeo, qrMat);
    qrMesh.position.set(0, 0, 0);
    coreGroup.add(qrMesh);

    // 4. Floating Particles Network
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 10;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 20);
    cyanLight.position.set(4, 3, 4);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 2.5, 20);
    purpleLight.position.set(-4, -3, 3);
    scene.add(purpleLight);

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Handle container resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Slow subtle rotation
        coreGroup.rotation.y += 0.35 * delta;
        coreGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.15;

        innerMesh.rotation.y -= 0.5 * delta;
        innerMesh.rotation.z += 0.2 * delta;

        qrMesh.rotation.y = Math.sin(elapsed * 0.8) * 0.4;

        cardsGroup.rotation.y -= 0.15 * delta;

        // Interactive mouse tilt
        coreGroup.position.x += (mouseX * 0.5 - coreGroup.position.x) * 0.05;
        coreGroup.position.y += (mouseY * 0.3 - coreGroup.position.y) * 0.05;

        particleSystem.rotation.y += 0.05 * delta;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      id="hero-3d-canvas-container"
      className={`relative w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {!hasWebGL && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 blur-2xl border border-cyan-500/30 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xl">
                AL
              </div>
              <p className="text-xs text-slate-400 font-mono">AirLoom Transfer Conduit</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
