import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { AKRA_PALETTE } from './AkraSceneSystem';

interface Safe3DProps {
  isUnlocked: boolean;
  pinLength: number;
  hasError: boolean;
}

export const Safe3D: React.FC<Safe3DProps> = ({ isUnlocked, pinLength, hasError }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doorGroupRef = useRef<THREE.Group | null>(null);
  const dialRef = useRef<THREE.Mesh | null>(null);
  const ledRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 260;
    const height = 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5f8, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 2.2);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(AKRA_PALETTE.warmGold, 3, 10);
    rimLight.position.set(-2, -1, 2);
    scene.add(rimLight);

    // Safe Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f1615,
      metalness: 0.85,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 0.8), bodyMat);
    scene.add(body);

    // Beveled frame trim
    const trimMat = new THREE.MeshStandardMaterial({
      color: AKRA_PALETTE.warmGold,
      metalness: 0.9,
      roughness: 0.3,
    });
    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.85), trimMat);
    trimTop.position.y = 1.1;
    scene.add(trimTop);

    // Door Group (hinged on left)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-0.95, 0, 0.42);
    doorGroupRef.current = doorGroup;

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.1, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x2e1e24,
        metalness: 0.9,
        roughness: 0.2,
      })
    );
    doorPanel.position.x = 0.95;
    doorGroup.add(doorPanel);

    // Combination Dial in Center of Door
    const dialMat = new THREE.MeshStandardMaterial({
      color: AKRA_PALETTE.warmGold,
      metalness: 0.95,
      roughness: 0.15,
    });
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 32), dialMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.95, 0.15, 0.08);
    dialRef.current = dial;
    doorGroup.add(dial);

    // Three-spoke wheel handle
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12),
        dialMat
      );
      spoke.position.set(0.95 + Math.cos(angle) * 0.15, 0.15 + Math.sin(angle) * 0.15, 0.14);
      spoke.rotation.z = angle + Math.PI / 2;
      doorGroup.add(spoke);
    }

    // Status LED
    const ledMat = new THREE.MeshBasicMaterial({
      color: hasError ? 0xff2244 : isUnlocked ? 0x22c55e : 0xd4af37,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), ledMat);
    led.position.set(0.95, 0.7, 0.1);
    ledRef.current = led;
    doorGroup.add(led);

    scene.add(doorGroup);

    // Animation Loop
    let animId: number;
    let currentDoorAngle = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth door swing
      const targetAngle = isUnlocked ? -Math.PI / 1.6 : 0;
      currentDoorAngle += (targetAngle - currentDoorAngle) * 0.08;
      doorGroup.rotation.y = currentDoorAngle;

      // Rotate dial when pin length changes
      if (dialRef.current) {
        const targetRot = pinLength * (Math.PI / 2);
        dialRef.current.rotation.z += (targetRot - dialRef.current.rotation.z) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [isUnlocked, pinLength, hasError]);

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="w-[260px] h-[260px] block pointer-events-none drop-shadow-2xl" />
    </div>
  );
};
