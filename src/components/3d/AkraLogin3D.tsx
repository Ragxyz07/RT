import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAkra } from '../../context/AkraContext';
import { Lock, User, ArrowRight, Shield, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { AkraLogo } from '../AkraLogo';

export const AkraLogin3D: React.FC = () => {
  const { login } = useAkra();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State - Just Nickname and Password
  const [nickname, setNickname] = useState('Mama');
  const [password, setPassword] = useState('mama123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isWarping, setIsWarping] = useState(false);

  // 3D Scene Refs
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Three.js Pink-Dusk Sea Scene ---
    const scene = new THREE.Scene();
    // Warm brown horizon haze fog
    scene.fog = new THREE.FogExp2(0x5b3a2e, 0.038);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.2, 7.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Warm atmospheric lighting
    const ambientLight = new THREE.AmbientLight(0xf3d9d2, 1.4);
    scene.add(ambientLight);

    // Warm dusk directional sun light from the horizon
    const duskSun = new THREE.DirectionalLight(0xe7c4bd, 2.2);
    duskSun.position.set(0, 3, -10);
    scene.add(duskSun);

    // Warm fill light
    const horizonFill = new THREE.PointLight(0xd9a89e, 3.5, 25);
    horizonFill.position.set(0, 0.5, -2);
    scene.add(horizonFill);

    // --- Calm Dusk Sea Plane ---
    const seaGeo = new THREE.PlaneGeometry(60, 60, 64, 64);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e24,
      roughness: 0.25,
      metalness: 0.65,
      emissive: 0x221310,
    });
    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.rotation.x = -Math.PI / 2;
    seaMesh.position.y = -1.6;
    scene.add(seaMesh);

    // Store original position coordinates for gentle ocean swell
    const posAttr = seaGeo.attributes.position;
    const initialZ = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      initialZ[i] = posAttr.getZ(i);
    }

    // --- Two Soft Glowing Orbs (Mama: Puducherry & Akshu: Bangalore) ---
    const orbGeo = new THREE.SphereGeometry(0.35, 32, 32);

    // Left Orb: Mama (Puducherry)
    const orbMamaMat = new THREE.MeshStandardMaterial({
      color: 0xf9efe8,
      emissive: 0xd9a89e,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4,
    });
    const orbMama = new THREE.Mesh(orbGeo, orbMamaMat);
    orbMama.position.set(-3.6, 0.8, -1.5);
    scene.add(orbMama);

    // Right Orb: Akshu (Bangalore)
    const orbAkshuMat = new THREE.MeshStandardMaterial({
      color: 0xf9efe8,
      emissive: 0xe7c4bd,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4,
    });
    const orbAkshu = new THREE.Mesh(orbGeo, orbAkshuMat);
    orbAkshu.position.set(3.6, 0.8, -1.5);
    scene.add(orbAkshu);

    // Outer soft glow halos
    const haloGeo = new THREE.SphereGeometry(0.7, 24, 24);
    const haloMatMama = new THREE.MeshBasicMaterial({
      color: 0xf3d9d2,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const haloMama = new THREE.Mesh(haloGeo, haloMatMama);
    orbMama.add(haloMama);

    const haloMatAkshu = new THREE.MeshBasicMaterial({
      color: 0xe7c4bd,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const haloAkshu = new THREE.Mesh(haloGeo, haloMatAkshu);
    orbAkshu.add(haloAkshu);

    // --- Connecting Light Line between Mama & Akshu ---
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-3.6, 0.8, -1.5),
      new THREE.Vector3(0, 1.4, -2.5),
      new THREE.Vector3(3.6, 0.8, -1.5)
    );
    const points = curve.getPoints(80);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xf9efe8,
      transparent: true,
      opacity: 0.5,
      linewidth: 1.5,
    });
    const connectingLine = new THREE.Line(lineGeo, lineMat);
    scene.add(connectingLine);

    // Traveling light pulse along the line
    const pulseGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    scene.add(pulseMesh);

    // Horizon subtle warm glow strip
    const horizonGeo = new THREE.PlaneGeometry(40, 4);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0xe7c4bd,
      transparent: true,
      opacity: 0.18,
    });
    const horizonGlow = new THREE.Mesh(horizonGeo, horizonMat);
    horizonGlow.position.set(0, 0.5, -15);
    scene.add(horizonGlow);

    // Mouse movement parallax
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.035;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.035;

      // Parallax camera gentle drift
      camera.position.x = mouseRef.current.x * 0.35;
      camera.position.y = 1.2 + mouseRef.current.y * 0.2;
      camera.lookAt(0, 0.5, 0);

      // Undulate calm ocean surface
      for (let i = 0; i < posAttr.count; i++) {
        const u = posAttr.getX(i);
        const v = posAttr.getY(i);
        const z = Math.sin(u * 0.25 + t * 0.8) * Math.cos(v * 0.25 + t * 0.6) * 0.12;
        posAttr.setZ(i, initialZ[i] + z);
      }
      posAttr.needsUpdate = true;

      // Gentle floating of orbs
      orbMama.position.y = 0.8 + Math.sin(t * 0.7) * 0.08;
      orbAkshu.position.y = 0.8 + Math.cos(t * 0.7) * 0.08;

      // Pulse traveling along the curve
      const pulseT = (t * 0.25) % 1;
      const pt = curve.getPoint(pulseT);
      pulseMesh.position.copy(pt);

      // Soft breathing glow on orbs
      const pulseScale = 1 + Math.sin(t * 1.5) * 0.08;
      haloMama.scale.set(pulseScale, pulseScale, pulseScale);
      haloAkshu.scale.set(pulseScale, pulseScale, pulseScale);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nickname.trim() || !password.trim()) {
      setErrorMsg('Please enter your nickname and password.');
      return;
    }

    // Trigger soft dissolve entrance
    setIsWarping(true);

    setTimeout(() => {
      const success = login(nickname.trim(), password.trim());
      if (!success) {
        setIsWarping(false);
        setErrorMsg('Invalid credentials. Use Mama (mama123) or Akshu (akshu123).');
      }
    }, 700);
  };

  const handleSelectProfile = (selectedNick: string, selectedPass: string) => {
    setNickname(selectedNick);
    setPassword(selectedPass);
    setErrorMsg('');
  };

  return (
    <div className="relative min-h-screen w-full bg-pink-dusk text-[#5b3a2e] overflow-hidden flex flex-col justify-between selection:bg-[#e7c4bd] selection:text-[#3e2723]">
      {/* 3D WebGL Background Canvas (Calm sea at dusk, warm rose sky, thin light line connecting Mama & Akshu) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${
          isWarping ? 'opacity-30' : 'opacity-100'
        }`}
      />

      {/* Atmospheric Volumetric Lighting Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e7c4bd]/20 to-[#5b3a2e]/30 pointer-events-none" />
      <div className="absolute inset-0 grain-overlay pointer-events-none" />

      {/* Header Micro-Bar */}
      <header className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AkraLogo size="sm" variant="emblem" theme="dark" />
          <div>
            <span className="font-serif text-2xl font-semibold tracking-wider text-[#5b3a2e]">AKRA</span>
            <p className="micro-label text-[9px] text-[#7a5240]/80">
              A private world for two
            </p>
          </div>
        </div>

        {/* Distance Indicator across Cities */}
        <div className="hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#f9efe8]/80 backdrop-blur-md border border-[#7a5240]/15 text-xs text-[#5b3a2e] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#b06a5e] animate-slow-orb-pulse" />
          <span className="font-medium">Puducherry</span>
          <span className="text-[#7a5240]/40 font-serif italic text-xs">↔</span>
          <span className="font-medium">Bangalore</span>
        </div>
      </header>

      {/* Center Frosted Glass Door Panel */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-4 sm:py-8 my-auto">
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${
            isWarping
              ? 'scale-95 opacity-0 blur-md pointer-events-none'
              : 'scale-100 opacity-100 animate-breathing-float'
          }`}
        >
          {/* Main Glass Door Card */}
          <div className="relative rounded-[32px] sm:rounded-[36px] glass-cream p-7 sm:p-9 shadow-2xl border border-[#7a5240]/20 overflow-hidden">
            {/* Header / Brand in Editorial Serif */}
            <div className="text-center mb-6 flex flex-col items-center justify-center">
              <div className="mb-2">
                <AkraLogo size="md" variant="emblem" theme="dark" />
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#5b3a2e] font-normal tracking-tight">
                A little world for <span className="italic font-serif">just two.</span>
              </h1>
              <p className="mt-1.5 text-xs text-[#7a5240] tracking-wide">
                Mama <span className="text-[11px] text-[#7a5240]/70">(Puducherry)</span> & Akshu <span className="text-[11px] text-[#7a5240]/70">(Bangalore)</span>
              </p>
            </div>

            {/* Quick Profile Selector Pills */}
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => handleSelectProfile('Mama', 'mama123')}
                className={`flex-1 py-2 px-3 rounded-2xl border transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                  nickname.toLowerCase() === 'mama' || nickname.toLowerCase() === 'ragul'
                    ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e] shadow-sm font-semibold'
                    : 'bg-[#ffffff]/50 hover:bg-[#ffffff]/80 text-[#5b3a2e] border-[#7a5240]/20'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#b06a5e]" />
                <span>Mama (Puducherry)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectProfile('Akshu', 'akshu123')}
                className={`flex-1 py-2 px-3 rounded-2xl border transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                  nickname.toLowerCase() === 'akshu' || nickname.toLowerCase() === 'akshya'
                    ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e] shadow-sm font-semibold'
                    : 'bg-[#ffffff]/50 hover:bg-[#ffffff]/80 text-[#5b3a2e] border-[#7a5240]/20'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#e7c4bd]" />
                <span>Akshu (Bangalore)</span>
              </button>
            </div>

            {/* Nickname & Password Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block micro-label mb-1.5 text-[#5b3a2e]">
                  Nickname
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7a5240]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                    placeholder="Enter nickname (Mama or Akshu)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#ffffff]/70 border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-medium placeholder-[#7a5240]/40 focus:outline-none focus:border-[#5b3a2e] focus:ring-1 focus:ring-[#5b3a2e] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block micro-label mb-1.5 text-[#5b3a2e]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a5240]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password (mama123 or akshu123)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#ffffff]/70 border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-medium placeholder-[#7a5240]/40 focus:outline-none focus:border-[#5b3a2e] focus:ring-1 focus:ring-[#5b3a2e] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a5240]/60 hover:text-[#5b3a2e] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800 text-center font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Enter Button */}
              <button
                type="submit"
                id="login-enter-btn"
                disabled={isWarping}
                className="w-full mt-1 py-3.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] font-semibold text-xs tracking-wide hover:bg-[#4a2e24] active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer border border-[#7a5240]/30"
              >
                <span>{isWarping ? 'Opening the door...' : 'Open the Door'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Permanent Clear Credentials Card */}
            <div className="mt-5 p-3.5 rounded-2xl bg-[#ffffff]/65 border border-[#7a5240]/15 text-xs text-[#5b3a2e]">
              <div className="flex items-center gap-1.5 font-semibold text-[#5b3a2e] mb-2">
                <KeyRound className="w-3.5 h-3.5 text-[#b06a5e]" />
                <span>Your Door Credentials</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#7a5240]">
                <div className="flex items-center justify-between py-0.5 border-b border-[#7a5240]/10">
                  <span>Mama (Ragul):</span>
                  <span className="font-mono bg-[#ecd0c8]/60 px-2 py-0.5 rounded text-[#5b3a2e]">
                    Nickname: <b>Mama</b> • Password: <b>mama123</b>
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Akshu (Akshya):</span>
                  <span className="font-mono bg-[#ecd0c8]/60 px-2 py-0.5 rounded text-[#5b3a2e]">
                    Nickname: <b>Akshu</b> • Password: <b>akshu123</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Subtle Security Footnote */}
            <div className="mt-4 pt-3 border-t border-[#7a5240]/15 text-center">
              <p className="text-[10px] text-[#7a5240]/80 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3 text-[#b06a5e]" />
                <span>Private space kept exclusively for Ragul & Akshya</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Ambient Info */}
      <footer className="relative z-10 p-6 text-center text-xs text-[#7a5240]/70 font-serif italic">
        <p>"A place that feels kept and personal."</p>
      </footer>
    </div>
  );
};
