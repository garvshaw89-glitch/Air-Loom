import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  Terminal,
  Zap,
  Shield,
  Layers,
  HardDrive,
  QrCode,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Code2,
  Share2,
} from 'lucide-react';

interface ReadmeViewProps {
  onNavigateToTransfer: () => void;
}

export const ReadmeView: React.FC<ReadmeViewProps> = ({ onNavigateToTransfer }) => {
  const [activeTab, setActiveTab] = useState<'3d-overview' | 'readme-doc' | 'architecture'>('3d-overview');
  const [copied, setCopied] = useState<boolean>(false);
  const [rotSpeed, setRotSpeed] = useState<number>(1);
  const [wireframeOnly, setWireframeOnly] = useState<boolean>(false);
  const [accentHue, setAccentHue] = useState<'cyan' | 'magenta' | 'emerald'>('magenta');

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Initialize Three.js interactive 3D README scene
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 6.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // 3D Master Group
    const group = new THREE.Group();
    scene.add(group);
    cubeGroupRef.current = group;

    // Outer QR Box (3D Isometric Cube)
    const boxGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const boxMat = new THREE.MeshStandardMaterial({
      color: accentHue === 'magenta' ? 0xc026d3 : accentHue === 'cyan' ? 0x06b6d4 : 0x10b981,
      wireframe: wireframeOnly,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: wireframeOnly ? 0.9 : 0.45,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    group.add(boxMesh);

    // Inner Glowing Core (Transfer Node)
    const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Orbital Rings
    const ringGeo = new THREE.TorusGeometry(2.2, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.rotation.y = Math.PI / 3;
    group.add(ring2);

    // Particles Cloud
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      color: accentHue === 'magenta' ? 0xf472b6 : 0x67e8f9,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff007f, 3, 50);
    pointLight.position.set(4, 4, 4);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00f0ff, 3, 50);
    pointLight2.position.set(-4, -4, -4);
    scene.add(pointLight2);

    // Interactive Drag / Orbit
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;

      group.rotation.y += deltaX * 0.008;
      group.rotation.x += deltaY * 0.008;

      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      group.rotation.y += delta * 0.45 * rotSpeed;
      group.rotation.x += delta * 0.25 * rotSpeed;
      coreMesh.rotation.z -= delta * 0.6 * rotSpeed;
      ring1.rotation.z += delta * 0.3 * rotSpeed;
      ring2.rotation.z -= delta * 0.3 * rotSpeed;

      renderer.render(scene, camera);
      animFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [rotSpeed, wireframeOnly, accentHue]);

  const rawReadmeMarkdown = `# AirLoom
### High-Throughput Zero-Cloud File Transfer Conduit

![AirLoom 3D Animated Banner](public/assets/airloom-3d-banner.svg)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Chunked Streaming](https://img.shields.io/badge/Streaming-10_GB_Tested-06b6d4?style=for-the-badge&logo=fastapi&logoColor=white)](#)

## ⚡ Features
- **10 GB Throughput Tested**: Bypasses Node.js heap buffer limits via direct disk append streams.
- **Client-Side Slicing**: Slices files into 5 MB chunks via browser Blob.slice() with SHA-256 rolling integrity verification.
- **Resume & Seek Streaming (HTTP 206)**: Range headers enable mobile users to seek large video files and resume downloads seamlessly.
- **High-Contrast QR Code Generation**: Instant camera recognition with custom quiet zone ratios and instant print poster generation.
- **Scrypt Password Vaults**: Hardware-hardened KDF protection with constant-time verification.
- **Self-Destructing Ephemeral Vaults**: Configure shares to expire after N downloads or after a custom TTL.

## 🔮 3D Architecture Pipeline
![AirLoom 3D Architecture Pipeline](public/assets/airloom-3d-architecture.svg)

## 💻 Quickstart
\`\`\`bash
# Clone and install
git clone https://github.com/your-username/airloom.git
cd airloom
npm install

# Run development server (Port 3000)
npm run dev

# Build for production
npm run build
npm start
\`\`\`

## 📡 REST API Reference
- \`POST /api/upload/init\`: Allocates upload session
- \`POST /api/upload/chunk\`: Writes 5MB chunk directly to disk
- \`POST /api/upload/complete\`: Verifies rolling hash and commits share
- \`POST /api/shares\`: Configures QR code and optional password
- \`GET /api/shares/:token\`: Retrieves manifest and access permissions
- \`GET /api/shares/:token/download/:fileId\`: Streams file with HTTP 206 support
- \`GET /api/shares/:token/download-all\`: Streams dynamic multi-file ZIP archive
`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(rawReadmeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReadme = () => {
    const blob = new Blob([rawReadmeMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-[1px] shadow-lg shadow-fuchsia-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-fuchsia-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                GitHub README &amp; 3D Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
                v2.4.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 3D animated repository documentation and architectural specifications
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-mono transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied Markdown' : 'Copy README.md'}</span>
          </button>

          <button
            onClick={handleDownloadReadme}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-fuchsia-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download README.md</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('3d-overview')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
            activeTab === '3d-overview'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Interactive 3D Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('readme-doc')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'readme-doc'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Rendered GitHub README</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'architecture'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3D Architecture Pipeline</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === '3d-overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 3D Interactive Stage */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                  Live WebGL 3D Quantum Conduit
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                Click &amp; Drag to Orbit
              </div>
            </div>

            {/* Three.js Canvas Container */}
            <div
              ref={canvasRef}
              className="w-full h-80 sm:h-96 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center relative cursor-grab active:cursor-grabbing"
            />

            {/* 3D Controls Panel */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] font-mono">Speed:</span>
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRotSpeed(s)}
                    className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                      rotSpeed === s
                        ? 'bg-fuchsia-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] font-mono">Holo Accent:</span>
                {(['magenta', 'cyan', 'emerald'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setAccentHue(h)}
                    className={`px-2 py-1 rounded capitalize font-mono text-[11px] transition-colors ${
                      accentHue === h
                        ? 'bg-slate-800 text-white font-bold border border-slate-600'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setWireframeOnly(!wireframeOnly)}
                className={`px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
                  wireframeOnly
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {wireframeOnly ? 'Wireframe: ON' : 'Wireframe: OFF'}
              </button>
            </div>
          </div>

          {/* Quick Info & Highlights */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Zero-Cloud High Throughput Engine</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                AirLoom establishes an immediate, direct conduit between desktop machines and mobile cameras. By replacing fragile monolithic POST uploads with resilient chunk streaming, you can share high-definition footage, full databases, and complex archives without hitting RAM limits.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block">CHUNK PROFILE</span>
                  <span className="text-base font-mono font-bold text-cyan-400">5 MB Parts</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block">TESTED CEILING</span>
                  <span className="text-base font-mono font-bold text-fuchsia-400">10 GB</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block">SEEK RESUME</span>
                  <span className="text-base font-mono font-bold text-emerald-400">HTTP 206</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block">ENCRYPTION KDF</span>
                  <span className="text-base font-mono font-bold text-indigo-400">Scrypt</span>
                </div>
              </div>
            </div>

            {/* Quickstart Command Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>ONE-LINE SPINUP</span>
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('git clone https://github.com/your-username/airloom.git && cd airloom && npm install && npm run dev');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto">
                <code>git clone &amp;&amp; npm i &amp;&amp; npm run dev</code>
              </div>
              <p className="text-[11px] text-slate-500">
                Binds port 3000 with hot TypeScript reload and Express asset routing.
              </p>
            </div>

            {/* Go to Transfer Button */}
            <button
              onClick={onNavigateToTransfer}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Launch Transfer Session</span>
            </button>
          </div>
        </div>
      )}

      {/* Rendered README Tab */}
      {activeTab === 'readme-doc' && (
        <div className="space-y-6">
          {/* 3D Animated Banner Preview */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
            <img
              src="/assets/airloom-3d-banner.svg"
              alt="AirLoom 3D Banner"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Formatted Markdown Content */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-8 text-slate-300">
            {/* Title & Badges */}
            <div className="text-center space-y-4 pb-6 border-b border-slate-800">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">AirLoom</h1>
              <p className="text-base text-slate-400 max-w-xl mx-auto">
                High-Throughput Zero-Cloud File Transfer Conduit via Dynamic QR Codes
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50 text-xs font-mono font-semibold">
                  TypeScript 5.8
                </span>
                <span className="px-2.5 py-1 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 text-xs font-mono font-semibold">
                  React 19
                </span>
                <span className="px-2.5 py-1 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 text-xs font-mono font-semibold">
                  Three.js 3D Engine
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-xs font-mono font-semibold">
                  Express 4.21
                </span>
                <span className="px-2.5 py-1 rounded bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-700/50 text-xs font-mono font-semibold">
                  10 GB Tested
                </span>
              </div>
            </div>

            {/* Architecture Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-fuchsia-400" />
                <span>3D Animated Architecture Conduit</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Traditional Node.js file upload solutions crash container memory by buffering entire files in memory via <code className="text-rose-400 bg-slate-950 px-1.5 py-0.5 rounded">fs.readFileSync()</code>. AirLoom operates as a streaming pipeline:
              </p>
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                <img
                  src="/assets/airloom-3d-architecture.svg"
                  alt="AirLoom 3D Architecture"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Key Innovations */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span>Key Innovations &amp; Architectural Strengths</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <h4 className="font-bold text-white text-sm">1. Chunked 5 MB Streaming</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Browser slices large files directly using standard <code className="text-cyan-400">Blob.slice()</code>, streaming parts sequentially with automatic retries and rolling SHA-256 computation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <h4 className="font-bold text-white text-sm">2. HTTP 206 Partial Content</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Download streams support byte-range seeking, allowing mobile recipients to scrub audio/video or resume interrupted multi-gigabyte transfers smoothly.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <h4 className="font-bold text-white text-sm">3. Hardware-Hardened Scrypt KDF</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Password protection utilizes Node.js native <code className="text-purple-400">crypto.scrypt</code> with high memory-cost parameters, effectively preventing GPU/ASIC rainbow table attacks.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <h4 className="font-bold text-white text-sm">4. High-Contrast Vector QR Delivery</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generates clean vector QR matrices with high optical density, quiet zones, and instant print-poster generation for fast room-wide distribution.
                  </p>
                </div>
              </div>
            </div>

            {/* REST API Table */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span>REST API Specification</span>
              </h2>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Method</th>
                      <th className="p-3">Endpoint</th>
                      <th className="p-3">Function</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="p-3 text-cyan-400 font-bold">POST</td>
                      <td className="p-3">/api/upload/init</td>
                      <td className="p-3 text-slate-400">Allocates upload token and targets</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-cyan-400 font-bold">POST</td>
                      <td className="p-3">/api/upload/chunk</td>
                      <td className="p-3 text-slate-400">Streams 5MB chunk directly into disk writeStream</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-cyan-400 font-bold">POST</td>
                      <td className="p-3">/api/upload/complete</td>
                      <td className="p-3 text-slate-400">Verifies final hash and creates share metadata</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-indigo-400 font-bold">GET</td>
                      <td className="p-3">/api/shares/:token</td>
                      <td className="p-3 text-slate-400">Retrieves share manifest and access state</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-indigo-400 font-bold">GET</td>
                      <td className="p-3">/api/shares/:token/download/:id</td>
                      <td className="p-3 text-slate-400">Streams file with HTTP 206 seek support</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-indigo-400 font-bold">GET</td>
                      <td className="p-3">/api/shares/:token/download-all</td>
                      <td className="p-3 text-slate-400">Streams dynamic on-the-fly ZIP bundle</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Architecture Blueprint Tab */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Full-Stack Memory &amp; Streaming Blueprint</h3>
              <p className="text-xs text-slate-400">
                Detailed comparison of memory overhead between monolithic buffering vs. AirLoom streaming
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
              <img
                src="/assets/airloom-3d-architecture.svg"
                alt="AirLoom 3D Architecture"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Benchmark Comparison Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                <span className="text-xs font-mono font-bold text-rose-400">TRADITIONAL MONOLITHIC UPLOAD</span>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Loads entire 10 GB file into V8 JavaScript heap.</li>
                  <li>Crashes with <code className="text-rose-300">FATAL ERROR: Ineffective mark-compacts near heap limit</code>.</li>
                  <li>Blocks Node.js event loop during massive buffer allocations.</li>
                  <li>No resume capability if network drops at 99%.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400">AIRLOOM STREAMING ENGINE</span>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Bounded memory consumption capped at ~15 MB regardless of file size.</li>
                  <li>Incremental chunks written immediately to disk with backpressure.</li>
                  <li>Calculates SHA-256 rolling hash on the fly.</li>
                  <li>Seamless HTTP 206 range header support for video seeking.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
