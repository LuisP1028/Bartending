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

  // Refs to animate 3D parts on press/release
  const partsRef = useRef<Partial<Record<PartName, THREE.Object3D>>>({});
  const startPositionsRef = useRef<Partial<Record<PartName, THREE.Vector3>>>({});
  const crossGroupRef = useRef<THREE.Group | null>(null);
  const targetCrossRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetBtnOffsetRef = useRef<Record<string, number>>({
    'button-a': 0,
    'button-b': 0,
    'button-select': 0,
    'button-start': 0,
  });
  const powerOnRef = useRef(true);
  powerOnRef.current = powerOn;

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
      pulseCross3D(dir);
      onDpadRef.current?.(dir);
    },
    [pulseCross3D]
  );

  const triggerB = useCallback(() => {
    pulseButton3D('button-b', 0.055);
    onPressBRef.current?.();
  }, [pulseButton3D]);

  const triggerA = useCallback(() => {
    pulseButton3D('button-a', 0.055);
    onPressARef.current?.();
  }, [pulseButton3D]);

  const triggerStart = useCallback(() => {
    pulseButton3D('button-start', 0.039);
    onPressStartRef.current?.();
  }, [pulseButton3D]);

  const triggerSelect = useCallback(() => {
    pulseButton3D('button-select', 0.039);
    onPressSelectRef.current?.();
  }, [pulseButton3D]);

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

    const updateLayoutAndProjections = () => {
      if (disposed || !host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);

      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      // Frame the Game Boy so the screen AND physical control cluster (D-Pad, B, A, Start, Select)
      // fit comfortably inside any desktop or mobile viewport while maximizing screen legibility.
      const targetMinY = -1.55;
      const targetMaxY = 1.92;
      const targetCenterY = (targetMinY + targetMaxY) * 0.5; // +0.185
      const spanY = (targetMaxY - targetMinY) * 1.04; // ~3.61 units
      const spanX = 2.38; // full width of Game Boy body (2.251) + margin
      const frontZ = 0.355;

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const tanHalfVFov = Math.tan(vFovRad * 0.5);
      const tanHalfHFov = tanHalfVFov * camera.aspect;

      const distForHeight = (spanY * 0.5) / tanHalfVFov;
      const distForWidth = (spanX * 0.5) / Math.max(0.05, tanHalfHFov);
      const camDist = Math.max(distForHeight, distForWidth);

      camera.position.set(0, targetCenterY, frontZ + camDist);
      camera.lookAt(0, targetCenterY, 0);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      const parts = partsRef.current;
      if (!parts.screen) return;

      gameBoyRoot.updateMatrixWorld(true);

      const screenBox = new THREE.Box3().setFromObject(parts.screen);
      const nextScreenRect = projectBoxToViewport(screenBox, camera, w, h);
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
      const nextBtnRects: Record<string, ProjectedRect> = {};
      for (const name of interactiveNames) {
        const obj = parts[name];
        if (obj) {
          const box = new THREE.Box3().setFromObject(obj);
          nextBtnRects[name] = projectBoxToViewport(box, camera, w, h);
        }
      }
      setButtonRects(nextBtnRects);
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

    // Raycaster for direct 3D mesh clicks on the WebGL canvas
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(gameBoyRoot.children, true);
      if (hits.length === 0) return;

      const hitPart = hits[0].object.userData?.partType as PartName | undefined;
      if (!hitPart) return;

      if (hitPart === 'button-b') {
        e.preventDefault();
        triggerB();
      } else if (hitPart === 'button-a') {
        e.preventDefault();
        triggerA();
      } else if (hitPart === 'button-start') {
        e.preventDefault();
        triggerStart();
      } else if (hitPart === 'button-select') {
        e.preventDefault();
        triggerSelect();
      } else if (hitPart === 'button-cross-up') {
        e.preventDefault();
        triggerDpad('up');
      } else if (hitPart === 'button-cross-down') {
        e.preventDefault();
        triggerDpad('down');
      } else if (hitPart === 'button-cross-left') {
        e.preventDefault();
        triggerDpad('left');
      } else if (hitPart === 'button-cross-right') {
        e.preventDefault();
        triggerDpad('right');
      } else if (hitPart === 'power-button' || hitPart === 'power-button-frame') {
        e.preventDefault();
        setPowerOn((prev) => !prev);
      }
    };

    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    window.addEventListener('resize', updateLayoutAndProjections);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateLayoutAndProjections)
        : null;
    ro?.observe(host);

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const parts = partsRef.current;
      const starts = startPositionsRef.current;

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
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      window.removeEventListener('resize', updateLayoutAndProjections);
      ro?.disconnect();
      renderer.dispose();
    };
  }, [triggerA, triggerB, triggerDpad, triggerSelect, triggerStart]);

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

  return (
    <div
      ref={hostRef}
      className="gb-shell-slot gb-3d-shell-host"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 42%, #242636 0%, #10111a 100%)',
        userSelect: 'none',
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
          cursor: 'pointer',
        }}
      />

      {/* Native-Color DITHER-OS Bartending Screen mounted strictly on the projected 3D `screen` mesh */}
      {screenRect && (
        <div
          className="gb-shell__screen-cont gb-3d-screen-projection"
          style={{
            position: 'absolute',
            left: `${screenRect.left}px`,
            top: `${screenRect.top}px`,
            width: `${screenRect.width}px`,
            height: `${screenRect.height}px`,
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
            transition: 'opacity 0.18s ease-out',
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
        {buttonRects['button-cross-up'] && (
          <button
            type="button"
            className="gb-shell__dpad gb-shell__dpad--up"
            aria-label="Scroll Up (D-Pad Up)"
            title="Scroll Up (D-Pad Up)"
            onClick={() => triggerDpad('up')}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-cross-up'].left}px`,
              top: `${buttonRects['button-cross-up'].top}px`,
              width: `${buttonRects['button-cross-up'].width}px`,
              height: `${buttonRects['button-cross-up'].height}px`,
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
        {buttonRects['button-cross-down'] && (
          <button
            type="button"
            className="gb-shell__dpad gb-shell__dpad--down"
            aria-label="Scroll Down (D-Pad Down)"
            title="Scroll Down (D-Pad Down)"
            onClick={() => triggerDpad('down')}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-cross-down'].left}px`,
              top: `${buttonRects['button-cross-down'].top}px`,
              width: `${buttonRects['button-cross-down'].width}px`,
              height: `${buttonRects['button-cross-down'].height}px`,
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
        {buttonRects['button-cross-left'] && (
          <button
            type="button"
            className="gb-shell__dpad gb-shell__dpad--left"
            aria-label="Scroll Left (D-Pad Left)"
            title="Scroll Left (D-Pad Left)"
            onClick={() => triggerDpad('left')}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-cross-left'].left}px`,
              top: `${buttonRects['button-cross-left'].top}px`,
              width: `${buttonRects['button-cross-left'].width}px`,
              height: `${buttonRects['button-cross-left'].height}px`,
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
        {buttonRects['button-cross-right'] && (
          <button
            type="button"
            className="gb-shell__dpad gb-shell__dpad--right"
            aria-label="Scroll Right (D-Pad Right)"
            title="Scroll Right (D-Pad Right)"
            onClick={() => triggerDpad('right')}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-cross-right'].left}px`,
              top: `${buttonRects['button-cross-right'].top}px`,
              width: `${buttonRects['button-cross-right'].width}px`,
              height: `${buttonRects['button-cross-right'].height}px`,
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
        {buttonRects['button-b'] && (
          <button
            type="button"
            className="gb-shell__btn-b"
            aria-label="Back / Close (B Button)"
            title="Back / Close (B Button)"
            onClick={triggerB}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-b'].left}px`,
              top: `${buttonRects['button-b'].top}px`,
              width: `${buttonRects['button-b'].width}px`,
              height: `${buttonRects['button-b'].height}px`,
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
        {buttonRects['button-a'] && (
          <button
            type="button"
            className="gb-shell__btn-a"
            aria-label="Interact / Select (A Button)"
            title="Interact / Select (A Button)"
            onClick={triggerA}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-a'].left}px`,
              top: `${buttonRects['button-a'].top}px`,
              width: `${buttonRects['button-a'].width}px`,
              height: `${buttonRects['button-a'].height}px`,
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
        {buttonRects['button-select'] && (
          <button
            type="button"
            className="gb-shell__btn-select"
            aria-label="Options / Menu (Select Button)"
            title="Options / Menu (Select Button)"
            onClick={triggerSelect}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-select'].left}px`,
              top: `${buttonRects['button-select'].top}px`,
              width: `${buttonRects['button-select'].width}px`,
              height: `${buttonRects['button-select'].height}px`,
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
        {buttonRects['button-start'] && (
          <button
            type="button"
            className="gb-shell__btn-start"
            aria-label="Start Game Immediately (Start Button)"
            title="Start Game Immediately (Start Button)"
            onClick={triggerStart}
            style={{
              position: 'absolute',
              left: `${buttonRects['button-start'].left}px`,
              top: `${buttonRects['button-start'].top}px`,
              width: `${buttonRects['button-start'].width}px`,
              height: `${buttonRects['button-start'].height}px`,
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
