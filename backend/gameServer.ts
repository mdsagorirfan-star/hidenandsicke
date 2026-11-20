import crypto from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { MAPS } from '../shared/maps.ts';
import type {
  ChatMessage,
  GameMode,
  MapId,
  MatchPhase,
  MatchResultSummary,
  MatchStateSnapshot,
  PlayerAnimState,
  PlayerRole,
  PlayerRuntimeState,
  RoomMemberInfo,
  RoomSettings,
  RoomSummary,
  Vec3,
} from '../shared/types.ts';
import { applyMatchRewardsToUser, enabledMaps } from './auth.ts';

interface InternalPlayer extends PlayerRuntimeState {
  socketId: string | null;
  ready: boolean;
  isHost: boolean;
  botTarget?: Vec3;
  botRetargetAt?: number;
}

interface InternalRoom {
  id: string;
  hostId: string;
  hostName: string;
  passwordHash?: string;
  settings: RoomSettings;
  phase: MatchPhase;
  timeRemaining: number;
  phaseTotalTime: number;
  winnerRole: 'hiders' | 'seekers' | null;
  players: Map<string, InternalPlayer>;
  chat: ChatMessage[];
  events: MatchStateSnapshot['events'];
  voicePeers: Map<string, { playerId: string; displayName: string; muted: boolean; deafened: boolean; role: PlayerRole }>;
  startedAtMs: number;
}

export const matchHistoryStore: MatchResultSummary[] = [];
const rooms = new Map<string, InternalRoom>();
const socketToRoom = new Map<string, { roomId: string; playerId: string }>();

function hashRoomPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function toRoomSummary(room: InternalRoom): RoomSummary {
  return {
    id: room.id,
    name: room.settings.name,
    hostId: room.hostId,
    hostName: room.hostName,
    mapId: room.settings.mapId,
    mode: room.settings.mode,
    maxPlayers: room.settings.maxPlayers,
    playerCount: room.players.size,
    phase: room.phase,
    isPublic: room.settings.isPublic,
    hasPassword: Boolean(room.passwordHash),
    inviteOnly: room.settings.inviteOnly,
    settings: room.settings,
  };
}

function toRoomMembers(room: InternalRoom): RoomMemberInfo[] {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    photoUrl: '',
    ready: p.ready,
    isHost: p.isHost,
    isBot: p.isBot,
    equippedSkin: p.equippedSkin,
    equippedAccessory: p.equippedAccessory,
    role: p.role,
    team: p.team,
    tagged: p.tagged,
    score: p.score,
    tagsCount: p.tagsCount,
  }));
}

function toMatchSnapshot(room: InternalRoom): MatchStateSnapshot {
  return {
    roomId: room.id,
    phase: room.phase,
    timeRemaining: Math.ceil(room.timeRemaining),
    phaseTotalTime: room.phaseTotalTime,
    winnerRole: room.winnerRole,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      role: p.role,
      team: p.team,
      tagged: p.tagged,
      isBot: p.isBot,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      anim: p.anim,
      equippedSkin: p.equippedSkin,
      equippedAccessory: p.equippedAccessory,
      score: p.score,
      tagsCount: p.tagsCount,
      lastTagTime: p.lastTagTime,
    })),
    events: room.events.slice(-8),
  };
}

export function getActiveRoomsList(): RoomSummary[] {
  return Array.from(rooms.values()).map(toRoomSummary);
}

export function getOnlinePlayersCount(): number {
  let count = 0;
  for (const r of rooms.values()) {
    for (const p of r.players.values()) {
      if (!p.isBot) count += 1;
    }
  }
  return Math.max(count, 1);
}

export function createRoomInternal(params: {
  hostId: string;
  hostName: string;
  hostSkin?: string;
  hostAccessory?: string;
  settings: Partial<RoomSettings>;
  password?: string;
}): InternalRoom {
  const id = `HV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const mapId: MapId = params.settings.mapId && MAPS[params.settings.mapId] && enabledMaps.has(params.settings.mapId)
    ? params.settings.mapId
    : 'modern_house';

  const settings: RoomSettings = {
    name: (params.settings.name || `${params.hostName}'s Arena`).slice(0, 48),
    mapId,
    mode: params.settings.mode || 'classic',
    maxPlayers: Math.max(2, Math.min(16, params.settings.maxPlayers || 10)),
    matchDuration: Math.max(45, Math.min(360, params.settings.matchDuration || 120)),
    hidingDuration: Math.max(5, Math.min(45, params.settings.hidingDuration || 15)),
    seekerCount: Math.max(1, Math.min(4, params.settings.seekerCount || 1)),
    isPublic: params.settings.isPublic !== false,
    inviteOnly: Boolean(params.settings.inviteOnly),
    hasPassword: Boolean(params.password),
    separateVoiceChannels: params.settings.separateVoiceChannels !== false,
    fillWithBots: params.settings.fillWithBots !== false,
  };

  const room: InternalRoom = {
    id,
    hostId: params.hostId,
    hostName: params.hostName,
    passwordHash: params.password ? hashRoomPassword(params.password) : undefined,
    settings,
    phase: 'waiting',
    timeRemaining: 0,
    phaseTotalTime: 0,
    winnerRole: null,
    players: new Map(),
    chat: [],
    events: [],
    voicePeers: new Map(),
    startedAtMs: 0,
  };

  rooms.set(id, room);
  return room;
}

// Seed 2 public rooms so the lobby browser always feels alive
createRoomInternal({
  hostId: 'seed_host_1',
  hostName: 'NovaShade',
  settings: {
    name: 'Villa Midnight Classic',
    mapId: 'modern_house',
    mode: 'classic',
    maxPlayers: 10,
    matchDuration: 120,
    hidingDuration: 15,
    isPublic: true,
    fillWithBots: true,
  },
});

createRoomInternal({
  hostId: 'seed_host_2',
  hostName: 'KairoBlitz',
  settings: {
    name: 'Starlight Park Infection',
    mapId: 'amusement_park',
    mode: 'infection',
    maxPlayers: 12,
    matchDuration: 150,
    hidingDuration: 15,
    isPublic: true,
    fillWithBots: true,
  },
});

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  function pushEvent(room: InternalRoom, text: string, tone: 'info' | 'tag' | 'victory') {
    room.events.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      timestamp: Date.now(),
      tone,
    });
    if (room.events.length > 20) room.events.shift();
  }

  function broadcastRoomLobby(room: InternalRoom) {
    io.to(room.id).emit('room:state', {
      room: toRoomSummary(room),
      members: toRoomMembers(room),
      chat: room.chat.slice(-40),
      voicePeers: Array.from(room.voicePeers.values()),
    });
    io.emit('rooms:list', getActiveRoomsList());
  }

  function assignRolesAndStart(room: InternalRoom) {
    // Remove previous bots before re-populating
    for (const [pid, p] of room.players.entries()) {
      if (p.isBot) room.players.delete(pid);
    }

    // Add AI bots if enabled and fewer than 4 players so solo/duo play is immediately action-packed
    if (room.settings.fillWithBots) {
      const botNames = ['EchoBot', 'PrismBot', 'VortexBot', 'DriftBot'];
      const botSkins = ['skin_emerald_phantom', 'skin_amber_striker', 'skin_cobalt_sentinel', 'skin_crimson_vanguard'];
      let idx = 0;
      while (room.players.size < Math.min(4, room.settings.maxPlayers) && idx < botNames.length) {
        const botId = `bot_${room.id}_${idx}`;
        room.players.set(botId, {
          id: botId,
          socketId: null,
          username: botNames[idx].toLowerCase(),
          displayName: botNames[idx],
          ready: true,
          isHost: false,
          isBot: true,
          role: 'hider',
          tagged: false,
          x: 0,
          y: 0,
          z: 0,
          yaw: 0,
          anim: 'idle',
          equippedSkin: botSkins[idx],
          equippedAccessory: idx === 0 ? 'acc_jetpack' : 'acc_none',
          score: 0,
          tagsCount: 0,
          lastTagTime: 0,
        });
        idx += 1;
      }
    }

    const map = MAPS[room.settings.mapId];
    const allPlayers = Array.from(room.players.values());
    // Shuffle order for fair role assignment
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    const seekerTarget = Math.min(room.settings.seekerCount, Math.max(1, shuffled.length - 1));

    shuffled.forEach((p, idx) => {
      p.tagged = false;
      p.score = 0;
      p.tagsCount = 0;
      p.lastTagTime = 0;
      if (idx < seekerTarget) {
        p.role = 'seeker';
        p.team = 'amber';
        const sp = map.seekerSpawns[idx % map.seekerSpawns.length];
        p.x = sp.x;
        p.y = sp.y;
        p.z = sp.z;
      } else {
        p.role = 'hider';
        p.team = room.settings.mode === 'team' && idx % 2 === 0 ? 'amber' : 'cyan';
        const sp = map.hiderSpawns[idx % map.hiderSpawns.length];
        p.x = sp.x;
        p.y = sp.y;
        p.z = sp.z;
      }
      p.yaw = 0;
      p.anim = 'idle';
    });

    room.phase = 'hiding';
    room.timeRemaining = room.settings.hidingDuration;
    room.phaseTotalTime = room.settings.hidingDuration;
    room.winnerRole = null;
    room.startedAtMs = Date.now();
    room.events = [];
    pushEvent(room, `Hiding phase started! Seekers release in ${room.settings.hidingDuration}s.`, 'info');

    broadcastRoomLobby(room);
    io.to(room.id).emit('match:state', toMatchSnapshot(room));
  }

  function finishMatch(room: InternalRoom, winnerRole: 'hiders' | 'seekers') {
    if (room.phase === 'finished') return;
    room.phase = 'finished';
    room.winnerRole = winnerRole;
    room.timeRemaining = 0;
    const durationSeconds = Math.max(10, Math.round((Date.now() - room.startedAtMs) / 1000));

    pushEvent(
      room,
      winnerRole === 'hiders' ? 'Time expired! Hiders survived and win the round!' : 'All Hiders tagged! Seekers claim victory!',
      'victory'
    );

    const playerSummaries = Array.from(room.players.values()).map((p) => {
      const isWinner =
        (winnerRole === 'hiders' && p.role === 'hider' && !p.tagged) ||
        (winnerRole === 'seekers' && p.role === 'seeker');
      const finalScore = p.score + (isWinner ? 250 : 60) + p.tagsCount * 100;
      if (!p.isBot) {
        const xp = isWinner ? 180 + p.tagsCount * 40 : 75 + p.tagsCount * 30;
        const coins = isWinner ? 110 + p.tagsCount * 20 : 40 + p.tagsCount * 15;
        applyMatchRewardsToUser(p.id, isWinner, xp, coins, durationSeconds);
      }
      return {
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        tagged: p.tagged,
        score: finalScore,
        tagsCount: p.tagsCount,
      };
    });

    const summary: MatchResultSummary = {
      matchId: `match_${Date.now()}`,
      roomId: room.id,
      roomName: room.settings.name,
      mapId: room.settings.mapId,
      mode: room.settings.mode as GameMode,
      winnerRole,
      durationSeconds,
      xpEarned: winnerRole === 'hiders' ? 180 : 160,
      coinsEarned: winnerRole === 'hiders' ? 110 : 100,
      players: playerSummaries.sort((a, b) => b.score - a.score),
      createdAt: new Date().toISOString(),
    };

    matchHistoryStore.unshift(summary);
    if (matchHistoryStore.length > 50) matchHistoryStore.pop();

    io.to(room.id).emit('match:state', toMatchSnapshot(room));
    io.to(room.id).emit('match:ended', summary);
    broadcastRoomLobby(room);
  }

  function processServerTag(room: InternalRoom, seeker: InternalPlayer, target: InternalPlayer): boolean {
    if (room.phase !== 'seeking') return false;
    if (seeker.role !== 'seeker' || target.role !== 'hider' || target.tagged) return false;
    const now = Date.now();
    if (now - seeker.lastTagTime < 850) return false;

    const dist = Math.hypot(seeker.x - target.x, seeker.y - target.y, seeker.z - target.z);
    if (dist > 3.5) return false; // Authoritative distance check

    seeker.lastTagTime = now;
    seeker.tagsCount += 1;
    seeker.score += 150;

    if (room.settings.mode === 'infection') {
      target.role = 'seeker';
      target.tagged = false;
      pushEvent(room, `${seeker.displayName} infected ${target.displayName}!`, 'tag');
    } else {
      target.tagged = true;
      pushEvent(room, `${seeker.displayName} tagged ${target.displayName}!`, 'tag');
    }

    io.to(room.id).emit('match:tag_effect', {
      x: target.x,
      y: target.y,
      z: target.z,
      seekerId: seeker.id,
      targetId: target.id,
    });

    const remainingHiders = Array.from(room.players.values()).filter(
      (p) => p.role === 'hider' && !p.tagged
    );
    if (remainingHiders.length === 0) {
      finishMatch(room, 'seekers');
    }
    return true;
  }

  function stepBots(room: InternalRoom, dt: number) {
    const map = MAPS[room.settings.mapId];
    const now = Date.now();
    const playersArr = Array.from(room.players.values());
    const hiders = playersArr.filter((p) => p.role === 'hider' && !p.tagged);

    for (const bot of playersArr) {
      if (!bot.isBot) continue;
      if (room.phase === 'hiding' && bot.role === 'seeker') {
        bot.anim = 'idle';
        continue;
      }

      if (bot.role === 'hider') {
        if (bot.tagged) {
          bot.anim = 'idle';
          continue;
        }
        if (!bot.botTarget || !bot.botRetargetAt || now > bot.botRetargetAt) {
          const spot = map.hidingSpots[Math.floor(Math.random() * map.hidingSpots.length)];
          bot.botTarget = {
            x: spot.x + (Math.random() - 0.5) * 3,
            y: spot.y,
            z: spot.z + (Math.random() - 0.5) * 3,
          };
          bot.botRetargetAt = now + 5000 + Math.random() * 4000;
        }
      } else if (bot.role === 'seeker') {
        // Seek nearest active hider
        let nearest: InternalPlayer | null = null;
        let bestD = Infinity;
        for (const h of hiders) {
          const d = Math.hypot(h.x - bot.x, h.z - bot.z);
          if (d < bestD) {
            bestD = d;
            nearest = h;
          }
        }
        if (nearest) {
          bot.botTarget = { x: nearest.x, y: nearest.y, z: nearest.z };
          if (bestD < 2.2) {
            processServerTag(room, bot, nearest);
          }
        }
      }

      if (bot.botTarget) {
        const dx = bot.botTarget.x - bot.x;
        const dz = bot.botTarget.z - bot.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.6) {
          const speed = bot.role === 'seeker' ? 6.2 : 5.6;
          const step = Math.min(dist, speed * dt);
          bot.x += (dx / dist) * step;
          bot.z += (dz / dist) * step;
          bot.yaw = Math.atan2(dx, dz);
          bot.anim = bot.role === 'seeker' ? 'run' : 'walk';
        } else {
          bot.anim = 'idle';
        }
      }
    }
  }

  // Authoritative 10 Hz server simulation & timer tick
  setInterval(() => {
    const dt = 0.1;
    for (const room of rooms.values()) {
      if (room.phase !== 'hiding' && room.phase !== 'seeking') continue;

      room.timeRemaining = Math.max(0, room.timeRemaining - dt);
      stepBots(room, dt);

      if (room.phase === 'hiding' && room.timeRemaining <= 0) {
        room.phase = 'seeking';
        room.timeRemaining = room.settings.matchDuration;
        room.phaseTotalTime = room.settings.matchDuration;
        pushEvent(room, 'Seekers released! Stay hidden!', 'info');
        io.to(room.id).emit('match:seekers_released');
      } else if (room.phase === 'seeking' && room.timeRemaining <= 0) {
        finishMatch(room, 'hiders');
        continue;
      }

      io.to(room.id).emit('match:state', toMatchSnapshot(room));
    }
  }, 100);

  io.on('connection', (socket: Socket) => {
    socket.emit('rooms:list', getActiveRoomsList());

    socket.on('room:create', (payload: { user: { id: string; username: string; displayName: string; skin?: string; accessory?: string }; settings: Partial<RoomSettings>; password?: string }, cb) => {
      const room = createRoomInternal({
        hostId: payload.user.id,
        hostName: payload.user.displayName,
        hostSkin: payload.user.skin,
        hostAccessory: payload.user.accessory,
        settings: payload.settings,
        password: payload.password,
      });
      cb?.({ ok: true, roomId: room.id, room: toRoomSummary(room) });
      io.emit('rooms:list', getActiveRoomsList());
    });

    socket.on('room:quick_match', (payload: { user: { id: string; username: string; displayName: string; skin?: string; accessory?: string }; mapId?: MapId }, cb) => {
      let target = Array.from(rooms.values()).find(
        (r) => r.settings.isPublic && !r.passwordHash && r.phase === 'waiting' && r.players.size < r.settings.maxPlayers
      );
      if (!target) {
        target = createRoomInternal({
          hostId: payload.user.id,
          hostName: payload.user.displayName,
          settings: {
            name: `${payload.user.displayName}'s Quick Arena`,
            mapId: payload.mapId || 'modern_house',
            mode: 'quick',
            isPublic: true,
            fillWithBots: true,
          },
        });
      }
      cb?.({ ok: true, roomId: target.id });
    });

    socket.on('room:join', (payload: { roomId: string; password?: string; user: { id: string; username: string; displayName: string; skin?: string; accessory?: string } }, cb) => {
      const room = rooms.get(payload.roomId);
      if (!room) return cb?.({ ok: false, error: 'Room not found' });
      if (room.passwordHash && hashRoomPassword(payload.password || '') !== room.passwordHash) {
        return cb?.({ ok: false, error: 'Incorrect room password' });
      }
      if (room.players.size >= room.settings.maxPlayers && !room.players.has(payload.user.id)) {
        return cb?.({ ok: false, error: 'Room is full' });
      }

      const prev = socketToRoom.get(socket.id);
      if (prev && prev.roomId !== room.id) {
        socket.leave(prev.roomId);
      }

      const existing = room.players.get(payload.user.id);
      const isHost = room.players.size === 0 || room.hostId === payload.user.id;
      if (isHost) {
        room.hostId = payload.user.id;
        room.hostName = payload.user.displayName;
      }

      const map = MAPS[room.settings.mapId];
      const spawn = map.hiderSpawns[room.players.size % map.hiderSpawns.length];

      room.players.set(payload.user.id, {
        id: payload.user.id,
        socketId: socket.id,
        username: payload.user.username,
        displayName: payload.user.displayName,
        ready: existing?.ready ?? isHost,
        isHost,
        isBot: false,
        role: existing?.role ?? 'hider',
        team: existing?.team ?? 'cyan',
        tagged: existing?.tagged ?? false,
        x: existing?.x ?? spawn.x,
        y: existing?.y ?? spawn.y,
        z: existing?.z ?? spawn.z,
        yaw: existing?.yaw ?? 0,
        anim: existing?.anim ?? 'idle',
        equippedSkin: payload.user.skin || 'skin_cyan_runner',
        equippedAccessory: payload.user.accessory || 'acc_none',
        score: existing?.score ?? 0,
        tagsCount: existing?.tagsCount ?? 0,
        lastTagTime: existing?.lastTagTime ?? 0,
      });

      socket.join(room.id);
      socketToRoom.set(socket.id, { roomId: room.id, playerId: payload.user.id });

      cb?.({ ok: true, room: toRoomSummary(room), match: toMatchSnapshot(room) });
      broadcastRoomLobby(room);
      if (room.phase === 'hiding' || room.phase === 'seeking') {
        socket.emit('match:state', toMatchSnapshot(room));
      }
    });

    socket.on('room:leave', () => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      socket.leave(link.roomId);
      socketToRoom.delete(socket.id);
      if (!room) return;
      room.players.delete(link.playerId);
      room.voicePeers.delete(link.playerId);

      // Transfer host if needed
      if (room.hostId === link.playerId) {
        const nextHuman = Array.from(room.players.values()).find((p) => !p.isBot);
        if (nextHuman) {
          nextHuman.isHost = true;
          room.hostId = nextHuman.id;
          room.hostName = nextHuman.displayName;
        }
      }
      broadcastRoomLobby(room);
    });

    socket.on('room:ready', (ready: boolean) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const player = room?.players.get(link.playerId);
      if (!room || !player) return;
      player.ready = Boolean(ready);
      broadcastRoomLobby(room);
    });

    socket.on('room:update_settings', (settings: Partial<RoomSettings>) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      if (!room || room.hostId !== link.playerId || room.phase !== 'waiting') return;
      room.settings = { ...room.settings, ...settings };
      broadcastRoomLobby(room);
    });

    socket.on('room:kick', (targetId: string) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      if (!room || room.hostId !== link.playerId || targetId === link.playerId) return;
      const target = room.players.get(targetId);
      if (target?.socketId) {
        io.to(target.socketId).emit('room:kicked');
        socketToRoom.delete(target.socketId);
      }
      room.players.delete(targetId);
      room.voicePeers.delete(targetId);
      broadcastRoomLobby(room);
    });

    socket.on('match:start', () => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      if (!room || room.hostId !== link.playerId) return;
      assignRolesAndStart(room);
    });

    socket.on('match:reset_lobby', () => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      if (!room || room.hostId !== link.playerId) return;
      room.phase = 'waiting';
      room.winnerRole = null;
      for (const [pid, p] of room.players.entries()) {
        if (p.isBot) room.players.delete(pid);
        else {
          p.tagged = false;
          p.role = 'hider';
        }
      }
      broadcastRoomLobby(room);
    });

    socket.on('player:move', (payload: { pos: Vec3; yaw: number; anim: PlayerAnimState }) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const player = room?.players.get(link.playerId);
      if (!room || !player) return;

      // Authoritative bounds clamping & frozen seeker check
      if (room.phase === 'hiding' && player.role === 'seeker') return;
      const map = MAPS[room.settings.mapId];
      const hw = map.bounds.width / 2 - 1;
      const hd = map.bounds.depth / 2 - 1;
      player.x = Math.max(-hw, Math.min(hw, Number(payload.pos.x) || 0));
      player.y = Math.max(0, Math.min(14, Number(payload.pos.y) || 0));
      player.z = Math.max(-hd, Math.min(hd, Number(payload.pos.z) || 0));
      player.yaw = Number(payload.yaw) || 0;
      player.anim = payload.anim || 'idle';
    });

    socket.on('player:tag_attempt', (targetId?: string) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const seeker = room?.players.get(link.playerId);
      if (!room || !seeker || seeker.role !== 'seeker' || room.phase !== 'seeking') return;

      if (targetId) {
        const target = room.players.get(targetId);
        if (target) processServerTag(room, seeker, target);
        return;
      }

      // Find nearest hider in tag reach
      for (const candidate of room.players.values()) {
        if (candidate.id === seeker.id || candidate.role !== 'hider' || candidate.tagged) continue;
        if (processServerTag(room, seeker, candidate)) break;
      }
    });

    // Room text chat & typing indicators
    socket.on('chat:send', (text: string) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const player = room?.players.get(link.playerId);
      if (!room || !player) return;
      const clean = String(text || '').trim().slice(0, 400);
      if (!clean) return;
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channelId: room.id,
        senderId: player.id,
        senderName: player.displayName,
        text: clean,
        timestamp: new Date().toISOString(),
      };
      room.chat.push(msg);
      if (room.chat.length > 80) room.chat.shift();
      io.to(room.id).emit('chat:message', msg);
    });

    socket.on('chat:typing', (isTyping: boolean) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const player = room?.players.get(link.playerId);
      if (!room || !player) return;
      socket.to(room.id).emit('chat:typing', { playerId: player.id, displayName: player.displayName, isTyping });
    });

    // WebRTC Voice Signaling with Hider/Seeker channel isolation
    socket.on('voice:join', (state: { muted: boolean; deafened: boolean }) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const player = room?.players.get(link.playerId);
      if (!room || !player) return;
      room.voicePeers.set(player.id, {
        playerId: player.id,
        displayName: player.displayName,
        muted: state.muted,
        deafened: state.deafened,
        role: player.role,
      });
      broadcastRoomLobby(room);
    });

    socket.on('voice:leave', () => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      if (!room) return;
      room.voicePeers.delete(link.playerId);
      broadcastRoomLobby(room);
    });

    socket.on('voice:mute', (state: { muted: boolean; deafened: boolean }) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const vp = room?.voicePeers.get(link.playerId);
      if (!room || !vp) return;
      vp.muted = state.muted;
      vp.deafened = state.deafened;
      broadcastRoomLobby(room);
    });

    const relayWebRTC = (eventName: string, payload: { targetPlayerId: string; data: unknown }) => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      const sender = room?.players.get(link.playerId);
      const target = room?.players.get(payload.targetPlayerId);
      if (!room || !sender || !target || !target.socketId) return;

      // Enforce separate voice channels for Hiders vs Seekers during active rounds
      if (
        room.settings.separateVoiceChannels &&
        (room.phase === 'hiding' || room.phase === 'seeking') &&
        sender.role !== target.role
      ) {
        return;
      }

      io.to(target.socketId).emit(eventName, {
        fromPlayerId: sender.id,
        data: payload.data,
      });
    };

    socket.on('webrtc:offer', (p) => relayWebRTC('webrtc:offer', p));
    socket.on('webrtc:answer', (p) => relayWebRTC('webrtc:answer', p));
    socket.on('webrtc:ice', (p) => relayWebRTC('webrtc:ice', p));

    socket.on('disconnect', () => {
      const link = socketToRoom.get(socket.id);
      if (!link) return;
      const room = rooms.get(link.roomId);
      socketToRoom.delete(socket.id);
      if (!room) return;
      room.players.delete(link.playerId);
      room.voicePeers.delete(link.playerId);
      if (room.hostId === link.playerId) {
        const nextHuman = Array.from(room.players.values()).find((p) => !p.isBot);
        if (nextHuman) {
          nextHuman.isHost = true;
          room.hostId = nextHuman.id;
          room.hostName = nextHuman.displayName;
        }
      }
      broadcastRoomLobby(room);
    });
  });

  return io;
}
