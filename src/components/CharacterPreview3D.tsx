import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animateCharacterRig, createCharacterRig } from '../game-engine/characterBuilder.ts';
import { detectSoftwareWebGL } from '../game-engine/HideverseEngine.ts';
import type { PlayerRole } from '../../shared/types.ts';

interface CharacterPreview3DProps {
  skinId: string;
  accessoryId: string;
  role?: PlayerRole;
  className?: string;
}

export function CharacterPreview3D({
  skinId,
  accessoryId,
  role = 'hider',
  className = 'w-full h-64',
}: CharacterPreview3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 256;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 3.6);
    camera.lookAt(0, 0.95, 0);

    const hemi = new THREE.HemisphereLight('#93C5FD', '#1E293B', 0.85);
    const key = new THREE.DirectionalLight('#FDE68A', 1.8);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight('#06B6D4', 0.9);
    rim.position.set(-3, 3, -3);
    scene.add(hemi, key, rim);

    // Subtle platform pedestal
    const pedGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.12, 24);
    const pedMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.35, metalness: 0.6 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.06;
    scene.add(ped);

    const rig = createCharacterRig(skinId, accessoryId, role, false);
    scene.add(rig.root);

    let frameId = 0;
    let destroyed = false;
    let last = performance.now();
    let elapsed = 0;

    const tick = () => {
      if (destroyed) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      rig.root.rotation.y = elapsed * 0.65;
      animateCharacterRig(rig, 'idle', elapsed, dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        frameId = window.setTimeout(tick, 90);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 256;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      rig.dispose();
      pedGeo.dispose();
      pedMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [skinId, accessoryId, role]);

  return <div ref={mountRef} className={className} />;
}
