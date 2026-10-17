'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type DpadDirection = 'up' | 'down' | 'left' | 'right';

export interface GameBoy3DShellProps {
  children: React.ReactNode;
  onDpad?: (dir: DpadDirection) => void;
  /** B button: Back / Cancel / Dismiss (FS118 INV-AB-SWAP-01) */
  onPressB?: () => void;
  /** A button: Interact / Confirm / Select (FS118 INV-AB-SWAP-01) */
  onPressA?: () => void;
  /** Start button: Trigger game immediately (FS009 INV-BUTTON-01) */
  onPressStart?: () => void;
  /** Select / Options button: Trigger menu with "Join the bar!" etc. (FS009 INV-BUTTON-01) */
  onPressSelect?: () => void;
}

const REQUIRED_PARTS = [
  'body',
  'screen',
  'cartridge-pocket',
  'power-button',
  'power-button-frame',
  'power-indicator',
  'volume-control',
  'button-a',
  'button-b',
  'button-select',
  'button-start',
  'button-cross-up',
  'button-cross-down',
  'button-cross-left',
  'button-cross-right',
] as const;

type PartName = (typeof REQUIRED_PARTS)[number];

interface ProjectedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const POWER_INDICATOR_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUv = uv;
}
`;

const POWER_INDICATOR_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uMixPercent;
varying vec2 vUv;
void main() {
  vec3 textureColor = texture2D(uTexture, vUv).rgb;
  vec3 mixColor = mix(textureColor, uColor, uMixPercent);
  gl_FragColor = vec4(mixColor, 1.0);
}
`;

function projectBoxToViewport(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  viewportW: number,
  viewportH: number
): ProjectedRect {
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const c of corners) {
    c.project(camera);
    const px = (c.x * 0.5 + 0.5) * viewportW;
    const py = (-c.y * 0.5 + 0.5) * viewportH;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export default function GameBoy3DShell({
  children,
  onDpad,
  onPressB,
  onPressA,
  onPressStart,
  onPressSelect,
}: GameBoy3DShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenContRef = useRef<HTMLDivElement>(null);
  const controlsContRef = useRef<HTMLDivElement>(null);

  const [fatalError, setFatalError] = useState<string | null>(null);
  const [powerOn, setPowerOn] = useState(true);
  const [screenRect, setScreenRect] = useState<ProjectedRect | null>(null);
  const [buttonRects, setButtonRects] = useState<Record<string, ProjectedRect>>({});

  // Keep latest callbacks in refs so Three.js listeners never go stale
  const onDpadRef = useRef(onDpad);
  onDpadRef.current = onDpad;
  const onPressBRef = useRef(onPressB);
  onPressBRef.current = onPressB;
  const onPressARef = useRef(onPressA);
  onPressARef.current = onPressA;
  const onPressStartRef = useRef(onPressStart);
  onPressStartRef.current = onPressStart;
  const onPressSelectRef = useRef(onPressSelect);
  onPressSelectRef.current = onPressSelect;

  // Refs to animate 3D parts on press/release, console 3D axis rotation (FS120), and mobile screen zoom (FS121)
  const partsRef = useRef<Partial<Record<PartName, THREE.Object3D>>>({});
  const startPositionsRef = useRef<Partial<Record<PartName, THREE.Vector3>>>({});
  const crossGroupRef = useRef<THREE.Group | null>(null);
  const localScreenBoxRef = useRef<THREE.Box3 | null>(null);
  const localButtonBoxesRef = useRef<Record<string, THREE.Box3>>({});
  const baseScreenRectRef = useRef<ProjectedRect | null>(null);
  const liveButtonRectsRef = useRef<Record<string, ProjectedRect>>({});
  const targetRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isScreenZoomedRef = useRef(false);
  const targetZoomRef = useRef(0);
  const currentZoomRef = useRef(0);
  const isSpinDraggingRef = useRef(false);
  const motionPermissionRequestedRef = useRef(false);
  const targetCrossRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetBtnOffsetRef = useRef<Record<string, number>>({
    'button-a': 0,
    'button-b': 0,
    'button-select': 0,
    'button-start': 0,
  });
  const powerOnRef = useRef(true);
  powerOnRef.current = powerOn;

  const isMobileViewport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const w = hostRef.current?.clientWidth || window.innerWidth;
    if (w <= 768) return true;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      w <= 920
    ) {
      return true;
    }
    return false;
  }, []);

  const resetRotationToOrigin = useCallback(() => {
    let cy = currentRotRef.current.y;
    cy = ((((cy + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    currentRotRef.current.y = cy;
    targetRotRef.current = { x: 0, y: 0 };
  }, []);

  const requestMotionPermissionIfNeeded = useCallback(() => {
    if (motionPermissionRequestedRef.current || typeof window === 'undefined') return;
    const DME = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      motionPermissionRequestedRef.current = true;
      DME.requestPermission().catch(() => {
        /* ignore permission denial on non-HTTPS or user decline */
      });
    }
  }, []);

  const pulseButton3D = useCallback((partName: 'button-a' | 'button-b' | 'button-select' | 'button-start', dist: number) => {
    targetBtnOffsetRef.current[partName] = dist;
    window.setTimeout(() => {
      targetBtnOffsetRef.current[partName] = 0;
    }, 140);
  }, []);

  const pulseCross3D = useCallback((dir: DpadDirection) => {
    const rad = THREE.MathUtils.degToRad(8);
    if (dir === 'up') targetCrossRotRef.current = { x: -rad, y: 0 };
    else if (dir === 'down') targetCrossRotRef.current = { x: rad, y: 0 };
    else if (dir === 'left') targetCrossRotRef.current = { x: 0, y: -rad };
    else if (dir === 'right') targetCrossRotRef.current = { x: 0, y: rad };
    window.setTimeout(() => {
      targetCrossRotRef.current = { x: 0, y: 0 };
    }, 140);
  }, []);

  const triggerDpad = useCallback(
    (dir: DpadDirection) => {
      if (isSpinDraggingRef.current) return;
      pulseCross3D(dir);
      // FS121 (INV-MOBILE-DPAD-ZOOM-01 / AC-01): On mobile viewports, D-Pad activation
      // enters the Screen-Zoomed Camera State and centers any console tilt to (0, 0, 0).
      if (isMobileViewport()) {
        isScreenZoomedRef.current = true;
        targetZoomRef.current = 1;
        resetRotationToOrigin();
      }
      onDpadRef.current?.(dir);
    },
    [isMobileViewport, pulseCross3D, resetRotationToOrigin]
  );

  const triggerB = useCallback(() => {
    if (isSpinDraggingRef.current) return;
    pulseButton3D('button-b', 0.055);
    onPressBRef.current?.();
  }, [pulseButton3D]);

  const triggerA = useCallback(() => {
    if (isSpinDraggingRef.current) return;
    pulseButton3D('button-a', 0.055);
    onPressARef.current?.();
  }, [pulseButton3D]);

  const triggerStart = useCallback(() => {
    if (isSpinDraggingRef.current) return;
    pulseButton3D('button-start', 0.039);
    onPressStartRef.current?.();
  }, [pulseButton3D]);

  const triggerSelect = useCallback(() => {
    if (isSpinDraggingRef.current) return;
    pulseButton3D('button-select', 0.039);
    onPressSelectRef.current?.();
  }, [pulseButton3D]);

  // FS120 — Device shake-to-center reset to (0, 0, 0)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastGx: number | null = null;
    let lastGy: number | null = null;
    let lastGz: number | null = null;
    let lastShakeMs = 0;

    const onDeviceMotion = (e: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastShakeMs < 350) return;

      const acc = e.acceleration;
      if (acc && (acc.x != null || acc.y != null || acc.z != null)) {
        const linMag = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0);
        if (linMag >= 14) {
          lastShakeMs = now;
          resetRotationToOrigin();
          return;
        }
      }

      const accG = e.accelerationIncludingGravity;
      if (accG && (accG.x != null || accG.y != null || accG.z != null)) {
        const gx = accG.x || 0;
        const gy = accG.y || 0;
        const gz = accG.z || 0;
        if (lastGx !== null && lastGy !== null && lastGz !== null) {
          const deltaMag = Math.hypot(gx - lastGx, gy - lastGy, gz - lastGz);
          if (deltaMag >= 14) {
            lastShakeMs = now;
            lastGx = gx;
            lastGy = gy;
            lastGz = gz;
            resetRotationToOrigin();
            return;
          }
        } else {
          const totalMag = Math.hypot(gx, gy, gz);
          if (totalMag >= 22) {
            lastShakeMs = now;
            resetRotationToOrigin();
            return;
          }
        }
        lastGx = gx;
        lastGy = gy;
        lastGz = gz;
      }
    };

    const onCustomShakeReset = () => {
      resetRotationToOrigin();
    };

    window.addEventListener('devicemotion', onDeviceMotion);
    window.addEventListener('gb-shake-reset', onCustomShakeReset);
    return () => {
      window.removeEventListener('devicemotion', onDeviceMotion);
      window.removeEventListener('gb-shake-reset', onCustomShakeReset);
    };
  }, [resetRotationToOrigin]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let rafId = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const gameBoyRoot = new THREE.Group();
    gameBoyRoot.rotation.order = 'YXZ';
    scene.add(gameBoyRoot);

    const textureLoader = new THREE.TextureLoader();
    const loadTextureStrict = (url: string): Promise<THREE.Texture> =>
      new Promise((resolve, reject) => {
        textureLoader.load(
          url,
          (tex) => {
            tex.flipY = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            resolve(tex);
          },
          undefined,
          () => reject(new Error(`[FATAL_3D_ASSET_ERROR] Failed to load texture: ${url}`))
        );
      });

    const gltfLoader = new GLTFLoader();
    const loadModelStrict = (url: string): Promise<THREE.Group> =>
      new Promise((resolve, reject) => {
        gltfLoader.load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          () => reject(new Error(`[FATAL_3D_ASSET_ERROR] Failed to load 3D model: ${url}`))
        );
      });

    let powerIndicatorUniforms: {
      uTexture: { value: THREE.Texture };
      uColor: { value: THREE.Color };
      uMixPercent: { value: number };
    } | null = null;

    const interactiveNames: PartName[] = [
      'button-b',
      'button-a',
      'button-start',
      'button-select',
      'button-cross-up',
      'button-cross-down',
      'button-cross-left',
      'button-cross-right',
    ];

    const applyCameraFramingForZoom = (w: number, h: number, zoom: number) => {
      camera.aspect = w / h;

      // 1. Normal Full-Console Framing (zoom = 0):
      // Frame the Game Boy so the screen AND physical control cluster (D-Pad, B, A, Start, Select)
      // fit comfortably inside any desktop or mobile viewport while maximizing screen legibility.
      const targetMinY = -1.55;
      const targetMaxY = 1.92;
      const normalCenterX = 0;
      const normalCenterY = (targetMinY + targetMaxY) * 0.5; // +0.185
      const spanY = (targetMaxY - targetMinY) * 1.04; // ~3.61 units
      const spanX = 2.38; // full width of Game Boy body (2.251) + margin
      const frontZ = 0.355;

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const tanHalfVFov = Math.tan(vFovRad * 0.5);
      const tanHalfHFov = Math.max(0.05, tanHalfVFov * camera.aspect);

      const distForHeight = (spanY * 0.5) / tanHalfVFov;
      const distForWidth = (spanX * 0.5) / tanHalfHFov;
      const normalCamDist = Math.max(distForHeight, distForWidth);
      const normalCamZ = frontZ + normalCamDist;

      // 2. Screen-Zoomed Framing (zoom = 1, FS121):
      // Center vertically and horizontally on the 3D Game Boy screen aperture and move closer
      // so the 3D Game Boy screen fills ~94% of the mobile viewport width (>= 90% per AC-01)
      // while the surrounding 3D Game Boy shell/bezel remains diegetically visible around it.
      const sBox = localScreenBoxRef.current;
      let zoomCenterX = normalCenterX;
      let zoomCenterY = normalCenterY;
      let zoomCamZ = normalCamZ;

      if (sBox) {
        zoomCenterX = (sBox.min.x + sBox.max.x) * 0.5;
        zoomCenterY = (sBox.min.y + sBox.max.y) * 0.5;
        const screenFrontZ = sBox.max.z;
        const screenW = Math.max(0.1, sBox.max.x - sBox.min.x);
        const screenH = Math.max(0.1, sBox.max.y - sBox.min.y);
        const zoomSpanX = screenW / 0.94;
        const zoomSpanY = screenH / 0.90;
        const zoomDistForWidth = (zoomSpanX * 0.5) / tanHalfHFov;
        const zoomDistForHeight = (zoomSpanY * 0.5) / tanHalfVFov;
        const zoomCamDist = Math.max(zoomDistForWidth, zoomDistForHeight);
        zoomCamZ = screenFrontZ + zoomCamDist;
      }

      const camX = THREE.MathUtils.lerp(normalCenterX, zoomCenterX, zoom);
      const camY = THREE.MathUtils.lerp(normalCenterY, zoomCenterY, zoom);
      const camZ = THREE.MathUtils.lerp(normalCamZ, zoomCamZ, zoom);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(camX, camY, 0);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
    };

    const syncProjectedRectsToReactState = (
      nextScreenRect: ProjectedRect,
      nextBtnRects: Record<string, ProjectedRect>
    ) => {
      setScreenRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - nextScreenRect.left) < 0.5 &&
          Math.abs(prev.top - nextScreenRect.top) < 0.5 &&
          Math.abs(prev.width - nextScreenRect.width) < 0.5 &&
          Math.abs(prev.height - nextScreenRect.height) < 0.5
        ) {
          return prev;
        }
        return nextScreenRect;
      });
      setButtonRects((prev) => {
        for (const name of interactiveNames) {
          const a = prev[name];
          const b = nextBtnRects[name];
          if (!a && !b) continue;
          if (
            !a ||
            !b ||
            Math.abs(a.left - b.left) >= 0.5 ||
            Math.abs(a.top - b.top) >= 0.5 ||
            Math.abs(a.width - b.width) >= 0.5 ||
            Math.abs(a.height - b.height) >= 0.5
          ) {
            return { ...nextBtnRects };
          }
        }
        return prev;
      });
    };

    const updateLayoutAndProjections = () => {
      if (disposed || !host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);

      renderer.setSize(w, h, false);

      // FS121 (INV-DESKTOP-STABILITY-01): If resized to desktop, exit mobile screen zoom
      if (!isMobileViewport() && isScreenZoomedRef.current) {
        isScreenZoomedRef.current = false;
        targetZoomRef.current = 0;
        currentZoomRef.current = 0;
      }

      const parts = partsRef.current;
      if (!parts.screen) {
        applyCameraFramingForZoom(w, h, currentZoomRef.current);
        return;
      }

      // Ensure unrotated local 3D bounding boxes are cached at (0, 0, 0)
      if (!localScreenBoxRef.current) {
        const savedRx = gameBoyRoot.rotation.x;
        const savedRy = gameBoyRoot.rotation.y;
        gameBoyRoot.rotation.set(0, 0, 0);
        gameBoyRoot.updateMatrixWorld(true);

        localScreenBoxRef.current = new THREE.Box3().setFromObject(parts.screen);
        const btnBoxes: Record<string, THREE.Box3> = {};
        for (const name of interactiveNames) {
          const obj = parts[name];
          if (obj) {
            btnBoxes[name] = new THREE.Box3().setFromObject(obj);
          }
        }
        localButtonBoxesRef.current = btnBoxes;

        gameBoyRoot.rotation.x = savedRx;
        gameBoyRoot.rotation.y = savedRy;
        gameBoyRoot.updateMatrixWorld(true);
      }

      applyCameraFramingForZoom(w, h, currentZoomRef.current);

      const sBox = localScreenBoxRef.current;
      if (!sBox) return;

      const nextScreenRect = projectBoxToViewport(sBox, camera, w, h);
      baseScreenRectRef.current = nextScreenRect;

      const nextBtnRects: Record<string, ProjectedRect> = {};
      for (const name of interactiveNames) {
        const bBox = localButtonBoxesRef.current[name];
        if (bBox) {
          nextBtnRects[name] = projectBoxToViewport(bBox, camera, w, h);
        }
      }
      liveButtonRectsRef.current = nextBtnRects;
      syncProjectedRectsToReactState(nextScreenRect, nextBtnRects);
    };

    Promise.all([
      loadModelStrict('/models/game-boy.glb'),
      loadTextureStrict('/textures/baked-game-boy.jpg'),
      loadTextureStrict('/textures/baked-cartridge-pocket.jpg'),
      loadTextureStrict('/textures/baked-power-indicator.jpg'),
    ])
      .then(([gltfScene, bakedMainTex, bakedPocketTex, bakedPowerTex]) => {
        if (disposed) return;

        const mainMat = new THREE.MeshBasicMaterial({ map: bakedMainTex });
        const pocketMat = new THREE.MeshBasicMaterial({ map: bakedPocketTex });

        powerIndicatorUniforms = {
          uTexture: { value: bakedPowerTex },
          uColor: { value: new THREE.Color(0xff0000) },
          uMixPercent: { value: 1.0 },
        };
        const powerIndicatorMat = new THREE.ShaderMaterial({
          uniforms: powerIndicatorUniforms,
          vertexShader: POWER_INDICATOR_VERTEX_SHADER,
          fragmentShader: POWER_INDICATOR_FRAGMENT_SHADER,
        });

        // Native dark screen backing mesh (the live native-color React playfield sits registered over it)
        const screenBackingMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0e });

        const foundParts: Partial<Record<PartName, THREE.Object3D>> = {};
        const startPos: Partial<Record<PartName, THREE.Vector3>> = {};

        for (const partName of REQUIRED_PARTS) {
          const child = gltfScene.children.find((c) => c.name === partName);
          if (!child) {
            throw new Error(
              `[FATAL_3D_ASSET_ERROR] Missing required mesh "${partName}" in /models/game-boy.glb`
            );
          }
          child.userData.partType = partName;
          startPos[partName] = child.position.clone();
          foundParts[partName] = child;

          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (partName === 'cartridge-pocket') {
              mesh.material = pocketMat;
            } else if (partName === 'power-indicator') {
              mesh.material = powerIndicatorMat;
            } else if (partName === 'screen') {
              mesh.material = screenBackingMat;
            } else {
              mesh.material = mainMat;
            }
          }
        }

        // Assemble parts into gameBoyRoot, grouping D-pad cross buttons around their shared pivot
        const crossGroup = new THREE.Group();
        const crossPivot = startPos['button-cross-left']!.clone();
        crossGroup.position.copy(crossPivot);

        for (const partName of REQUIRED_PARTS) {
          const part = foundParts[partName]!;
          if (
            partName === 'button-cross-up' ||
            partName === 'button-cross-down' ||
            partName === 'button-cross-left' ||
            partName === 'button-cross-right'
          ) {
            part.position.set(0, 0, 0);
            crossGroup.add(part);
          } else {
            gameBoyRoot.add(part);
          }
        }
        gameBoyRoot.add(crossGroup);

        // Position power-button in the ON position (+0.114 along X)
        const pBtn = foundParts['power-button']!;
        pBtn.position.x = startPos['power-button']!.x + 0.114;

        partsRef.current = foundParts;
        startPositionsRef.current = startPos;
        crossGroupRef.current = crossGroup;

        updateLayoutAndProjections();
      })
      .catch((err) => {
        if (!disposed) {
          setFatalError(err instanceof Error ? err.message : String(err));
        }
      });

    // Raycaster & pointer-drag 3D axis spin controller (FS120 & FS121)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    let activePointerId: number | null = null;
    let startClientX = 0;
    let startClientY = 0;
    let lastClientX = 0;
    let lastClientY = 0;
    let downHitPart: PartName | undefined = undefined;
    let downCameFromDomButton = false;

    const raycastPartAt = (clientX: number, clientY: number): PartName | undefined => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return undefined;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(gameBoyRoot.children, true);
      if (hits.length === 0) return undefined;
      return hits[0].object.userData?.partType as PartName | undefined;
    };

    const dispatchPartAction = (hitPart: PartName | undefined) => {
      if (!hitPart) return;
      if (hitPart === 'button-b') {
        triggerB();
      } else if (hitPart === 'button-a') {
        triggerA();
      } else if (hitPart === 'button-start') {
        triggerStart();
      } else if (hitPart === 'button-select') {
        triggerSelect();
      } else if (hitPart === 'button-cross-up') {
        triggerDpad('up');
      } else if (hitPart === 'button-cross-down') {
        triggerDpad('down');
      } else if (hitPart === 'button-cross-left') {
        triggerDpad('left');
      } else if (hitPart === 'button-cross-right') {
        triggerDpad('right');
      } else if (hitPart === 'power-button' || hitPart === 'power-button-frame') {
        setPowerOn((prev) => !prev);
      }
    };

    const onHostPointerDown = (e: PointerEvent) => {
      requestMotionPermissionIfNeeded();
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const targetEl = e.target as HTMLElement | null;
      const normYDown =
        ((((currentRotRef.current.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2)) -
        Math.PI;
      const isNearFront =
        Math.abs(currentRotRef.current.x) < 0.35 && Math.abs(normYDown) < 0.35;
      if (
        isNearFront &&
        powerOnRef.current &&
        screenContRef.current &&
        targetEl &&
        screenContRef.current.contains(targetEl)
      ) {
        return;
      }

      activePointerId = e.pointerId;
      startClientX = e.clientX;
      startClientY = e.clientY;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      isSpinDraggingRef.current = false;
      downCameFromDomButton = Boolean(
        controlsContRef.current && targetEl && controlsContRef.current.contains(targetEl)
      );
      downHitPart = raycastPartAt(e.clientX, e.clientY);
    };

    const onWindowPointerMove = (e: PointerEvent) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;

      const totalDx = e.clientX - startClientX;
      const totalDy = e.clientY - startClientY;

      if (!isSpinDraggingRef.current) {
        if (Math.hypot(totalDx, totalDy) < 5) return;
        isSpinDraggingRef.current = true;
        // FS121 (INV-ROTATE-UNZOOM-01 / AC-03): Console rotation drag immediately exits
        // the Screen-Zoomed Camera State and smoothly zooms back out to normal framing.
        if (isScreenZoomedRef.current) {
          isScreenZoomedRef.current = false;
          targetZoomRef.current = 0;
        }
        try {
          host.setPointerCapture(e.pointerId);
        } catch {
          /* ignore if pointer capture unavailable */
        }
      }

      const stepDx = e.clientX - lastClientX;
      const stepDy = e.clientY - lastClientY;
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      // Spin continuously around Y axis and apply bounded tilt around X axis
      targetRotRef.current.y += stepDx * 0.011;
      targetRotRef.current.x = THREE.MathUtils.clamp(
        targetRotRef.current.x + stepDy * 0.008,
        -0.65,
        0.65
      );
    };

    const onWindowPointerUp = (e: PointerEvent) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      const wasDragging = isSpinDraggingRef.current;
      activePointerId = null;
      try {
        if (host.hasPointerCapture(e.pointerId)) {
          host.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }

      if (!wasDragging && !downCameFromDomButton && downHitPart) {
        dispatchPartAction(downHitPart);
      }
      downHitPart = undefined;
      downCameFromDomButton = false;
      window.setTimeout(() => {
        isSpinDraggingRef.current = false;
      }, 0);
    };

    host.addEventListener('pointerdown', onHostPointerDown);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('resize', updateLayoutAndProjections);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateLayoutAndProjections)
        : null;
    ro?.observe(host);

    const mvpMatrix = new THREE.Matrix4();
    const vpMatrix = new THREE.Matrix4();
    const worldCenterVec = new THREE.Vector3();
    const worldNormalVec = new THREE.Vector3();
    const toCamVec = new THREE.Vector3();
    const p0Vec = new THREE.Vector4();
    const euVec = new THREE.Vector4();
    const evVec = new THREE.Vector4();

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const parts = partsRef.current;
      const starts = startPositionsRef.current;
      const vw = Math.max(1, host.clientWidth);
      const vh = Math.max(1, host.clientHeight);

      // Smoothly interpolate mobile screen-zoom state (FS121)
      const mobile = isMobileViewport();
      if (!mobile && isScreenZoomedRef.current) {
        isScreenZoomedRef.current = false;
        targetZoomRef.current = 0;
      }
      const targetZoom = isScreenZoomedRef.current && mobile ? 1 : 0;
      targetZoomRef.current = targetZoom;
      const prevZoom = currentZoomRef.current;
      currentZoomRef.current += (targetZoom - currentZoomRef.current) * 0.22;
      if (Math.abs(targetZoom - currentZoomRef.current) < 0.0005) {
        currentZoomRef.current = targetZoom;
      }
      const zoomChanged = Math.abs(currentZoomRef.current - prevZoom) > 1e-6;

      host.setAttribute(
        'data-screen-zoomed',
        isScreenZoomedRef.current && mobile ? 'true' : 'false'
      );
      host.setAttribute('data-camera-zoom', currentZoomRef.current.toFixed(4));

      // Update camera framing for current zoom progress
      applyCameraFramingForZoom(vw, vh, currentZoomRef.current);

      // Smoothly interpolate 3D console axis rotation (FS120)
      currentRotRef.current.x +=
        (targetRotRef.current.x - currentRotRef.current.x) * 0.22;
      currentRotRef.current.y +=
        (targetRotRef.current.y - currentRotRef.current.y) * 0.22;
      if (Math.abs(targetRotRef.current.x - currentRotRef.current.x) < 0.0001) {
        currentRotRef.current.x = targetRotRef.current.x;
      }
      if (Math.abs(targetRotRef.current.y - currentRotRef.current.y) < 0.0001) {
        currentRotRef.current.y = targetRotRef.current.y;
      }
      gameBoyRoot.rotation.x = currentRotRef.current.x;
      gameBoyRoot.rotation.y = currentRotRef.current.y;
      gameBoyRoot.updateMatrixWorld(true);

      host.setAttribute('data-rotation-x', currentRotRef.current.x.toFixed(4));
      host.setAttribute('data-rotation-y', currentRotRef.current.y.toFixed(4));

      // Synchronize 1:1 screen & button projections + 3D screen homography & back-face occlusion
      const sBox = localScreenBoxRef.current;
      const screenEl = screenContRef.current;
      const controlsEl = controlsContRef.current;

      if (sBox && screenEl) {
        const liveRect = projectBoxToViewport(sBox, camera, vw, vh);
        baseScreenRectRef.current = liveRect;

        screenEl.style.left = `${liveRect.left}px`;
        screenEl.style.top = `${liveRect.top}px`;
        screenEl.style.width = `${liveRect.width}px`;
        screenEl.style.height = `${liveRect.height}px`;

        if (controlsEl) {
          const nextBtnRects: Record<string, ProjectedRect> = {};
          for (const name of interactiveNames) {
            const bBox = localButtonBoxesRef.current[name];
            if (!bBox) continue;
            nextBtnRects[name] = projectBoxToViewport(bBox, camera, vw, vh);
          }

          // When zoomed into the screen on mobile, keep the 4 D-Pad cross hit targets
          // translated together inside the lower viewport shell area so subsequent D-Pad taps
          // remain directly reachable inside the viewport without overlapping the screen.
          if (currentZoomRef.current > 0.01) {
            const crossNames = [
              'button-cross-up',
              'button-cross-down',
              'button-cross-left',
              'button-cross-right',
            ] as const;
            let cMinX = Infinity;
            let cMaxY = -Infinity;
            for (const cn of crossNames) {
              const r = nextBtnRects[cn];
              if (!r) continue;
              if (r.left < cMinX) cMinX = r.left;
              if (r.top + r.height > cMaxY) cMaxY = r.top + r.height;
            }
            const dx = cMinX < 4 ? 4 - cMinX : 0;
            const dy = cMaxY > vh - 4 ? vh - 4 - cMaxY : 0;
            if (dx !== 0 || dy !== 0) {
              for (const cn of crossNames) {
                const r = nextBtnRects[cn];
                if (!r) continue;
                nextBtnRects[cn] = {
                  left: r.left + dx,
                  top: r.top + dy,
                  width: r.width,
                  height: r.height,
                };
              }
            }
          }

          for (const name of interactiveNames) {
            const r = nextBtnRects[name];
            if (!r) continue;
            const btnEl = controlsEl.querySelector(
              `[data-part="${name}"]`
            ) as HTMLElement | null;
            if (btnEl) {
              btnEl.style.left = `${r.left}px`;
              btnEl.style.top = `${r.top}px`;
              btnEl.style.width = `${r.width}px`;
              btnEl.style.height = `${r.height}px`;
            }
          }
          liveButtonRectsRef.current = nextBtnRects;
          if (zoomChanged && Math.abs(targetZoom - currentZoomRef.current) === 0) {
            syncProjectedRectsToReactState(liveRect, nextBtnRects);
          }
        }

        worldCenterVec
          .set(
            (sBox.min.x + sBox.max.x) * 0.5,
            (sBox.min.y + sBox.max.y) * 0.5,
            sBox.max.z
          )
          .applyMatrix4(gameBoyRoot.matrixWorld);
        worldNormalVec
          .set(0, 0, 1)
          .applyQuaternion(gameBoyRoot.quaternion)
          .normalize();
        toCamVec.copy(camera.position).sub(worldCenterVec).normalize();

        const facingDot = worldNormalVec.dot(toCamVec);
        const isFrontVisible = facingDot > 0.08;
        host.setAttribute('data-screen-visible', isFrontVisible ? 'true' : 'false');

        if (!isFrontVisible) {
          screenEl.style.visibility = 'hidden';
          screenEl.style.opacity = '0';
          screenEl.style.pointerEvents = 'none';
          if (controlsEl) {
            controlsEl.style.visibility = 'hidden';
            controlsEl.style.pointerEvents = 'none';
          }
        } else {
          screenEl.style.visibility = 'visible';
          screenEl.style.opacity = powerOnRef.current ? '1' : '0.04';

          const normY =
            ((((currentRotRef.current.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) %
              (Math.PI * 2)) -
            Math.PI;
          const isNearZero =
            Math.abs(currentRotRef.current.x) < 0.0005 && Math.abs(normY) < 0.0005;
          const isInteractiveFront =
            powerOnRef.current &&
            !isSpinDraggingRef.current &&
            Math.abs(currentRotRef.current.x) < 0.35 &&
            Math.abs(normY) < 0.35;

          screenEl.style.pointerEvents = isInteractiveFront ? 'auto' : 'none';
          if (controlsEl) {
            controlsEl.style.visibility = isInteractiveFront ? 'visible' : 'hidden';
          }

          if (isNearZero) {
            screenEl.style.transformOrigin = '0 0';
            screenEl.style.transform = 'perspective(2000px) rotateX(0.01deg)';
          } else {
            vpMatrix.multiplyMatrices(
              camera.projectionMatrix,
              camera.matrixWorldInverse
            );
            mvpMatrix.multiplyMatrices(vpMatrix, gameBoyRoot.matrixWorld);

            p0Vec
              .set(sBox.min.x, sBox.max.y, sBox.max.z, 1)
              .applyMatrix4(mvpMatrix);
            euVec
              .set((sBox.max.x - sBox.min.x) / liveRect.width, 0, 0, 0)
              .applyMatrix4(mvpMatrix);
            evVec
              .set(0, (sBox.min.y - sBox.max.y) / liveRect.height, 0, 0)
              .applyMatrix4(mvpMatrix);

            const w0 = Math.abs(p0Vec.w) > 1e-6 ? p0Vec.w : 1e-6;
            const h31 = euVec.w / w0;
            const h32 = evVec.w / w0;
            const raw11 = (0.5 * vw * (euVec.x + euVec.w)) / w0;
            const raw12 = (0.5 * vw * (evVec.x + evVec.w)) / w0;
            const raw13 = (0.5 * vw * (p0Vec.x + p0Vec.w)) / w0;
            const raw21 = (0.5 * vh * (-euVec.y + euVec.w)) / w0;
            const raw22 = (0.5 * vh * (-evVec.y + evVec.w)) / w0;
            const raw23 = (0.5 * vh * (-p0Vec.y + p0Vec.w)) / w0;

            const h11 = raw11 - liveRect.left * h31;
            const h12 = raw12 - liveRect.left * h32;
            const h13 = raw13 - liveRect.left;
            const h21 = raw21 - liveRect.top * h31;
            const h22 = raw22 - liveRect.top * h32;
            const h23 = raw23 - liveRect.top;

            screenEl.style.transformOrigin = '0 0';
            screenEl.style.transform = `matrix3d(${h11},${h21},0,${h31},${h12},${h22},0,${h32},0,0,1,0,${h13},${h23},0,1)`;
          }
        }
      }

      // Smoothly animate 3D button depressions (A, B, Start, Select)
      for (const btnName of ['button-a', 'button-b', 'button-select', 'button-start'] as const) {
        const mesh = parts[btnName];
        const sPos = starts[btnName];
        if (mesh && sPos) {
          const targetZ = sPos.z - (targetBtnOffsetRef.current[btnName] || 0);
          mesh.position.z += (targetZ - mesh.position.z) * 0.35;
        }
      }

      // Smoothly animate 3D D-Pad tilt
      const cg = crossGroupRef.current;
      if (cg) {
        cg.rotation.x += (targetCrossRotRef.current.x - cg.rotation.x) * 0.35;
        cg.rotation.y += (targetCrossRotRef.current.y - cg.rotation.y) * 0.35;
      }

      // Smoothly animate Power switch & LED indicator
      const pBtn = parts['power-button'];
      const pStart = starts['power-button'];
      if (pBtn && pStart) {
        const targetX = pStart.x + (powerOnRef.current ? 0.114 : 0);
        pBtn.position.x += (targetX - pBtn.position.x) * 0.25;
      }
      if (powerIndicatorUniforms) {
        const targetMix = powerOnRef.current ? 1.0 : 0.0;
        powerIndicatorUniforms.uMixPercent.value +=
          (targetMix - powerIndicatorUniforms.uMixPercent.value) * 0.25;
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      host.removeEventListener('pointerdown', onHostPointerDown);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('resize', updateLayoutAndProjections);
      ro?.disconnect();
      renderer.dispose();
    };
  }, [
    isMobileViewport,
    requestMotionPermissionIfNeeded,
    triggerA,
    triggerB,
    triggerDpad,
    triggerSelect,
    triggerStart,
  ]);

  if (fatalError) {
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#1a0000',
          color: '#ff4d4d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'monospace',
          fontSize: 14,
          zIndex: 99999,
        }}
      >
        {fatalError}
      </div>
    );
  }

  const activeScreenRect = baseScreenRectRef.current ?? screenRect;
  const activeBtnRects =
    Object.keys(liveButtonRectsRef.current).length > 0
      ? liveButtonRectsRef.current
      : buttonRects;

  return (
    <div
      ref={hostRef}
      className="gb-shell-slot gb-3d-shell-host"
      data-rotation-x="0.0000"
      data-rotation-y="0.0000"
      data-screen-visible="true"
      data-screen-zoomed="false"
      data-camera-zoom="0.0000"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 42%, #242636 0%, #10111a 100%)',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* WebGL Canvas rendering the 15-part 3D Nintendo Game Boy (Snokke/game-boy-challenge) */}
      <canvas
        ref={canvasRef}
        data-gb-3d-canvas="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          zIndex: 1,
          cursor: 'grab',
          touchAction: 'none',
        }}
      />

      {/* Native-Color DITHER-OS Bartending Screen mounted strictly on the projected 3D `screen` mesh */}
      {activeScreenRect && (
        <div
          ref={screenContRef}
          className="gb-shell__screen-cont gb-3d-screen-projection"
          style={{
            position: 'absolute',
            left: `${activeScreenRect.left}px`,
            top: `${activeScreenRect.top}px`,
            width: `${activeScreenRect.width}px`,
            height: `${activeScreenRect.height}px`,
            margin: 0,
            padding: 0,
            background: '#0b0b0e',
            borderRadius: '2px',
            overflow: 'hidden',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            opacity: powerOn ? 1 : 0.04,
            pointerEvents: powerOn ? 'auto' : 'none',
            transformOrigin: '0 0',
            transform: 'perspective(2000px) rotateX(0.01deg)',
          }}
        >
          <div
            className="gb-shell__playfield"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              margin: 0,
              flex: '1 1 auto',
              overflow: 'hidden',
              background: '#0b0b0e',
              borderRadius: 0,
            }}
          >
            {children}
            {/* Subtle baked inner-bezel drop shadow from Snokke/game-boy-challenge (zero #96a06e tint) */}
            <img
              src="/textures/baked-screen-shadow.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                pointerEvents: 'none',
                zIndex: 90,
                opacity: 0.45,
              }}
            />
          </div>
        </div>
      )}

      {/* Projected 3D Physical Control Hit Targets (registered 1:1 with the 3D button meshes) */}
      <div
        ref={controlsContRef}
        className="gb-shell__controls"
        data-gb-3d-controls="true"
        style={{
          display: 'block',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        {activeBtnRects['button-cross-up'] && (
          <button
            type="button"
            data-part="button-cross-up"
            className="gb-shell__dpad gb-shell__dpad--up"
            aria-label="Scroll Up (D-Pad Up)"
            title="Scroll Up (D-Pad Up)"
            onClick={() => triggerDpad('up')}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-cross-up'].left}px`,
              top: `${activeBtnRects['button-cross-up'].top}px`,
              width: `${activeBtnRects['button-cross-up'].width}px`,
              height: `${activeBtnRects['button-cross-up'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-cross-down'] && (
          <button
            type="button"
            data-part="button-cross-down"
            className="gb-shell__dpad gb-shell__dpad--down"
            aria-label="Scroll Down (D-Pad Down)"
            title="Scroll Down (D-Pad Down)"
            onClick={() => triggerDpad('down')}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-cross-down'].left}px`,
              top: `${activeBtnRects['button-cross-down'].top}px`,
              width: `${activeBtnRects['button-cross-down'].width}px`,
              height: `${activeBtnRects['button-cross-down'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-cross-left'] && (
          <button
            type="button"
            data-part="button-cross-left"
            className="gb-shell__dpad gb-shell__dpad--left"
            aria-label="Scroll Left (D-Pad Left)"
            title="Scroll Left (D-Pad Left)"
            onClick={() => triggerDpad('left')}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-cross-left'].left}px`,
              top: `${activeBtnRects['button-cross-left'].top}px`,
              width: `${activeBtnRects['button-cross-left'].width}px`,
              height: `${activeBtnRects['button-cross-left'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-cross-right'] && (
          <button
            type="button"
            data-part="button-cross-right"
            className="gb-shell__dpad gb-shell__dpad--right"
            aria-label="Scroll Right (D-Pad Right)"
            title="Scroll Right (D-Pad Right)"
            onClick={() => triggerDpad('right')}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-cross-right'].left}px`,
              top: `${activeBtnRects['button-cross-right'].top}px`,
              width: `${activeBtnRects['button-cross-right'].width}px`,
              height: `${activeBtnRects['button-cross-right'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-b'] && (
          <button
            type="button"
            data-part="button-b"
            className="gb-shell__btn-b"
            aria-label="Back / Close (B Button)"
            title="Back / Close (B Button)"
            onClick={triggerB}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-b'].left}px`,
              top: `${activeBtnRects['button-b'].top}px`,
              width: `${activeBtnRects['button-b'].width}px`,
              height: `${activeBtnRects['button-b'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: '50%',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-a'] && (
          <button
            type="button"
            data-part="button-a"
            className="gb-shell__btn-a"
            aria-label="Interact / Select (A Button)"
            title="Interact / Select (A Button)"
            onClick={triggerA}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-a'].left}px`,
              top: `${activeBtnRects['button-a'].top}px`,
              width: `${activeBtnRects['button-a'].width}px`,
              height: `${activeBtnRects['button-a'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: '50%',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-select'] && (
          <button
            type="button"
            data-part="button-select"
            className="gb-shell__btn-select"
            aria-label="Options / Menu (Select Button)"
            title="Options / Menu (Select Button)"
            onClick={triggerSelect}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-select'].left}px`,
              top: `${activeBtnRects['button-select'].top}px`,
              width: `${activeBtnRects['button-select'].width}px`,
              height: `${activeBtnRects['button-select'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
        {activeBtnRects['button-start'] && (
          <button
            type="button"
            data-part="button-start"
            className="gb-shell__btn-start"
            aria-label="Start Game Immediately (Start Button)"
            title="Start Game Immediately (Start Button)"
            onClick={triggerStart}
            style={{
              position: 'absolute',
              left: `${activeBtnRects['button-start'].left}px`,
              top: `${activeBtnRects['button-start'].top}px`,
              width: `${activeBtnRects['button-start'].width}px`,
              height: `${activeBtnRects['button-start'].height}px`,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        )}
      </div>
    </div>
  );
}
