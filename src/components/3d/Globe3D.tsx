import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { createEarthTexture } from './AkraSceneSystem';

interface Globe3DProps {
  userLocationName: string;
  partnerLocationName: string;
  distanceKm: number;
  isPartnerSharing: boolean;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  userLocationName,
  partnerLocationName,
  distanceKm,
  isPartnerSharing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth || 600;
    const height = 380;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Warm dusk lighting
    const ambientLight = new THREE.AmbientLight(0xf9efe8, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe7c4bd, 2.2);
    sunLight.position.set(5, 4, 4);
    scene.add(sunLight);

    const rimLight = new THREE.PointLight(0xd9a89e, 3, 15);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Globe Group
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.28;
    globeGroup.rotation.y = 1.35; // Orient towards Southern India
    scene.add(globeGroup);

    // Earth Sphere in Warm Rose-Brown Palette
    const radius = 1.6;
    const earthGeo = new THREE.SphereGeometry(radius, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: createEarthTexture(),
      roughness: 0.55,
      metalness: 0.2,
      emissive: 0x3d221b,
      emissiveIntensity: 0.35,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // Atmosphere Halo Rim
    const haloGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xe7c4bd,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(halo);

    const latLongToVector3 = (lat: number, lon: number, r: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(r * Math.sin(phi) * Math.cos(theta)),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    };

    // Puducherry: 11.9416 N, 79.8083 E
    // Bangalore: 12.9716 N, 77.5946 E
    const p1 = latLongToVector3(11.9416, 79.8083, radius * 1.01);
    const p2 = latLongToVector3(12.9716, 77.5946, radius * 1.01);

    // Marker 1: Puducherry (Mama)
    const markerGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const markerMat1 = new THREE.MeshBasicMaterial({ color: 0xf9efe8 });
    const marker1 = new THREE.Mesh(markerGeo, markerMat1);
    marker1.position.copy(p1);
    globeGroup.add(marker1);

    // Marker 2: Bangalore (Akshu)
    const markerMat2 = new THREE.MeshBasicMaterial({
      color: isPartnerSharing ? 0xf9efe8 : 0x7a5240,
    });
    const marker2 = new THREE.Mesh(markerGeo, markerMat2);
    marker2.position.copy(p2);
    globeGroup.add(marker2);

    // Connecting Arc Line
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    midPoint.normalize().multiplyScalar(radius * 1.22);

    const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
    const curvePoints = curve.getPoints(32);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({
      color: 0xf9efe8,
      transparent: true,
      opacity: isPartnerSharing ? 0.8 : 0.25,
      linewidth: 2,
    });
    const arcLine = new THREE.Line(curveGeo, curveMat);
    globeGroup.add(arcLine);

    // Traveling Light Pulse Dot
    const pulseGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pulseDot = new THREE.Mesh(pulseGeo, pulseMat);
    globeGroup.add(pulseDot);

    // Mouse drag interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x += deltaY * 0.003;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      if (!isDragging) {
        globeGroup.rotation.y += 0.0015;
      }

      if (isPartnerSharing) {
        const t = (Math.sin(time * 2.0) + 1) / 2;
        const pos = curve.getPoint(t);
        pulseDot.position.copy(pos);
        pulseDot.visible = true;
      } else {
        pulseDot.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isPartnerSharing]);

  return (
    <div className="relative w-full rounded-[32px] glass-cream border border-[#7a5240]/20 p-4 shadow-xl overflow-hidden text-[#5b3a2e]">
      <div className="relative w-full h-[380px] flex items-center justify-center cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#f9efe8]/90 backdrop-blur-md border border-[#7a5240]/15 text-[10px] text-[#5b3a2e] flex items-center gap-1.5 pointer-events-none font-mono">
          <span className="w-2 h-2 rounded-full bg-[#b06a5e] animate-slow-orb-pulse" />
          <span>Interactive Globe • Drag to rotate</span>
        </div>

        <div className="absolute bottom-4 right-4 px-3.5 py-2 rounded-2xl bg-[#f9efe8]/90 backdrop-blur-md border border-[#7a5240]/15 text-xs text-right pointer-events-none">
          <p className="font-serif text-sm text-[#5b3a2e] font-semibold">{distanceKm} km apart</p>
          <p className="text-[10px] text-[#7a5240] font-mono">Puducherry ↔ Bangalore</p>
        </div>
      </div>
    </div>
  );
};
