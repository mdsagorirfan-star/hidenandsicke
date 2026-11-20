import * as THREE from 'three';
import { COSMETICS } from '../../shared/catalog.ts';
import type { PlayerAnimState, PlayerRole } from '../../shared/types.ts';
import { getContactShadowTexture } from './textures.ts';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  seekerRing: THREE.Mesh;
  contactShadow: THREE.Mesh;
  dispose: () => void;
}

export function createCharacterRig(
  skinId: string,
  accessoryId: string,
  role: PlayerRole,
  tagged = false
): CharacterRig {
  const skin = COSMETICS.find((c) => c.id === skinId) ?? COSMETICS[0];
  const isSeeker = role === 'seeker';

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: tagged ? '#475569' : skin.primaryColor,
    roughness: 0.68,
    metalness: 0.15,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: isSeeker ? '#EF4444' : skin.secondaryColor,
    roughness: 0.35,
    metalness: 0.55,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: isSeeker ? '#F59E0B' : skin.accentColor,
    emissive: isSeeker ? '#F59E0B' : skin.secondaryColor,
    emissiveIntensity: tagged ? 0.1 : 0.65,
    roughness: 0.22,
    metalness: 0.75,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: isSeeker ? '#FF3B30' : '#38BDF8',
    emissive: isSeeker ? '#FF3B30' : '#06B6D4',
    emissiveIntensity: tagged ? 0.15 : 1.1,
    roughness: 0.15,
    metalness: 0.85,
  });

  // 1. Pelvis / Belt
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.34), secondaryMat);
  pelvis.position.set(0, 0.72, 0);
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // 2. Torso Jacket (Beveled / layered silhouette)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.38), primaryMat);
  torso.position.set(0, 1.12, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // 3. Chest Core Trim Plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.41), accentMat);
  chestPlate.position.set(0, 1.16, 0.01);
  bodyGroup.add(chestPlate);

  // 4. Shoulder Pauldrons
  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.34), secondaryMat);
  pauldronL.position.set(-0.42, 1.35, 0);
  pauldronL.castShadow = true;
  const pauldronR = pauldronL.clone();
  pauldronR.position.set(0.42, 1.35, 0);
  bodyGroup.add(pauldronL, pauldronR);

  // 5. Head + Helmet + Glowing Visor
  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.44), primaryMat);
  skull.position.set(0, 0.2, 0);
  skull.castShadow = true;
  const helmetCrest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.48), secondaryMat);
  helmetCrest.position.set(0, 0.44, -0.01);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.12), visorMat);
  visor.position.set(0, 0.22, 0.2);
  head.add(skull, helmetCrest, visor);
  bodyGroup.add(head);

  // 6 & 7. Articulated Arms (Upper + Forearm)
  const makeArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.43, 1.32, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.18), primaryMat);
    upper.position.set(0, -0.18, 0);
    upper.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.19), secondaryMat);
    cuff.position.set(0, -0.44, 0);
    cuff.castShadow = true;
    pivot.add(upper, cuff);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyGroup.add(leftArm, rightArm);

  // 8 & 9. Articulated Legs (Thigh + Boot)
  const makeLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.18, 0.66, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), primaryMat);
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.3), secondaryMat);
    boot.position.set(0, -0.54, 0.04);
    boot.castShadow = true;
    pivot.add(thigh, boot);
    return pivot;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // 10. Accessory Module (Backpack / Crown / Beacon)
  if (accessoryId === 'acc_jetpack') {
    const pack = new THREE.Group();
    pack.position.set(0, 1.14, -0.26);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.18), secondaryMat);
    const thrL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10), accentMat);
    thrL.position.set(-0.12, -0.24, 0);
    const thrR = thrL.clone();
    thrR.position.set(0.12, -0.24, 0);
    pack.add(tank, thrL, thrR);
    bodyGroup.add(pack);
  } else if (accessoryId === 'acc_crown') {
    const crownMat = new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.2, metalness: 0.88 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.14, 6), crownMat);
    crown.position.set(0, 0.52, 0);
    head.add(crown);
  } else if (accessoryId === 'acc_antenna') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), secondaryMat);
    mast.position.set(-0.24, 1.54, -0.14);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), accentMat);
    tip.position.set(-0.24, 1.78, -0.14);
    bodyGroup.add(mast, tip);
  }

  // Seeker Halo Ring on floor
  const ringGeo = new THREE.RingGeometry(0.65, 0.78, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isSeeker ? '#EF4444' : '#06B6D4',
    transparent: true,
    opacity: isSeeker ? 0.72 : 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const seekerRing = new THREE.Mesh(ringGeo, ringMat);
  seekerRing.position.y = 0.03;
  root.add(seekerRing);

  // Soft radial contact shadow grounded at y = 0.015
  const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  return {
    root,
    bodyGroup,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    visorMat,
    accentMat,
    seekerRing,
    contactShadow,
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}

export function animateCharacterRig(
  rig: CharacterRig,
  anim: PlayerAnimState,
  time: number,
  dt: number
) {
  const damp = 1 - Math.exp(-14 * dt);

  let targetLArmX = 0;
  let targetRArmX = 0;
  let targetLLegX = 0;
  let targetRLegX = 0;
  let targetBodyY = 0;
  let targetBodyPitch = 0;

  if (anim === 'idle') {
    targetBodyY = Math.sin(time * 2.4) * 0.03;
    targetLArmX = Math.sin(time * 2.4) * 0.04;
    targetRArmX = -Math.sin(time * 2.4) * 0.04;
  } else if (anim === 'walk') {
    const s = Math.sin(time * 8.5);
    targetLArmX = s * 0.65;
    targetRArmX = -s * 0.65;
    targetLLegX = -s * 0.65;
    targetRLegX = s * 0.65;
    targetBodyY = Math.abs(Math.cos(time * 8.5)) * 0.06;
    targetBodyPitch = 0.06;
  } else if (anim === 'run') {
    const s = Math.sin(time * 13.5);
    targetLArmX = s * 1.05;
    targetRArmX = -s * 1.05;
    targetLLegX = -s * 1.0;
    targetRLegX = s * 1.0;
    targetBodyY = Math.abs(Math.cos(time * 13.5)) * 0.1;
    targetBodyPitch = 0.18;
  } else if (anim === 'jump' || anim === 'fall') {
    targetLArmX = -0.9;
    targetRArmX = -0.9;
    targetLLegX = 0.35;
    targetRLegX = -0.25;
    targetBodyPitch = anim === 'jump' ? -0.08 : 0.12;
  } else if (anim === 'tag') {
    targetRArmX = -1.6;
    targetLArmX = 0.4;
    targetBodyPitch = 0.25;
  }

  rig.leftArm.rotation.x += (targetLArmX - rig.leftArm.rotation.x) * damp;
  rig.rightArm.rotation.x += (targetRArmX - rig.rightArm.rotation.x) * damp;
  rig.leftLeg.rotation.x += (targetLLegX - rig.leftLeg.rotation.x) * damp;
  rig.rightLeg.rotation.x += (targetRLegX - rig.rightLeg.rotation.x) * damp;
  rig.bodyGroup.position.y += (targetBodyY - rig.bodyGroup.position.y) * damp;
  rig.bodyGroup.rotation.x += (targetBodyPitch - rig.bodyGroup.rotation.x) * damp;
}
