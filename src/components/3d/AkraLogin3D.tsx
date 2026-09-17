import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAkra } from '../../context/AkraContext';
import { Lock, User, ArrowRight, Shield, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { AkraLogo } from '../AkraLogo';

export const AkraLogin3D: React.FC = () => {
  const { login, sendPasswordResetEmail, showToast } = useAkra();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State - Just Nickname and Password
  const [nickname, setNickname] = useState('Mama');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isWarping, setIsWarping] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(sessionStorage.getItem('akra_login_fails') || '0', 10) || 0;
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetTab, setResetTab] = useState<'direct' | 'email'>('direct');
  const [resetEmail, setResetEmail] = useState('ragultheking0007@gmail.com');
  const [partnerCode, setPartnerCode] = useState('AKRA-2024');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingDirect, setIsResettingDirect] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) {
      setErrorMsg(`Too many login attempts. Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }
    setErrorMsg('');

    if (!nickname.trim() || !password.trim()) {
      setErrorMsg('Please enter your nickname or email, and your password.');
      return;
    }

    // Trigger soft dissolve entrance
    setIsWarping(true);

    try {
      const res = await login(nickname.trim(), password.trim());
      if (!res.success) {
        setIsWarping(false);
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        sessionStorage.setItem('akra_login_fails', String(newFails));

        if (newFails >= 8) {
          setCooldownSeconds(60);
          setErrorMsg('Multiple failed attempts. Throttled for 60s to protect account security.');
        } else if (newFails >= 5) {
          setCooldownSeconds(30);
          setErrorMsg('Too many failed attempts. Please wait 30s before trying again.');
        } else if (newFails >= 3) {
          setCooldownSeconds(10);
          setErrorMsg('Multiple failed attempts. Please wait 10s.');
        } else {
          setErrorMsg(res.error || 'Invalid credentials. Please verify your password.');
        }
      } else {
        sessionStorage.removeItem('akra_login_fails');
      }
    } catch (err: any) {
      setIsWarping(false);
      setErrorMsg(err.message || 'Authentication error.');
    }
  };

  const handleSelectProfile = (selectedNick: string) => {
    setNickname(selectedNick);
    setErrorMsg('');
  };

  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    if (newResetPassword.length < 6) {
      setResetErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetErrorMsg('Passwords do not match.');
      return;
    }

    setIsResettingDirect(true);
    try {
      const response = await fetch('/api/auth/reset-password-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          partnerCode: partnerCode.trim(),
          newPassword: newResetPassword.trim(),
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        setIsResettingDirect(false);
        setResetErrorMsg(resData.error || 'Failed to update password.');
        return;
      }

      setResetSuccessMsg('Password updated in Supabase! Logging you in...');
      showToast('Password Updated! ✨', 'Opening the door to AKRA...', 'love');

      // Automatically sign in with the new password
      const loginRes = await login(resetEmail.trim(), newResetPassword.trim());
      setIsResettingDirect(false);
      if (!loginRes.success) {
        setResetErrorMsg('Password updated, but auto-login failed. Please close this modal and sign in.');
      } else {
        setShowForgotModal(false);
      }
    } catch (err: any) {
      setIsResettingDirect(false);
      setResetErrorMsg(err?.message || 'Network error updating password.');
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    if (!resetEmail.trim()) {
      setResetErrorMsg('Please enter your email address.');
      return;
    }

    setIsSendingReset(true);
    const res = await sendPasswordResetEmail(resetEmail.trim());
    setIsSendingReset(false);

    if (!res.success) {
      setResetErrorMsg(res.error || 'Failed to send password reset email.');
    } else {
      setResetSuccessMsg(`Recovery link sent! Check your inbox for ${resetEmail.trim()}. Click the link to set your new password directly.`);
      showToast('Reset Link Sent 💌', `Check ${resetEmail.trim()} for your password recovery link.`, 'love');
    }
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
                onClick={() => handleSelectProfile('Mama')}
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
                onClick={() => handleSelectProfile('Akshu')}
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
                  Nickname or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7a5240]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                    placeholder="Mama or Akshu"
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
                    placeholder="Enter your password"
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
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const initialEmail = nickname.toLowerCase() === 'mama' || nickname.toLowerCase() === 'ragul'
                        ? 'ragultheking0007@gmail.com'
                        : 'akshya@akra.love';
                      setResetEmail(initialEmail);
                      setResetErrorMsg('');
                      setResetSuccessMsg('');
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-[#7a5240]/80 hover:text-[#5b3a2e] hover:underline transition cursor-pointer"
                  >
                    Forgot password?
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
                disabled={isWarping || cooldownSeconds > 0}
                className="w-full mt-1 py-3.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] font-semibold text-xs tracking-wide hover:bg-[#4a2e24] active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer border border-[#7a5240]/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>
                  {isWarping
                    ? 'Opening the door...'
                    : cooldownSeconds > 0
                    ? `Please wait (${cooldownSeconds}s)`
                    : 'Open the Door'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Supabase Security Badge */}
            <div className="mt-5 p-3 rounded-2xl bg-[#ffffff]/65 border border-[#7a5240]/15 text-xs text-[#5b3a2e] flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-[#b06a5e] shrink-0" />
              <div className="text-[11px] text-[#7a5240] leading-tight">
                <span className="font-semibold text-[#5b3a2e]">Real-time Supabase Auth:</span> Sign in securely with your private password to enter the sanctuary.
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

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#FFF5F7] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#F0C9D8] text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[#b06a5e]">
                <KeyRound className="w-4 h-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Password Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetSuccessMsg('');
                  setResetErrorMsg('');
                }}
                className="text-xs text-[#7a5240]/60 hover:text-[#5b3a2e] transition"
              >
                ✕ Close
              </button>
            </div>

            <h3 className="text-xl font-serif font-bold text-[#3E2723] mb-1">
              Reset Your Password
            </h3>
            <p className="text-xs text-[#795548] mb-4 leading-relaxed">
              Set a new password directly using your shared partner key, without needing email links.
            </p>

            {/* Mode Tabs */}
            <div className="flex p-1 bg-[#ecd0c8]/40 rounded-2xl mb-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setResetTab('direct');
                  setResetErrorMsg('');
                  setResetSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-xl transition text-center ${
                  resetTab === 'direct'
                    ? 'bg-white text-[#3e2723] shadow-sm font-semibold'
                    : 'text-[#7a5240]/80 hover:text-[#3e2723]'
                }`}
              >
                ✨ Instant Reset (No Email)
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetTab('email');
                  setResetErrorMsg('');
                  setResetSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-xl transition text-center ${
                  resetTab === 'email'
                    ? 'bg-white text-[#3e2723] shadow-sm font-semibold'
                    : 'text-[#7a5240]/80 hover:text-[#3e2723]'
                }`}
              >
                ✉️ Email Link
              </button>
            </div>

            {/* Partner Profile Selection */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1.5">
                Who are you?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResetEmail('ragultheking0007@gmail.com')}
                  className={`py-2 px-3 rounded-2xl text-xs font-medium border text-left transition flex items-center gap-2 ${
                    resetEmail === 'ragultheking0007@gmail.com'
                      ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e]'
                      : 'bg-white/70 text-[#5b3a2e] border-[#F0C9D8] hover:bg-white'
                  }`}
                >
                  <span className="text-sm">🧔🏽</span>
                  <div>
                    <div className="font-semibold leading-tight">Mama</div>
                    <div className="text-[10px] opacity-75">Ragul</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setResetEmail('akshya@akra.love')}
                  className={`py-2 px-3 rounded-2xl text-xs font-medium border text-left transition flex items-center gap-2 ${
                    resetEmail === 'akshya@akra.love'
                      ? 'bg-[#5b3a2e] text-[#f9efe8] border-[#5b3a2e]'
                      : 'bg-white/70 text-[#5b3a2e] border-[#F0C9D8] hover:bg-white'
                  }`}
                >
                  <span className="text-sm">🌸</span>
                  <div>
                    <div className="font-semibold leading-tight">Akshu</div>
                    <div className="text-[10px] opacity-75">Akshya</div>
                  </div>
                </button>
              </div>
            </div>

            {resetTab === 'direct' ? (
              <form onSubmit={handleDirectReset} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1">
                    Couple Partner Key
                  </label>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    required
                    placeholder="AKRA-2024"
                    className="w-full px-3.5 py-2 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-mono font-medium focus:outline-none focus:border-[#5D4037] transition"
                  />
                  <p className="text-[10px] text-[#795548]/70 mt-1">
                    Secret key shared between Ragul & Akshya (Default: AKRA-2024)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Enter at least 6 characters"
                      className="w-full pl-3.5 pr-10 py-2 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-medium focus:outline-none focus:border-[#5D4037] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a5240]/60 hover:text-[#5b3a2e]"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter your new password"
                    className="w-full px-3.5 py-2 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-medium focus:outline-none focus:border-[#5D4037] transition"
                  />
                </div>

                {resetErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800">
                    {resetErrorMsg}
                  </div>
                )}

                {resetSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-xs text-emerald-900 font-medium">
                    {resetSuccessMsg}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSuccessMsg('');
                      setResetErrorMsg('');
                    }}
                    className="flex-1 py-2.5 rounded-full border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-medium hover:bg-white/50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingDirect}
                    className="flex-1 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isResettingDirect ? 'Setting Password...' : 'Save Password & Enter'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5D4037] mb-1.5">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="ragultheking0007@gmail.com"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-[#F0C9D8] text-xs text-[#3E2723] font-medium placeholder-[#795548]/40 focus:outline-none focus:border-[#5D4037] focus:ring-1 focus:ring-[#5D4037] transition"
                  />
                </div>

                {resetErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800">
                    {resetErrorMsg}
                  </div>
                )}

                {resetSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-xs text-emerald-900 font-medium">
                    {resetSuccessMsg}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSuccessMsg('');
                      setResetErrorMsg('');
                    }}
                    className="flex-1 py-2.5 rounded-full border border-[#7a5240]/20 text-xs text-[#5b3a2e] font-medium hover:bg-white/50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="flex-1 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReset ? 'Sending...' : 'Send Recovery Email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
