import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { io as ioClient } from 'socket.io-client';
import {
  createNewUserRecord,
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../backend/auth.ts';
import { createRoomInternal, setupSocketServer } from '../backend/gameServer.ts';
import { buildHideverseZipBuffer } from '../backend/zipBuilder.ts';
import { COSMETICS, GAME_MODES } from '../shared/catalog.ts';
import { MAP_LIST, MAPS } from '../shared/maps.ts';
import { stepCharacterPhysics } from '../src/game-engine/physics.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

async function runTests() {
  console.log('Running HIDEVERSE automated test suite...');

  // 1. Maps & Collision Geometry Validation
  assert.equal(MAP_LIST.length, 5, 'Expected 5 playable 3D maps');
  for (const map of MAP_LIST) {
    assert.ok(map.colliders.length >= 8, `${map.id} must have collision geometry`);
    assert.ok(map.hiderSpawns.length >= 4, `${map.id} must have hider spawns`);
    assert.ok(map.seekerSpawns.length >= 2, `${map.id} must have seeker spawns`);
    assert.ok(map.hidingSpots.length >= 4, `${map.id} must have hiding spots`);
  }

  // 2. Game Modes & Cosmetics Catalog
  assert.equal(GAME_MODES.length, 5, 'Expected 5 game modes');
  assert.ok(COSMETICS.length >= 8, 'Expected skins and accessories');

  // 3. 3D Physics Collision & Jump Simulation
  const houseMap = MAPS.modern_house;
  const pState = {
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    grounded: true,
    coyoteTimer: 0.12,
    jumpBufferTimer: 0,
  };
  const jumpRes = stepCharacterPhysics(pState, 1, 0, 6.2, true, 0.016, houseMap);
  assert.equal(jumpRes.jumped, true, 'Player should jump when jump button pressed on ground');
  assert.ok(pState.y > 0, 'Vertical position must rise after jump');

  // Simulate wall clamping at arena edge
  const edgeState = {
    x: houseMap.bounds.width,
    y: 0,
    z: houseMap.bounds.depth,
    vy: 0,
    grounded: true,
    coyoteTimer: 0.12,
    jumpBufferTimer: 0,
  };
  stepCharacterPhysics(edgeState, 1, 1, 6.2, false, 0.016, houseMap);
  assert.ok(edgeState.x <= houseMap.bounds.width / 2, 'Player X must remain inside arena bounds');
  assert.ok(edgeState.z <= houseMap.bounds.depth / 2, 'Player Z must remain inside arena bounds');

  // 4. Auth Password Hashing & HMAC Session Token Verification
  const pwHash = hashPassword('SuperSecret99!');
  assert.equal(verifyPassword('SuperSecret99!', pwHash), true);
  assert.equal(verifyPassword('WrongPass', pwHash), false);

  const token = signSessionToken('usr_test_123');
  assert.equal(verifySessionToken(token), 'usr_test_123');
  assert.equal(verifySessionToken(`${token}tampered`), null);

  const adminUser = createNewUserRecord({
    username: 'test_admin',
    email: 'jjjj91551jjjj@gmail.com',
    password: 'Password123!',
  });
  assert.equal(adminUser.role, 'admin', 'Bootstrapped admin email should receive admin role');

  // 5. Room Creation & Multiplayer Socket.IO Lifecycle
  const createdRoom = createRoomInternal({
    hostId: 'host_1',
    hostName: 'HostOne',
    settings: { mapId: 'city', mode: 'classic', maxPlayers: 8, hidingDuration: 5, matchDuration: 45 },
    password: 'secret',
  });
  assert.equal(createdRoom.settings.hasPassword, true);
  assert.equal(createdRoom.settings.mapId, 'city');

  const srv = http.createServer();
  const io = setupSocketServer(srv);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
  const addr = srv.address();
  assert.ok(addr && typeof addr === 'object');
  const port = addr.port;

  const clientA = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
  const clientB = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((r) => clientA.on('connect', () => r())),
    new Promise<void>((r) => clientB.on('connect', () => r())),
  ]);

  const roomId = await new Promise<string>((resolve, reject) => {
    clientA.emit(
      'room:create',
      {
        user: { id: 'p_a', username: 'alpha', displayName: 'Alpha' },
        settings: { name: 'Test Arena', mapId: 'jungle', mode: 'classic', hidingDuration: 5, matchDuration: 45, fillWithBots: true },
      },
      (res: { ok: boolean; roomId?: string; error?: string }) => {
        if (res.ok && res.roomId) resolve(res.roomId);
        else reject(new Error(res.error));
      }
    );
  });

  await new Promise<void>((resolve, reject) => {
    clientA.emit(
      'room:join',
      { roomId, user: { id: 'p_a', username: 'alpha', displayName: 'Alpha' } },
      (res: { ok: boolean; error?: string }) => (res.ok ? resolve() : reject(new Error(res.error)))
    );
  });

  await new Promise<void>((resolve, reject) => {
    clientB.emit(
      'room:join',
      { roomId, user: { id: 'p_b', username: 'bravo', displayName: 'Bravo' } },
      (res: { ok: boolean; error?: string }) => (res.ok ? resolve() : reject(new Error(res.error)))
    );
  });

  const matchSnap = await new Promise<{ phase: string; players: unknown[] }>((resolve) => {
    clientA.once('match:state', (snap) => resolve(snap));
    clientA.emit('match:start');
  });

  assert.equal(matchSnap.phase, 'hiding', 'Started match must enter hiding countdown phase');
  assert.ok(matchSnap.players.length >= 2, 'Started match must synchronize players');

  clientA.disconnect();
  clientB.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  srv.close();

  // 6. Downloadable ZIP Export Integrity
  const zipBuf = await buildHideverseZipBuffer(ROOT_DIR);
  assert.ok(zipBuf.byteLength > 10_000, 'Exported ZIP buffer must be non-empty');
  const loadedZip = await JSZip.loadAsync(zipBuf);
  assert.ok(loadedZip.file('hideverse/README.md'), 'ZIP must contain hideverse/README.md');
  assert.ok(loadedZip.file('hideverse/docker-compose.yml'), 'ZIP must contain hideverse/docker-compose.yml');
  assert.ok(loadedZip.file('hideverse/database/schema.sql'), 'ZIP must contain hideverse/database/schema.sql');
  assert.ok(loadedZip.file('hideverse/prisma/schema.prisma'), 'ZIP must contain hideverse/prisma/schema.prisma');
  assert.ok(loadedZip.file('hideverse/frontend/src/App.tsx'), 'ZIP must contain hideverse/frontend/src/App.tsx');

  console.log('ALL HIDEVERSE TESTS PASSED.');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST FAILURE:', err);
    process.exit(1);
  });
