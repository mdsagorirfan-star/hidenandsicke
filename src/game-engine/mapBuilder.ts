import * as THREE from 'three';
import type { MapCollider, MapDefinition } from '../../shared/types.ts';
import { getProceduralTexture } from './textures.ts';

export interface BuiltMapScene {
  group: THREE.Group;
  animatedUpdate: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function buildCompositeCar(col: MapCollider): THREE.Group {
  const g = new THREE.Group();
  g.position.set(col.x, col.y, col.z);
  const alongX = col.w > col.d;
  if (alongX) g.rotation.y = Math.PI / 2;

  const length = Math.max(col.w, col.d);
  const width = Math.min(col.w, col.d);

  const bodyMat = new THREE.MeshStandardMaterial({ color: col.color, roughness: 0.25, metalness: 0.65 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.12, metalness: 0.9 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.9, metalness: 0.05 });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#FEF08A', emissive: '#FDE047', emissiveIntensity: 1.4 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width, col.h * 0.55, length), bodyMat);
  chassis.position.y = col.h * 0.35;
  chassis.castShadow = true;
  chassis.receiveShadow = true;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, col.h * 0.42, length * 0.52), cabinMat);
  cabin.position.set(0, col.h * 0.78, -length * 0.04);
  cabin.castShadow = true;

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const offsets: Array<[number, number]> = [
    [-width * 0.48, length * 0.32],
    [width * 0.48, length * 0.32],
    [-width * 0.48, -length * 0.32],
    [width * 0.48, -length * 0.32],
  ];
  for (const [wx, wz] of offsets) {
    const wMesh = new THREE.Mesh(wheelGeo, tireMat);
    wMesh.position.set(wx, 0.35, wz);
    g.add(wMesh);
  }

  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), lampMat);
  headL.position.set(-width * 0.32, col.h * 0.4, length * 0.5);
  const headR = headL.clone();
  headR.position.x = width * 0.32;

  g.add(chassis, cabin, headL, headR);
  return g;
}

function buildCompositeFerrisWheel(x: number, z: number): { group: THREE.Group; wheel: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(x, 1.1, z);

  const frameMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.3, metalness: 0.7 });
  const neonRimMat = new THREE.MeshStandardMaterial({
    color: '#EC4899',
    emissive: '#EC4899',
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.5,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: '#06B6D4',
    emissive: '#0891B2',
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.4,
  });

  // A-frame support legs
  const legGeo = new THREE.CylinderGeometry(0.22, 0.32, 11.2, 10);
  const legPositions: Array<[number, number, number]> = [
    [-3.2, -1.6, 0.28],
    [3.2, -1.6, -0.28],
    [-3.2, 1.6, 0.28],
    [3.2, 1.6, -0.28],
  ];
  for (const [lx, lz, rz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(lx * 0.5, 5.2, lz);
    leg.rotation.z = rz;
    leg.castShadow = true;
    group.add(leg);
  }

  const wheel = new THREE.Group();
  wheel.position.set(0, 10.2, 0);

  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.22, 10, 32), neonRimMat);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.15, 8, 28), frameMat);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.4, 16), neonRimMat);
  hub.rotation.x = Math.PI / 2;
  wheel.add(outerRim, innerRim, hub);

  const spokeGeo = new THREE.CylinderGeometry(0.08, 0.08, 14.4, 6);
  const gondolaGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, frameMat);
    spoke.rotation.z = angle;
    wheel.add(spoke);

    const gondola = new THREE.Mesh(gondolaGeo, cabinMat);
    gondola.position.set(Math.cos(angle) * 7.2, Math.sin(angle) * 7.2, 0);
    wheel.add(gondola);
  }

  group.add(wheel);
  return { group, wheel };
}

function buildCompositeCarousel(x: number, z: number): { group: THREE.Group; spinner: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(x, 1.0, z);

  const tentMat = new THREE.MeshStandardMaterial({ color: '#BE123C', roughness: 0.65, metalness: 0.1 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#F59E0B', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.75 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.3, metalness: 0.5 });

  const spinner = new THREE.Group();
  const centerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 5.4, 14), trimMat);
  centerPole.position.y = 2.7;
  const roofCone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 16), tentMat);
  roofCone.position.y = 6.2;
  const roofRim = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 0.45, 16), trimMat);
  roofRim.position.y = 5.0;
  spinner.add(centerPole, roofCone, roofRim);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * 3.4;
    const pz = Math.sin(a) * 3.4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), pillarMat);
    pole.position.set(px, 2.4, pz);
    const steed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 1.3), i % 2 === 0 ? trimMat : pillarMat);
    steed.position.set(px, 1.5, pz);
    steed.rotation.y = -a;
    spinner.add(pole, steed);
  }

  group.add(spinner);
  return { group, spinner };
}

export function buildMapScene(map: MapDefinition, maxAnisotropy = 4, lowQuality = false): BuiltMapScene {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const animatedTasks: Array<(elapsed: number, dt: number) => void> = [];

  const groundTexKind =
    map.id === 'modern_house'
      ? 'wood_plank'
      : map.id === 'school'
        ? 'tile_floor'
        : map.id === 'city'
          ? 'asphalt'
          : map.id === 'jungle'
            ? 'grass_moss'
            : 'boardwalk';

  const floorTex = getProceduralTexture(groundTexKind, 18, 18, maxAnisotropy);

  // Extended terrain beyond playable perimeter for outdoor maps
  const groundSizeW = map.isOutdoor ? map.bounds.width * 3.2 : map.bounds.width;
  const groundSizeD = map.isOutdoor ? map.bounds.depth * 3.2 : map.bounds.depth;
  const groundGeo = new THREE.PlaneGeometry(groundSizeW, groundSizeD);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: map.id === 'jungle' ? 0.92 : 0.72,
    metalness: 0.05,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);
  disposables.push(groundGeo, groundMat);

  // Playable arena subtle floor border frame (offset +0.02y to avoid z-fighting)
  const borderGeo = new THREE.RingGeometry(
    Math.min(map.bounds.width, map.bounds.depth) * 0.495,
    Math.min(map.bounds.width, map.bounds.depth) * 0.505,
    4
  );
  borderGeo.rotateX(-Math.PI / 2);
  borderGeo.rotateY(Math.PI / 4);
  const borderMat = new THREE.MeshBasicMaterial({
    color: map.accentColor,
    transparent: true,
    opacity: 0.35,
  });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.y = 0.02;
  group.add(borderMesh);
  disposables.push(borderGeo, borderMat);

  // Build map colliders with rich architectural details
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getMat = (color: string, roughness = 0.65, metalness = 0.1) => {
    const k = `${color}_${roughness}_${metalness}`;
    let m = matCache.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      matCache.set(k, m);
      disposables.push(m);
    }
    return m;
  };

  for (const col of map.colliders) {
    if (col.kind === 'vehicle') {
      const car = buildCompositeCar(col);
      group.add(car);
      continue;
    }

    const geo = new THREE.BoxGeometry(col.w, col.h, col.d);
    const mat = getMat(col.color, col.roughness ?? 0.65, col.metalness ?? 0.1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(col.x, col.y + col.h / 2, col.z);
    mesh.castShadow = col.kind !== 'floor';
    mesh.receiveShadow = true;
    group.add(mesh);
    disposables.push(geo);

    // Architectural trim caps on structures/hide boxes for silhouette clarity
    if (col.kind === 'hide_box' || col.kind === 'structure') {
      const trimGeo = new THREE.BoxGeometry(col.w + 0.16, 0.14, col.d + 0.16);
      const trimMat = getMat('#0F172A', 0.35, 0.6);
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(col.x, col.y + col.h + 0.06, col.z);
      group.add(trim);
      disposables.push(trimGeo);
    }
  }

  // Map-specific hero landmarks & InstancedMesh foliage/props
  if (map.id === 'modern_house') {
    // Pool water surface + glowing TV screen + garden string posts
    const poolGeo = new THREE.PlaneGeometry(10, 6);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshStandardMaterial({
      color: '#06B6D4',
      emissive: '#0891B2',
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.35,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(0, 0.03, 18);
    group.add(pool);
    disposables.push(poolGeo, poolMat);

    const tvScreenGeo = new THREE.PlaneGeometry(3.6, 1.8);
    const tvScreenMat = new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#0284C7', emissiveIntensity: 0.9 });
    const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat);
    tvScreen.position.set(-13, 2.3, -16.2);
    group.add(tvScreen);
    disposables.push(tvScreenGeo, tvScreenMat);
  }

  if (map.id === 'school') {
    // Basketball hoop + glowing hallway clock
    const poleMat = getMat('#CBD5E1', 0.3, 0.75);
    const boardMat = getMat('#F8FAFC', 0.2, 0.2);
    const hoopMat = new THREE.MeshStandardMaterial({ color: '#F97316', emissive: '#EA580C', emissiveIntensity: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.4, 10), poleMat);
    pole.position.set(0, 2.2, 20);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.14), boardMat);
    board.position.set(0, 4.1, 19.4);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16), hoopMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 3.65, 18.8);
    group.add(pole, board, rim);
    disposables.push(hoopMat);
  }

  if (map.id === 'city') {
    // Streetlamps & surrounding skyline blocks (InstancedMesh for high FPS)
    const lampCount = 8;
    const postGeo = new THREE.CylinderGeometry(0.1, 0.14, 4.5, 8);
    const postMat = getMat('#1E293B', 0.3, 0.8);
    const postInst = new THREE.InstancedMesh(postGeo, postMat, lampCount);
    const bulbGeo = new THREE.SphereGeometry(0.28, 10, 10);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#FDE68A', emissive: '#F59E0B', emissiveIntensity: 1.8 });
    const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);

    const dummy = new THREE.Object3D();
    const lampCoords: Array<[number, number]> = [
      [-10, -10], [10, -10], [-10, 10], [10, 10],
      [-24, 0], [24, 0], [0, -14], [0, 14],
    ];
    lampCoords.forEach(([lx, lz], i) => {
      dummy.position.set(lx, 2.25, lz);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);
      dummy.position.set(lx, 4.6, lz);
      dummy.updateMatrix();
      bulbInst.setMatrixAt(i, dummy.matrix);
    });
    postInst.computeBoundingSphere();
    bulbInst.computeBoundingSphere();
    group.add(postInst, bulbInst);
    disposables.push(postGeo, bulbGeo, bulbMat);

    // Outer skyline silhouettes beyond playable perimeter
    if (!lowQuality) {
      const bldgCount = 24;
      const skyGeo = new THREE.BoxGeometry(1, 1, 1);
      const skyMat = getMat('#0F172A', 0.7, 0.25);
      const skyInst = new THREE.InstancedMesh(skyGeo, skyMat, bldgCount);
      for (let i = 0; i < bldgCount; i++) {
        const angle = (i / bldgCount) * Math.PI * 2;
        const rad = 46 + (i % 3) * 8;
        const h = 14 + (i % 5) * 6;
        dummy.position.set(Math.cos(angle) * rad, h / 2, Math.sin(angle) * rad);
        dummy.scale.set(8 + (i % 3) * 3, h, 8 + (i % 2) * 3);
        dummy.updateMatrix();
        skyInst.setMatrixAt(i, dummy.matrix);
      }
      skyInst.computeBoundingSphere();
      group.add(skyInst);
      disposables.push(skyGeo);
    }
  }

  if (map.id === 'jungle') {
    // Winding crystal stream under bridge + glowing cave crystals + InstancedMesh perimeter canopy
    const riverGeo = new THREE.PlaneGeometry(66, 5.8);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: '#0EA5E9',
      emissive: '#0369A1',
      emissiveIntensity: 0.4,
      roughness: 0.08,
      metalness: 0.45,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(0, 0.03, 1);
    group.add(river);
    disposables.push(riverGeo, riverMat);

    // Glowing crystals inside cave
    const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    const crystalMat = new THREE.MeshStandardMaterial({ color: '#34D399', emissive: '#10B981', emissiveIntensity: 1.3, roughness: 0.15, metalness: 0.4 });
    const crystal1 = new THREE.Mesh(crystalGeo, crystalMat);
    crystal1.position.set(17.5, 0.8, -22);
    const crystal2 = new THREE.Mesh(crystalGeo, crystalMat);
    crystal2.position.set(21.5, 0.65, -21);
    crystal2.scale.setScalar(0.75);
    group.add(crystal1, crystal2);
    disposables.push(crystalGeo, crystalMat);

    // Canopy crowns on jungle trunks + natural outer forest ring (InstancedMesh)
    const treePositions: Array<[number, number]> = [
      [-18, -20], [11, 18], [-20, 18],
    ];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = 36 + (i % 3) * 5;
      treePositions.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.6, 0.9, 6.5, 8);
    const trunkMat = getMat('#5C3A21', 0.9, 0.0);
    const crownGeo = new THREE.DodecahedronGeometry(3.4, 1);
    const crownMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.88, metalness: 0.0 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treePositions.length);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    treePositions.forEach(([tx, tz], idx) => {
      const s = 0.85 + ((idx * 37) % 30) / 100;
      dummy.position.set(tx, 3.25 * s, tz);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);
      dummy.position.set(tx, 6.8 * s, tz);
      dummy.scale.set(s * 1.1, s * 0.9, s * 1.1);
      dummy.updateMatrix();
      crownInst.setMatrixAt(idx, dummy.matrix);
      tint.setHSL(0.36 + (idx % 4) * 0.02, 0.55, 0.24 + (idx % 3) * 0.04);
      crownInst.setColorAt(idx, tint);
    });
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    group.add(trunkInst, crownInst);
    disposables.push(trunkGeo, crownGeo, crownMat);
  }

  if (map.id === 'amusement_park') {
    const ferris = buildCompositeFerrisWheel(0, -20);
    const carousel = buildCompositeCarousel(-17, -8);
    group.add(ferris.group, carousel.group);
    animatedTasks.push((_elapsed, dt) => {
      ferris.wheel.rotation.z += dt * 0.22;
      carousel.spinner.rotation.y += dt * 0.65;
    });
  }

  // Subtle glowing hiding-spot beacons on floor
  const spotGeo = new THREE.RingGeometry(0.85, 1.05, 24);
  spotGeo.rotateX(-Math.PI / 2);
  const spotMat = new THREE.MeshBasicMaterial({
    color: map.accentColor,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const spot of map.hidingSpots) {
    const m = new THREE.Mesh(spotGeo, spotMat);
    m.position.set(spot.x, spot.y + 0.03, spot.z);
    group.add(m);
  }
  disposables.push(spotGeo, spotMat);

  return {
    group,
    animatedUpdate: (elapsed, dt) => {
      for (const task of animatedTasks) task(elapsed, dt);
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
