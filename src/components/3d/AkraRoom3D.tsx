import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAkra } from '../../context/AkraContext';
import { NavigationTab } from '../../types';
import {
  AKRA_PALETTE,
  createGlowParticleTexture,
  createEarthTexture,
  createStardustParticles,
} from './AkraSceneSystem';
import {
  Heart,
  MessageCircle,
  Camera,
  Lock,
  MapPin,
  Film,
  Image as ImageIcon,
  Mail,
  Milestone as MilestoneIcon,
  Compass,
  Maximize2,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';

interface InteractiveObjectData {
  id: NavigationTab;
  name: string;
  shortDesc: string;
  emoji: string;
  position: THREE.Vector3;
  cameraTargetPos: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
  meshGroup: THREE.Group;
}

export const AkraRoom3D: React.FC<{ onNavigate?: (tab: NavigationTab) => void }> = ({ onNavigate }) => {
  const {
    currentUser,
    partnerUser,
    relationship,
    setActiveTab,
    unreadCount,
    calculateDistanceKm,
    sendVirtualHeart,
    memories,
    letters,
  } = useAkra();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hover & Transition State
  const [hoveredObject, setHoveredObject] = useState<InteractiveObjectData | null>(null);
  const [activeTransition, setActiveTransition] = useState<{
    id: NavigationTab;
    type: 'zoom' | 'flash' | 'safe' | 'warp';
  } | null>(null);
  const [flashScreen, setFlashScreen] = useState(false);
  const [safeDoorOpening, setSafeDoorOpening] = useState(false);
  const [orbitMode, setOrbitMode] = useState(false);

  // Live Together Calculation
  const [timeTogether, setTimeTogether] = useState({
    years: 1,
    months: 8,
    days: 14,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(relationship.anniversaryDate).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);
      const totalSeconds = Math.floor(diffMs / 1000);
      const totalDays = Math.floor(totalSeconds / 86400);

      const years = Math.floor(totalDays / 365.25);
      const remainingDays = totalDays - Math.floor(years * 365.25);
      const months = Math.floor(remainingDays / 30.44);
      const days = Math.floor(remainingDays - Math.floor(months * 30.44));

      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeTogether({ years, months, days, hours, minutes, seconds });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [relationship.anniversaryDate]);

  const distanceKm = calculateDistanceKm();

  // Internal 3D References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const interactiveObjectsRef = useRef<InteractiveObjectData[]>([]);
  const projectorBeamRef = useRef<THREE.Mesh | null>(null);
  const curtainsRef = useRef<THREE.Mesh | null>(null);
  const centerHeartRef = useRef<THREE.Group | null>(null);
  const safeDoorRef = useRef<THREE.Group | null>(null);
  const letterMeshRef = useRef<THREE.Group | null>(null);

  // Camera animation target
  const cameraAnimRef = useRef({
    currentPos: new THREE.Vector3(0, 3.2, 7.5),
    targetPos: new THREE.Vector3(0, 3.2, 7.5),
    currentLookAt: new THREE.Vector3(0, 1.2, 0),
    targetLookAt: new THREE.Vector3(0, 1.2, 0),
    isTransitioning: false,
  });

  // Pointer & Raycasting
  const pointerRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene & Atmosphere Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(AKRA_PALETTE.cream);
    scene.fog = new THREE.FogExp2(0xF5E3EA, 0.038);
    sceneRef.current = scene;

    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.parentElement?.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 7.5);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 2. Room Lighting
    // Warm romantic ambient
    const ambientLight = new THREE.AmbientLight(0xFFF2F6, 1.4);
    scene.add(ambientLight);

    // Warm main chandelier / ceiling sun light
    const mainLight = new THREE.DirectionalLight(0xFFF8E7, 1.6);
    mainLight.position.set(4, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 25;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Soft Pink & Lilac accent fill lights
    const pinkFill = new THREE.PointLight(AKRA_PALETTE.softPink, 3.2, 16);
    pinkFill.position.set(-4, 4, 2);
    scene.add(pinkFill);

    const lilacFill = new THREE.PointLight(AKRA_PALETTE.lilac, 2.6, 16);
    lilacFill.position.set(4, 3.5, -2);
    scene.add(lilacFill);

    // 3. Room Architecture (Cozy Romantic Living Sanctuary)
    const roomWidth = 14;
    const roomHeight = 7.5;
    const roomDepth = 12;

    // A. Parquet Hardwood Floor
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x4E342E,
      roughness: 0.35,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft plush rug in center
    const rugGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.04, 48);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xFCEBF2,
      roughness: 0.9,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.02, 0);
    rug.receiveShadow = true;
    scene.add(rug);

    // B. Back Wall (Warm Cream / Soft Blush)
    const backWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xFFF5F8,
      roughness: 0.8,
    });
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left Wall with Arched Window
    const leftWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Arched Window on Left Wall with Night Twilight View
    const windowFrameGeo = new THREE.BoxGeometry(0.1, 4.2, 3.2);
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: AKRA_PALETTE.cream,
      roughness: 0.4,
    });
    const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
    windowFrame.position.set(-roomWidth / 2 + 0.05, 3.8, -1.2);
    scene.add(windowFrame);

    // Outside Twilight Sky Backing
    const skyGeo = new THREE.PlaneGeometry(5, 5);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x1c1224,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(-roomWidth / 2 - 0.2, 3.8, -1.2);
    sky.rotation.y = Math.PI / 2;
    scene.add(sky);

    // Sheer Curtains that flutter
    const curtainGeo = new THREE.PlaneGeometry(1.2, 4.2, 16, 16);
    const curtainMat = new THREE.MeshStandardMaterial({
      color: 0xFCEBF2,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(-roomWidth / 2 + 0.15, 3.8, -2.4);
    curtain.rotation.y = Math.PI / 2;
    scene.add(curtain);
    curtainsRef.current = curtain;

    // 4. Interactive 3D Objects Setup
    const interactiveList: InteractiveObjectData[] = [];

    // OBJECT 1: Cozy Sofa / Couch (Private Chat)
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-3.2, 0, 0.4);
    sofaGroup.rotation.y = 0.55;

    // Sofa Base / Cushion
    const sofaMat = new THREE.MeshStandardMaterial({
      color: AKRA_PALETTE.cocoaBrown,
      roughness: 0.65,
      metalness: 0.1,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: AKRA_PALETTE.softPink,
      roughness: 0.8,
    });

    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 1.4), sofaMat);
    seatBase.position.y = 0.25;
    seatBase.castShadow = true;
    seatBase.receiveShadow = true;
    sofaGroup.add(seatBase);

    const seatCushion1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), cushionMat);
    seatCushion1.position.set(-0.65, 0.55, 0);
    seatCushion1.castShadow = true;
    sofaGroup.add(seatCushion1);

    const seatCushion2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), cushionMat);
    seatCushion2.position.set(0.65, 0.55, 0);
    seatCushion2.castShadow = true;
    sofaGroup.add(seatCushion2);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 0.35), sofaMat);
    sofaBack.position.set(0, 1.0, -0.6);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 1.4), sofaMat);
    sofaArmL.position.set(-1.45, 0.6, 0);
    sofaArmL.castShadow = true;
    sofaGroup.add(sofaArmL);

    const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 1.4), sofaMat);
    sofaArmR.position.set(1.45, 0.6, 0);
    sofaArmR.castShadow = true;
    sofaGroup.add(sofaArmR);

    // Accent Pillows
    const pillowMat = new THREE.MeshStandardMaterial({ color: AKRA_PALETTE.deepRose, roughness: 0.6 });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.2), pillowMat);
    pillow.position.set(-1.0, 0.8, -0.35);
    pillow.rotation.set(0.2, 0.4, 0.1);
    sofaGroup.add(pillow);

    scene.add(sofaGroup);
    interactiveList.push({
      id: 'chat',
      name: 'Our Private Chat',
      shortDesc: unreadCount > 0 ? `${unreadCount} unread notes • Tap to sit together` : 'Real-time couple whispers & love notes',
      emoji: '🛋️',
      position: sofaGroup.position,
      cameraTargetPos: new THREE.Vector3(-2.8, 1.8, 2.8),
      cameraLookAt: new THREE.Vector3(-3.2, 0.8, 0.4),
      meshGroup: sofaGroup,
    });

    // OBJECT 2: Retro Camera on Stool (Photobooth)
    const cameraGroup = new THREE.Group();
    cameraGroup.position.set(-2.6, 0, 3.2);

    // Small Wooden Stool
    const stoolTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x6B4636, roughness: 0.4 })
    );
    stoolTop.position.y = 1.0;
    stoolTop.castShadow = true;
    cameraGroup.add(stoolTop);

    const stoolLegGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.0, 12);
    const stoolLegMat = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(stoolLegGeo, stoolLegMat);
      leg.position.set(Math.cos(angle) * 0.35, 0.5, Math.sin(angle) * 0.35);
      leg.rotation.x = Math.sin(angle) * 0.1;
      leg.rotation.z = -Math.cos(angle) * 0.1;
      cameraGroup.add(leg);
    }

    // Vintage Camera Body
    const camBodyMat = new THREE.MeshStandardMaterial({ color: 0x241916, roughness: 0.3, metalness: 0.4 });
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.26), camBodyMat);
    camBody.position.set(0, 1.25, 0);
    camBody.castShadow = true;
    cameraGroup.add(camBody);

    // Lens Cylinder with Gold Rim
    const lensRimMat = new THREE.MeshStandardMaterial({ color: AKRA_PALETTE.warmGold, metalness: 0.85, roughness: 0.2 });
    const lensRim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24), lensRimMat);
    lensRim.rotation.x = Math.PI / 2;
    lensRim.position.set(0, 1.25, 0.18);
    cameraGroup.add(lensRim);

    // Flash Box
    const flashMat = new THREE.MeshStandardMaterial({ color: 0xFFF7F2, emissive: 0xFFF7F2, emissiveIntensity: 0.4 });
    const flashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), flashMat);
    flashMesh.position.set(0.18, 1.45, 0.05);
    cameraGroup.add(flashMesh);

    scene.add(cameraGroup);
    interactiveList.push({
      id: 'photobooth',
      name: 'Retro Photobooth',
      shortDesc: 'Snap dual polaroids with live camera & print strips',
      emoji: '📸',
      position: cameraGroup.position,
      cameraTargetPos: new THREE.Vector3(-2.6, 1.5, 4.4),
      cameraLookAt: new THREE.Vector3(-2.6, 1.3, 3.2),
      meshGroup: cameraGroup,
    });

    // OBJECT 3: Glowing Safe (Secret Photo Vault)
    const safeGroup = new THREE.Group();
    safeGroup.position.set(4.4, 0, -2.2);

    // Safe Body
    const safeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e1514,
      metalness: 0.7,
      roughness: 0.3,
    });
    const safeBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.1), safeBodyMat);
    safeBody.position.y = 0.7;
    safeBody.castShadow = true;
    safeGroup.add(safeBody);

    // Safe Door with Hinge Group
    const safeDoor = new THREE.Group();
    safeDoor.position.set(-0.55, 0.7, 0.56); // hinge at left edge

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2e1f24, metalness: 0.8, roughness: 0.25 })
    );
    doorPanel.position.x = 0.55;
    safeDoor.add(doorPanel);

    // Gold Dial & Wheel Handle
    const dialMat = new THREE.MeshStandardMaterial({ color: AKRA_PALETTE.warmGold, metalness: 0.9, roughness: 0.2 });
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), dialMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.55, 0.1, 0.07);
    safeDoor.add(dial);

    // Glowing Keypad Indicator
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), ledMat);
    led.position.set(0.55, 0.38, 0.08);
    safeDoor.add(led);

    safeDoorRef.current = safeDoor;
    safeGroup.add(safeDoor);

    scene.add(safeGroup);
    interactiveList.push({
      id: 'vault',
      name: 'Secret Photo Vault',
      shortDesc: 'Password-locked sanctuary for private memories',
      emoji: '🔐',
      position: safeGroup.position,
      cameraTargetPos: new THREE.Vector3(3.8, 1.2, -0.6),
      cameraLookAt: new THREE.Vector3(4.4, 0.7, -2.2),
      meshGroup: safeGroup,
    });

    // OBJECT 4: Miniature Illuminated Globe on Side Table (Live Location)
    const globeGroup = new THREE.Group();
    globeGroup.position.set(-4.2, 0, -2.0);

    // Side Table
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.4 })
    );
    tableTop.position.y = 1.4;
    tableTop.castShadow = true;
    globeGroup.add(tableTop);

    const tableLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.5 })
    );
    tableLeg.position.y = 0.7;
    globeGroup.add(tableLeg);

    // Brass Stand & Meridian Ring
    const brassMat = new THREE.MeshStandardMaterial({ color: AKRA_PALETTE.warmGold, metalness: 0.8, roughness: 0.2 });
    const meridianRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 16, 48), brassMat);
    meridianRing.position.set(0, 1.9, 0);
    meridianRing.rotation.y = Math.PI / 4;
    globeGroup.add(meridianRing);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      map: createEarthTexture(),
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x241828,
      emissiveIntensity: 0.3,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, 1.9, 0);
    earthMesh.rotation.x = 0.35; // Earth tilt
    globeGroup.add(earthMesh);

    scene.add(globeGroup);
    interactiveList.push({
      id: 'location',
      name: 'Live Location & Distance',
      shortDesc: `${distanceKm} km apart • Puducherry ♡ Bangalore`,
      emoji: '📍',
      position: globeGroup.position,
      cameraTargetPos: new THREE.Vector3(-3.2, 2.2, -0.6),
      cameraLookAt: new THREE.Vector3(-4.2, 1.9, -2.0),
      meshGroup: globeGroup,
    });

    // OBJECT 5: Vintage Film Projector (Movie Night)
    const projectorGroup = new THREE.Group();
    projectorGroup.position.set(3.4, 0, 2.2);
    projectorGroup.rotation.y = -0.55;

    // Small Media Cart
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.5 })
    );
    cart.position.y = 0.6;
    cart.castShadow = true;
    projectorGroup.add(cart);

    // Projector Main Housing
    const projMat = new THREE.MeshStandardMaterial({ color: 0x241916, roughness: 0.3, metalness: 0.5 });
    const projBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.45), projMat);
    projBox.position.set(0, 1.38, 0);
    projectorGroup.add(projBox);

    // Dual Film Reels
    const reelMat = new THREE.MeshStandardMaterial({ color: AKRA_PALETTE.warmGold, metalness: 0.8, roughness: 0.3 });
    const reel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24), reelMat);
    reel1.rotation.z = Math.PI / 2;
    reel1.position.set(0, 1.7, -0.15);
    projectorGroup.add(reel1);

    const reel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24), reelMat);
    reel2.rotation.z = Math.PI / 2;
    reel2.position.set(0, 1.7, 0.15);
    projectorGroup.add(reel2);

    // Projector Volumetric Light Cone Beam
    const beamGeo = new THREE.ConeGeometry(1.8, 5.0, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xFFF0F5,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(-2.5, 1.38, -1.8);
    beam.rotation.z = Math.PI / 2 + 0.3;
    beam.rotation.y = -0.6;
    projectorGroup.add(beam);
    projectorBeamRef.current = beam;

    scene.add(projectorGroup);
    interactiveList.push({
      id: 'movie-night',
      name: 'Movie Night Cinema',
      shortDesc: 'Sync-watch together with live webcam portal',
      emoji: '🎬',
      position: projectorGroup.position,
      cameraTargetPos: new THREE.Vector3(2.6, 1.8, 3.8),
      cameraLookAt: new THREE.Vector3(3.4, 1.4, 2.2),
      meshGroup: projectorGroup,
    });

    // OBJECT 6: Polaroid Photo Wall (Memories)
    const photoWallGroup = new THREE.Group();
    photoWallGroup.position.set(roomWidth / 2 - 0.1, 3.2, 0.8);
    photoWallGroup.rotation.y = -Math.PI / 2;

    // String light wire
    const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 3.8, 8);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xD4AF37 });
    const string1 = new THREE.Mesh(stringGeo, stringMat);
    string1.rotation.z = Math.PI / 2;
    string1.position.y = 0.6;
    photoWallGroup.add(string1);

    // Hung Polaroid Frames
    const polMat = new THREE.MeshStandardMaterial({ color: 0xFFF7F2, roughness: 0.7 });
    const photoInnerMat1 = new THREE.MeshBasicMaterial({ color: 0xA85D76 });
    const photoInnerMat2 = new THREE.MeshBasicMaterial({ color: 0x6B4636 });
    const photoInnerMat3 = new THREE.MeshBasicMaterial({ color: 0xDCCCE8 });

    const photoPositions = [-1.2, 0, 1.2];
    const photoMats = [photoInnerMat1, photoInnerMat2, photoInnerMat3];

    photoPositions.forEach((posX, idx) => {
      const polFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.03), polMat);
      polFrame.position.set(posX, 0.25, 0.02);
      polFrame.rotation.z = (idx - 1) * 0.08;

      const innerPhoto = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), photoMats[idx]);
      innerPhoto.position.set(0, 0.08, 0.02);
      polFrame.add(innerPhoto);

      // Glowing Mini fairy light bulb
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xFFD700 })
      );
      bulb.position.set(posX, 0.6, 0.04);
      photoWallGroup.add(bulb);

      photoWallGroup.add(polFrame);
    });

    scene.add(photoWallGroup);
    interactiveList.push({
      id: 'memories',
      name: 'Our Memories Wall',
      shortDesc: `${memories.length} preserved photos & moments together`,
      emoji: '🖼️',
      position: photoWallGroup.position,
      cameraTargetPos: new THREE.Vector3(4.8, 3.2, 0.8),
      cameraLookAt: new THREE.Vector3(roomWidth / 2, 3.2, 0.8),
      meshGroup: photoWallGroup,
    });

    // OBJECT 7: Floating Wax-Sealed Romantic Envelope (Letters)
    const letterGroup = new THREE.Group();
    letterGroup.position.set(1.4, 2.2, 1.6);

    // Envelope Body
    const envMat = new THREE.MeshStandardMaterial({
      color: 0xFFF2F6,
      roughness: 0.6,
    });
    const envelope = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 0.04), envMat);
    letterGroup.add(envelope);

    // Crimson Wax Seal with Heart
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0x8A1C30,
      metalness: 0.3,
      roughness: 0.2,
    });
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), sealMat);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0, 0, 0.03);
    letterGroup.add(seal);

    letterMeshRef.current = letterGroup;
    scene.add(letterGroup);

    interactiveList.push({
      id: 'letters',
      name: 'Sealed Love Letters',
      shortDesc: `${letters.length} handwritten letters • "Open when you miss me..."`,
      emoji: '💌',
      position: letterGroup.position,
      cameraTargetPos: new THREE.Vector3(1.4, 2.2, 2.8),
      cameraLookAt: new THREE.Vector3(1.4, 2.2, 1.6),
      meshGroup: letterGroup,
    });

    // OBJECT 8: Celestial Constellation Board (Relationship Timeline)
    const timelineGroup = new THREE.Group();
    timelineGroup.position.set(0, 3.8, -roomDepth / 2 + 0.1);

    // Board Backing
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x181220,
      roughness: 0.4,
      metalness: 0.2,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.06), boardMat);
    timelineGroup.add(board);

    // Constellation Stars & Connecting Lines
    const starGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xFFF0F5 });
    const starNodes = [
      new THREE.Vector3(-1.1, -0.3, 0.05),
      new THREE.Vector3(-0.4, 0.35, 0.05),
      new THREE.Vector3(0.3, -0.15, 0.05),
      new THREE.Vector3(1.1, 0.4, 0.05),
    ];

    starNodes.forEach((pos) => {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.copy(pos);
      timelineGroup.add(star);
    });

    // Line connecting constellation
    const lineGeo = new THREE.BufferGeometry().setFromPoints(starNodes);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xDCCCE8, transparent: true, opacity: 0.7 });
    const constellationLine = new THREE.Line(lineGeo, lineMat);
    timelineGroup.add(constellationLine);

    scene.add(timelineGroup);
    interactiveList.push({
      id: 'timeline',
      name: 'Relationship Timeline',
      shortDesc: 'Constellation of milestones from First Meeting to Forever',
      emoji: '✨',
      position: timelineGroup.position,
      cameraTargetPos: new THREE.Vector3(0, 3.8, -roomDepth / 2 + 2.5),
      cameraLookAt: new THREE.Vector3(0, 3.8, -roomDepth / 2),
      meshGroup: timelineGroup,
    });

    // OBJECT 9: Dream Pinboard (Future Plans / Bucket List)
    const futureGroup = new THREE.Group();
    futureGroup.position.set(-2.8, 3.6, -roomDepth / 2 + 0.1);

    const corkMat = new THREE.MeshStandardMaterial({ color: 0xC2956E, roughness: 0.9 });
    const corkBoard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.05), corkMat);
    futureGroup.add(corkBoard);

    // Pinned notes
    const note1 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.38),
      new THREE.MeshBasicMaterial({ color: 0xFCEBF2 })
    );
    note1.position.set(-0.4, 0.3, 0.03);
    note1.rotation.z = -0.05;
    futureGroup.add(note1);

    const note2 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.38),
      new THREE.MeshBasicMaterial({ color: 0xDCCCE8 })
    );
    note2.position.set(0.4, -0.2, 0.03);
    note2.rotation.z = 0.08;
    futureGroup.add(note2);

    scene.add(futureGroup);
    interactiveList.push({
      id: 'future',
      name: 'Future Dreams & Bucket List',
      shortDesc: 'Upcoming reunions, shared travel, and dream goals',
      emoji: '🧭',
      position: futureGroup.position,
      cameraTargetPos: new THREE.Vector3(-2.8, 3.6, -roomDepth / 2 + 2.4),
      cameraLookAt: new THREE.Vector3(-2.8, 3.6, -roomDepth / 2),
      meshGroup: futureGroup,
    });

    // 5. Centerpiece: Floating Holographic Glass Heart & Display
    const heartGroup = new THREE.Group();
    heartGroup.position.set(0, 1.6, 0);

    // 3D Glass Heart Mesh
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 0.25, y + 0.25);
    heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
    heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });
    heartGeo.center();

    const glassHeartMat = new THREE.MeshPhysicalMaterial({
      color: AKRA_PALETTE.softPink,
      emissive: 0x8A324B,
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.8,
      thickness: 0.5,
      transparent: true,
      opacity: 0.85,
    });

    const heartMesh = new THREE.Mesh(heartGeo, glassHeartMat);
    heartMesh.scale.set(0.65, 0.65, 0.65);
    heartMesh.rotation.z = Math.PI; // flip right side up
    heartGroup.add(heartMesh);

    // Orbiting sparkle ring
    const ringGeo = new THREE.TorusGeometry(0.85, 0.015, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: AKRA_PALETTE.warmGold, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    heartGroup.add(ring);

    centerHeartRef.current = heartGroup;
    scene.add(heartGroup);

    // 6. Ambient Floating Particles in Room
    const stardust = createStardustParticles(160, { x: 12, y: 6, z: 10 });
    scene.add(stardust.points);

    interactiveObjectsRef.current = interactiveList;

    // Pointer Event Listeners
    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('resize', handleResize);

    // Render Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle curatins flutter
      if (curtainsRef.current) {
        curtainsRef.current.rotation.z = Math.sin(elapsedTime * 1.5) * 0.05;
      }

      // Projector beam subtle flicker
      if (projectorBeamRef.current) {
        const mat = projectorBeamRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.14 + Math.sin(elapsedTime * 8) * 0.04 + Math.random() * 0.02;
      }

      // Floating envelope bob
      if (letterMeshRef.current) {
        letterMeshRef.current.position.y = 2.2 + Math.sin(elapsedTime * 2.0) * 0.08;
        letterMeshRef.current.rotation.y = Math.sin(elapsedTime * 1.2) * 0.15;
      }

      // Centerpiece rotating glass heart
      if (centerHeartRef.current) {
        centerHeartRef.current.rotation.y = elapsedTime * 0.6;
        centerHeartRef.current.position.y = 1.6 + Math.sin(elapsedTime * 1.5) * 0.1;
      }

      // Update stardust particles
      stardust.update(elapsedTime);

      // Camera Lerp handling
      const camTarget = cameraAnimRef.current;
      if (camTarget.isTransitioning) {
        camera.position.lerp(camTarget.targetPos, 0.07);
        camTarget.currentLookAt.lerp(camTarget.targetLookAt, 0.07);
        camera.lookAt(camTarget.currentLookAt);
      } else if (!orbitMode) {
        // Idle gentle room sway
        const swayX = Math.sin(elapsedTime * 0.4) * 0.25;
        const swayY = Math.cos(elapsedTime * 0.3) * 0.12;
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, swayX, 0.02);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.2 + swayY, 0.02);
        camera.lookAt(0, 1.2, 0);
      }

      // Raycasting for object hover detection
      if (!camTarget.isTransitioning) {
        raycasterRef.current.setFromCamera(pointerRef.current, camera);
        const meshesToTest: THREE.Object3D[] = [];
        interactiveList.forEach(obj => {
          obj.meshGroup.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              meshesToTest.push(child);
            }
          });
        });

        const intersects = raycasterRef.current.intersectObjects(meshesToTest, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          let matched: InteractiveObjectData | null = null;
          for (const item of interactiveList) {
            let found = false;
            item.meshGroup.traverse(child => {
              if (child === hit) found = true;
            });
            if (found) {
              matched = item;
              break;
            }
          }
          setHoveredObject(matched);
        } else {
          setHoveredObject(null);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [relationship.anniversaryDate, distanceKm, memories.length, letters.length, unreadCount, orbitMode]);

  // Object Click Handler -> Cinematic Transition
  const handleSelectObject = (targetObj: InteractiveObjectData) => {
    setHoveredObject(null);

    // Choose cinematic transition flavor
    let transType: 'zoom' | 'flash' | 'safe' | 'warp' = 'zoom';
    if (targetObj.id === 'photobooth') transType = 'flash';
    if (targetObj.id === 'vault') transType = 'safe';
    if (targetObj.id === 'location' || targetObj.id === 'movie-night') transType = 'warp';

    setActiveTransition({ id: targetObj.id, type: transType });

    // Animate camera toward object
    cameraAnimRef.current.targetPos = targetObj.cameraTargetPos;
    cameraAnimRef.current.targetLookAt = targetObj.cameraLookAt;
    cameraAnimRef.current.isTransitioning = true;

    // Special effects
    if (transType === 'safe' && safeDoorRef.current) {
      setSafeDoorOpening(true);
      // Animate 3D safe door swing
      let angle = 0;
      const swingInterval = setInterval(() => {
        angle += 0.08;
        if (safeDoorRef.current) {
          safeDoorRef.current.rotation.y = Math.min(angle, Math.PI / 1.7);
        }
        if (angle >= Math.PI / 1.7) clearInterval(swingInterval);
      }, 30);
    }

    if (transType === 'flash') {
      setTimeout(() => {
        setFlashScreen(true);
      }, 450);
    }

    // Complete navigation transition
    setTimeout(() => {
      setFlashScreen(false);
      setSafeDoorOpening(false);
      setActiveTransition(null);
      if (onNavigate) {
        onNavigate(targetObj.id);
      } else {
        setActiveTab(targetObj.id);
      }
    }, 850);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-68px)] sm:h-[calc(100vh-70px)] min-h-[550px] overflow-hidden select-none bg-[#FFF0F5]"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onClick={() => {
          if (hoveredObject) {
            handleSelectObject(hoveredObject);
          }
        }}
        className={`w-full h-full block ${hoveredObject ? 'cursor-pointer' : 'cursor-default'}`}
      />

      {/* Screen Flash Shutter Overlay (Photobooth) */}
      <div
        className={`fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-300 ease-out ${
          flashScreen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Cinematic Warp / Fade Overlay */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none bg-[#FFF0F5] transition-opacity duration-500 ease-in-out ${
          activeTransition && !flashScreen ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {/* Floating Center Glass Display (Names, Anniversary, Reunion) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#FFF0F5]/85 backdrop-blur-xl border border-[#F4C7D3] shadow-md text-[#3E2723]">
          <button
            onClick={sendVirtualHeart}
            className="flex items-center gap-1.5 text-xs font-bold text-[#A85D76] hover:scale-105 transition active:scale-95"
            title="Send Virtual Hug"
          >
            <Heart className="w-3.5 h-3.5 fill-[#A85D76]" />
            <span>{distanceKm} km</span>
          </button>

          <span className="h-3 w-[1px] bg-[#F4C7D3]" />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-serif font-bold text-sm text-[#3E2723]">
              {currentUser.nickname || currentUser.name} ♡ {partnerUser.nickname || partnerUser.name}
            </span>
            <span className="text-[#A85D76] font-semibold text-[11px]">
              • {timeTogether.years}Y {timeTogether.months}M {timeTogether.days}D
            </span>
          </div>

          <span className="hidden sm:inline h-3 w-[1px] bg-[#F4C7D3]" />

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#6B4636]">
            <Calendar className="w-3 h-3 text-[#A85D76]" />
            <span>Reunion in 18 days</span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip / Floating Card When Pointer Over Object */}
      {hoveredObject && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-5 py-3 rounded-2xl bg-[#241916]/85 backdrop-blur-md border border-[#F4C7D3]/40 shadow-2xl text-center text-[#FFF7F2] min-w-[240px]">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span className="text-xl">{hoveredObject.emoji}</span>
              <h3 className="font-serif font-bold text-sm tracking-wide text-[#F4C7D3]">
                {hoveredObject.name}
              </h3>
            </div>
            <p className="text-[11px] text-[#DCCCE8] font-sans">
              {hoveredObject.shortDesc}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold text-[#FFF7F2] tracking-wider uppercase bg-[#A85D76]/60 px-2 py-0.5 rounded-full">
              Click to Enter
            </span>
          </div>
        </div>
      )}

      {/* Quick Interactive Object Guide Pills (Clickable for Touch / Instant Access) */}
      <div className="absolute top-16 left-4 right-4 z-20 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center justify-center gap-1.5 min-w-max mx-auto">
          {interactiveObjectsRef.current.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectObject(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF0F5]/80 hover:bg-[#FCEBF2] backdrop-blur-md border border-[#F4C7D3] text-xs text-[#3E2723] hover:text-[#A85D76] transition shadow-xs active:scale-95 group"
            >
              <span className="text-xs group-hover:scale-110 transition-transform">{item.emoji}</span>
              <span className="font-medium text-[11px]">{item.name.replace('Our ', '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-6 z-20 hidden md:flex items-center gap-2 text-[11px] text-[#6B4636]/70 pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-[#A85D76]" />
        <span>Hover or tap interactive 3D objects in our room to enter</span>
      </div>
    </div>
  );
};
