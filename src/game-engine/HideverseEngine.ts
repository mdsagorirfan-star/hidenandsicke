import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {
  MapDefinition,
  MatchPhase,
  PlayerAnimState,
  PlayerRole,
  PlayerRuntimeState,
  QualityPreset,
  Vec3,
} from '../../shared/types.ts';
import { gameAudio } from './audio.ts';
import { animateCharacterRig, createCharacterRig, type CharacterRig } from './characterBuilder.ts';
import { buildMapScene, type BuiltMapScene } from './mapBuilder.ts';
import { raycastCameraDistance, stepCharacterPhysics, type PhysicsState } from './physics.ts';

interface RemoteActor {
  rig: CharacterRig;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentYaw: number;
  targetYaw: number;
  anim: PlayerAnimState;
  role: PlayerRole;
  tagged: boolean;
  skin: string;
  accessory: string;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onMoveSync: (pos: Vec3, yaw: number, anim: PlayerAnimState) => void;
  onAttemptTag: (targetId?: string) => void;
  onPointerLockChange?: (locked: boolean) => void;
}

// Pre-allocated scratch vectors (zero GC in animation loop)
const _camOrigin = { x: 0, y: 0, z: 0 };
const _camDesired = { x: 0, y: 0, z: 0 };
const _lookTarget = new THREE.Vector3();

export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class HideverseEngine {
  private container: HTMLElement;
  private map: MapDefinition;
  private localPlayerId: string;
  private callbacks: EngineCallbacks;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremEnv: THREE.WebGLRenderTarget;
  private keyLight: THREE.DirectionalLight;
  private builtMap: BuiltMapScene;

  private localRig: CharacterRig;
  private localPhysics: PhysicsState;
  private localYaw = 0;
  private localAnim: PlayerAnimState = 'idle';
  private localRole: PlayerRole = 'hider';
  private localTagged = false;
  private matchPhase: MatchPhase = 'waiting';

  private camYaw = 0;
  private camPitch = 0.34;
  private camDistance = 7.2;
  private camPosCurrent = new THREE.Vector3(0, 6, 10);
  private shakeIntensity = 0;

  private heldKeys = new Set<string>();
  private jumpJustPressed = false;
  private joystickVec = { x: 0, y: 0 };
  private mobileSprint = false;
  private mouseSensitivity = 0.0028;
  private isDragging = false;

  private remoteActors = new Map<string, RemoteActor>();
  private particlePool: BurstParticle[] = [];

  private frameId = 0;
  private destroyed = false;
  private lastTime = performance.now();
  private lastSyncSent = 0;
  private elapsedTime = 0;

  constructor(
    container: HTMLElement,
    map: MapDefinition,
    localPlayerId: string,
    skinId: string,
    accessoryId: string,
    quality: QualityPreset,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.map = map;
    this.localPlayerId = localPlayerId;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.applyQuality(quality);
    this.renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(map.skyColor);
    this.scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmremEnv = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.pmremEnv.texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 240);

    // 3-point studio lighting rig
    const hemi = new THREE.HemisphereLight(
      map.ambientLight.sky,
      map.ambientLight.ground,
      map.ambientLight.intensity
    );
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(map.keyLight.color, map.keyLight.intensity);
    this.keyLight.position.set(map.keyLight.position.x, map.keyLight.position.y, map.keyLight.position.z);
    this.keyLight.castShadow = !this.isSoftwareGl && quality !== 'low';
    const d = Math.max(map.bounds.width, map.bounds.depth) * 0.65;
    this.keyLight.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight('#38BDF8', 0.55);
    rimLight.position.set(-20, 16, -24);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtMap = buildMapScene(map, maxAniso, quality === 'low');
    this.scene.add(this.builtMap.group);

    // Local Player Rig
    const spawn = map.hiderSpawns[0] ?? { x: 0, y: 0, z: 0 };
    this.localPhysics = {
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      vy: 0,
      grounded: true,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
    };
    this.localRig = createCharacterRig(skinId, accessoryId, 'hider', false);
    this.localRig.root.position.set(spawn.x, spawn.y, spawn.z);
    this.scene.add(this.localRig.root);

    // Pooled burst particles
    const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    for (let i = 0; i < 24; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: '#06B6D4', transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.5 });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  public applyQuality(quality: QualityPreset) {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  public setSensitivity(sens: number) {
    this.mouseSensitivity = sens;
  }

  public setMobileInput(x: number, y: number, sprint: boolean) {
    this.joystickVec.x = x;
    this.joystickVec.y = y;
    this.mobileSprint = sprint;
  }

  public triggerJump() {
    this.jumpJustPressed = true;
  }

  public triggerTagAction() {
    if (this.localRole !== 'seeker' || this.matchPhase !== 'seeking') return;
    this.localAnim = 'tag';
    this.callbacks.onAttemptTag();
  }

  public spawnBurst(x: number, y: number, z: number, color = '#F59E0B') {
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
    for (const p of this.particlePool) {
      p.mesh.visible = true;
      p.mesh.position.set(x, y + 1.0, z);
      (p.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      p.vel.set((Math.random() - 0.5) * 9, Math.random() * 6 + 2, (Math.random() - 0.5) * 9);
      p.life = 0.55;
      p.maxLife = 0.55;
    }
  }

  public syncMatchState(phase: MatchPhase, players: PlayerRuntimeState[]) {
    this.matchPhase = phase;
    const activeIds = new Set<string>();

    for (const p of players) {
      activeIds.add(p.id);
      if (p.id === this.localPlayerId) {
        const roleChanged = p.role !== this.localRole || p.tagged !== this.localTagged;
        if (roleChanged) {
          this.localRole = p.role;
          this.localTagged = p.tagged;
          this.rebuildLocalRig(p.equippedSkin, p.equippedAccessory, p.role, p.tagged);
        }
        // Snap local player if server moved them far (e.g. round start spawn teleport)
        const distSq =
          (p.x - this.localPhysics.x) ** 2 +
          (p.z - this.localPhysics.z) ** 2;
        if (distSq > 64) {
          this.localPhysics.x = p.x;
          this.localPhysics.y = p.y;
          this.localPhysics.z = p.z;
          this.localPhysics.vy = 0;
        }
        continue;
      }

      let remote = this.remoteActors.get(p.id);
      if (!remote || remote.role !== p.role || remote.tagged !== p.tagged || remote.skin !== p.equippedSkin) {
        if (remote) {
          this.scene.remove(remote.rig.root);
          remote.rig.dispose();
        }
        const rig = createCharacterRig(p.equippedSkin, p.equippedAccessory, p.role, p.tagged);
        rig.root.position.set(p.x, p.y, p.z);
        this.scene.add(rig.root);
        remote = {
          rig,
          currentPos: new THREE.Vector3(p.x, p.y, p.z),
          targetPos: new THREE.Vector3(p.x, p.y, p.z),
          currentYaw: p.yaw,
          targetYaw: p.yaw,
          anim: p.anim,
          role: p.role,
          tagged: p.tagged,
          skin: p.equippedSkin,
          accessory: p.equippedAccessory,
        };
        this.remoteActors.set(p.id, remote);
      } else {
        remote.targetPos.set(p.x, p.y, p.z);
        remote.targetYaw = p.yaw;
        remote.anim = p.anim;
      }
    }

    for (const [id, remote] of this.remoteActors.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(remote.rig.root);
        remote.rig.dispose();
        this.remoteActors.delete(id);
      }
    }
  }

  private rebuildLocalRig(skin: string, accessory: string, role: PlayerRole, tagged: boolean) {
    this.scene.remove(this.localRig.root);
    this.localRig.dispose();
    this.localRig = createCharacterRig(skin, accessory, role, tagged);
    this.localRig.root.position.set(this.localPhysics.x, this.localPhysics.y, this.localPhysics.z);
    this.scene.add(this.localRig.root);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.heldKeys.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      this.jumpJustPressed = true;
    }
    if (e.code === 'KeyE' || e.code === 'KeyF') {
      this.triggerTagAction();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onBlur = () => {
    this.heldKeys.clear();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isDragging = true;
      if (this.localRole === 'seeker' && this.matchPhase === 'seeking' && document.pointerLockElement === this.renderer.domElement) {
        this.triggerTagAction();
      }
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (!locked && !this.isDragging) return;
    this.camYaw -= e.movementX * this.mouseSensitivity;
    this.camPitch = Math.max(0.08, Math.min(1.15, this.camPitch + e.movementY * this.mouseSensitivity));
  };

  private onWheel = (e: WheelEvent) => {
    this.camDistance = Math.max(4.0, Math.min(13.5, this.camDistance + e.deltaY * 0.005));
  };

  private onPointerLockChange = () => {
    this.callbacks.onPointerLockChange?.(document.pointerLockElement === this.renderer.domElement);
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('wheel', this.onWheel, { passive: true });
    dom.addEventListener('dblclick', () => {
      if (document.pointerLockElement !== dom) {
        dom.requestPointerLock?.();
      }
    });
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (sync) {
        gl.flush();
        const poll = () => {
          if (this.destroyed) return;
          const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsedTime += dt;

      this.stepSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private stepSimulation(dt: number) {
    // Freeze seekers during hiding countdown
    const canMove = !(this.matchPhase === 'hiding' && this.localRole === 'seeker') && this.matchPhase !== 'finished';

    let inForward = 0;
    let inRight = 0;
    if (canMove) {
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) inForward += 1;
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) inForward -= 1;
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) inRight += 1;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) inRight -= 1;

      if (Math.abs(this.joystickVec.x) > 0.05 || Math.abs(this.joystickVec.y) > 0.05) {
        inRight += this.joystickVec.x;
        inForward += -this.joystickVec.y;
      }
    }

    const mag = Math.hypot(inForward, inRight);
    if (mag > 1) {
      inForward /= mag;
      inRight /= mag;
    }

    const sprinting =
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.mobileSprint) &&
      mag > 0.1;
    const baseSpeed = this.localRole === 'seeker' ? 8.2 : 7.4;
    const speed = sprinting ? baseSpeed * 1.42 : baseSpeed;

    // Camera-relative horizontal movement
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const worldMoveX = -sinY * inForward + cosY * inRight;
    const worldMoveZ = -cosY * inForward - sinY * inRight;

    const physResult = stepCharacterPhysics(
      this.localPhysics,
      worldMoveX,
      worldMoveZ,
      speed,
      canMove && this.jumpJustPressed,
      dt,
      this.map
    );
    this.jumpJustPressed = false;

    if (physResult.jumped) gameAudio.playJump();
    if (physResult.landed) gameAudio.playLand();

    if (mag > 0.1 && canMove) {
      const targetYaw = Math.atan2(worldMoveX, worldMoveZ);
      let diff = targetYaw - this.localYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.localYaw += diff * (1 - Math.exp(-14 * dt));
      if (this.localPhysics.grounded) {
        gameAudio.playFootstep(sprinting);
      }
    }

    if (!this.localPhysics.grounded) {
      this.localAnim = this.localPhysics.vy > 0 ? 'jump' : 'fall';
    } else if (mag > 0.1 && canMove) {
      this.localAnim = sprinting ? 'run' : 'walk';
    } else {
      this.localAnim = 'idle';
    }

    this.localRig.root.position.set(this.localPhysics.x, this.localPhysics.y, this.localPhysics.z);
    this.localRig.root.rotation.y = this.localYaw;
    animateCharacterRig(this.localRig, this.localAnim, this.elapsedTime, dt);

    // Smooth remote actor interpolation
    const interpAlpha = 1 - Math.exp(-12 * dt);
    for (const remote of this.remoteActors.values()) {
      remote.currentPos.lerp(remote.targetPos, interpAlpha);
      remote.rig.root.position.copy(remote.currentPos);
      let yawDiff = remote.targetYaw - remote.currentYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      remote.currentYaw += yawDiff * interpAlpha;
      remote.rig.root.rotation.y = remote.currentYaw;
      animateCharacterRig(remote.rig, remote.anim, this.elapsedTime, dt);
    }

    // Update map dynamic attractions
    this.builtMap.animatedUpdate(this.elapsedTime, dt);

    // Update pooled burst particles
    for (const p of this.particlePool) {
      if (p.life > 0) {
        p.life -= dt;
        p.vel.y -= 16 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    // Damped third-person camera with wall pull-in
    _camOrigin.x = this.localPhysics.x;
    _camOrigin.y = this.localPhysics.y + 1.75;
    _camOrigin.z = this.localPhysics.z;

    const horizDist = Math.cos(this.camPitch) * this.camDistance;
    const vertDist = Math.sin(this.camPitch) * this.camDistance;
    _camDesired.x = _camOrigin.x + Math.sin(this.camYaw) * horizDist;
    _camDesired.y = _camOrigin.y + vertDist;
    _camDesired.z = _camOrigin.z + Math.cos(this.camYaw) * horizDist;

    const clampedDist = raycastCameraDistance(_camOrigin, _camDesired, this.map);
    const ratio = clampedDist / Math.max(0.01, Math.hypot(_camDesired.x - _camOrigin.x, _camDesired.y - _camOrigin.y, _camDesired.z - _camOrigin.z));

    const targetCamX = _camOrigin.x + (_camDesired.x - _camOrigin.x) * ratio;
    const targetCamY = _camOrigin.y + (_camDesired.y - _camOrigin.y) * ratio;
    const targetCamZ = _camOrigin.z + (_camDesired.z - _camOrigin.z) * ratio;

    const camDamp = 1 - Math.exp(-16 * dt);
    this.camPosCurrent.x += (targetCamX - this.camPosCurrent.x) * camDamp;
    this.camPosCurrent.y += (targetCamY - this.camPosCurrent.y) * camDamp;
    this.camPosCurrent.z += (targetCamZ - this.camPosCurrent.z) * camDamp;

    this.camera.position.copy(this.camPosCurrent);
    if (this.shakeIntensity > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.exp(-10 * dt);
    }

    _lookTarget.set(_camOrigin.x, _camOrigin.y - 0.1, _camOrigin.z);
    this.camera.lookAt(_lookTarget);

    // Emit network transform sync at 20 Hz
    const nowMs = performance.now();
    if (nowMs - this.lastSyncSent >= 50) {
      this.lastSyncSent = nowMs;
      this.callbacks.onMoveSync(
        {
          x: Number(this.localPhysics.x.toFixed(2)),
          y: Number(this.localPhysics.y.toFixed(2)),
          z: Number(this.localPhysics.z.toFixed(2)),
        },
        Number(this.localYaw.toFixed(3)),
        this.localAnim
      );
    }
  }

  public dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);

    this.localRig.dispose();
    for (const r of this.remoteActors.values()) r.rig.dispose();
    this.remoteActors.clear();
    this.builtMap.dispose();
    this.pmremEnv.dispose();
    this.renderer.dispose();
  }
}
