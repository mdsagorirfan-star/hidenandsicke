import type { MapCollider, MapDefinition, Vec3 } from '../../shared/types.ts';

export interface PhysicsState {
  x: number;
  y: number;
  z: number;
  vy: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
}

const PLAYER_RADIUS = 0.45;
const PLAYER_HEIGHT = 1.85;
const GRAVITY = -26;
const JUMP_VELOCITY = 10.6;
const STEP_UP_HEIGHT = 0.62;

function aabbMinMax(c: MapCollider) {
  return {
    minX: c.x - c.w / 2,
    maxX: c.x + c.w / 2,
    minY: c.y,
    maxY: c.y + c.h,
    minZ: c.z - c.d / 2,
    maxZ: c.z + c.d / 2,
  };
}

export function stepCharacterPhysics(
  state: PhysicsState,
  moveX: number,
  moveZ: number,
  speed: number,
  jumpJustPressed: boolean,
  dt: number,
  map: MapDefinition
): { landed: boolean; jumped: boolean } {
  let jumped = false;
  let landed = false;

  if (jumpJustPressed) {
    state.jumpBufferTimer = 0.14;
  } else {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }

  if (state.grounded) {
    state.coyoteTimer = 0.12;
  } else {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
    state.vy = JUMP_VELOCITY;
    state.grounded = false;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    jumped = true;
  }

  // Horizontal movement with step-up & wall slide
  const targetX = state.x + moveX * speed * dt;
  const targetZ = state.z + moveZ * speed * dt;

  // Test X axis first
  let nextX = targetX;
  for (const col of map.colliders) {
    const b = aabbMinMax(col);
    const overlapsY = state.y + PLAYER_HEIGHT > b.minY + 0.05 && state.y < b.maxY - 0.05;
    if (!overlapsY) continue;
    if (
      nextX + PLAYER_RADIUS > b.minX &&
      nextX - PLAYER_RADIUS < b.maxX &&
      state.z + PLAYER_RADIUS > b.minZ &&
      state.z - PLAYER_RADIUS < b.maxZ
    ) {
      // Allow stepping up onto low stairs/ledges
      if (b.maxY - state.y <= STEP_UP_HEIGHT && state.grounded) {
        state.y = b.maxY;
      } else {
        if (nextX > col.x) nextX = b.maxX + PLAYER_RADIUS;
        else nextX = b.minX - PLAYER_RADIUS;
      }
    }
  }
  state.x = nextX;

  // Test Z axis
  let nextZ = targetZ;
  for (const col of map.colliders) {
    const b = aabbMinMax(col);
    const overlapsY = state.y + PLAYER_HEIGHT > b.minY + 0.05 && state.y < b.maxY - 0.05;
    if (!overlapsY) continue;
    if (
      state.x + PLAYER_RADIUS > b.minX &&
      state.x - PLAYER_RADIUS < b.maxX &&
      nextZ + PLAYER_RADIUS > b.minZ &&
      nextZ - PLAYER_RADIUS < b.maxZ
    ) {
      if (b.maxY - state.y <= STEP_UP_HEIGHT && state.grounded) {
        state.y = b.maxY;
      } else {
        if (nextZ > col.z) nextZ = b.maxZ + PLAYER_RADIUS;
        else nextZ = b.minZ - PLAYER_RADIUS;
      }
    }
  }
  state.z = nextZ;

  // Clamp to arena boundaries
  const halfW = map.bounds.width / 2 - 1.5;
  const halfD = map.bounds.depth / 2 - 1.5;
  state.x = Math.max(-halfW, Math.min(halfW, state.x));
  state.z = Math.max(-halfD, Math.min(halfD, state.z));

  // Vertical integration
  const wasGrounded = state.grounded;
  state.vy += GRAVITY * dt;
  let nextY = state.y + state.vy * dt;

  let floorY = 0;
  for (const col of map.colliders) {
    const b = aabbMinMax(col);
    const overlapsXZ =
      state.x + PLAYER_RADIUS * 0.85 > b.minX &&
      state.x - PLAYER_RADIUS * 0.85 < b.maxX &&
      state.z + PLAYER_RADIUS * 0.85 > b.minZ &&
      state.z - PLAYER_RADIUS * 0.85 < b.maxZ;
    if (!overlapsXZ) continue;

    // Landing on top of collider
    if (state.vy <= 0 && state.y >= b.maxY - 0.35 && nextY <= b.maxY) {
      if (b.maxY > floorY) floorY = b.maxY;
    }
    // Head bump ceiling
    if (state.vy > 0 && state.y + PLAYER_HEIGHT <= b.minY + 0.2 && nextY + PLAYER_HEIGHT > b.minY) {
      nextY = b.minY - PLAYER_HEIGHT;
      state.vy = 0;
    }
  }

  if (nextY <= floorY) {
    nextY = floorY;
    if (!wasGrounded && state.vy < -4) {
      landed = true;
    }
    state.vy = 0;
    state.grounded = true;
  } else {
    state.grounded = false;
  }

  state.y = nextY;
  return { landed, jumped };
}

export function raycastCameraDistance(
  origin: Vec3,
  desiredCamPos: Vec3,
  map: MapDefinition
): number {
  const dx = desiredCamPos.x - origin.x;
  const dy = desiredCamPos.y - origin.y;
  const dz = desiredCamPos.z - origin.z;
  const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (fullDist < 0.001) return fullDist;

  let bestT = 1.0;
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = origin.x + dx * t;
    const py = origin.y + dy * t;
    const pz = origin.z + dz * t;
    if (py < 0.25) {
      bestT = Math.min(bestT, t);
      break;
    }
    let hit = false;
    for (const col of map.colliders) {
      if (col.kind === 'floor' || col.kind === 'stairs') continue;
      if (
        px > col.x - col.w / 2 - 0.15 &&
        px < col.x + col.w / 2 + 0.15 &&
        py > col.y &&
        py < col.y + col.h + 0.15 &&
        pz > col.z - col.d / 2 - 0.15 &&
        pz < col.z + col.d / 2 + 0.15
      ) {
        bestT = Math.min(bestT, Math.max(0.28, (i - 1) / steps));
        hit = true;
        break;
      }
    }
    if (hit) break;
  }
  return fullDist * bestT;
}
