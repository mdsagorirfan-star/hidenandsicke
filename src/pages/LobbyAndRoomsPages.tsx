import {
  Check,
  Compass,
  Copy,
  Crown,
  HeadphoneOff,
  Headphones,
  Lock,
  LogOut,
  Mic,
  MicOff,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smile,
  Trophy,
  UserMinus,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GAME_MODES } from '../../shared/catalog.ts';
import { MAP_LIST, MAPS } from '../../shared/maps.ts';
import type {
  AuthUser,
  ChatMessage,
  GameMode,
  MapId,
  MatchResultSummary,
  RoomMemberInfo,
  RoomSettings,
  RoomSummary,
} from '../../shared/types.ts';
import { CharacterPreview3D } from '../components/CharacterPreview3D.tsx';
import type { VoicePeerState } from '../hooks/useSocketMultiplayer.ts';
import type { PageRoute } from './LandingPage.tsx';

const QUICK_EMOJIS = ['👋', '👀', '🏃', '🔥', '😂', '🎯', '🛡️', '👑'];

export function DashboardPage({
  user,
  rooms,
  onlineCount,
  onNavigate,
  onQuickMatch,
  onJoinRoom,
}: {
  user: AuthUser;
  rooms: RoomSummary[];
  onlineCount: number;
  onNavigate: (r: PageRoute) => void;
  onQuickMatch: (mapId?: MapId) => Promise<void>;
  onJoinRoom: (roomId: string, password?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const winRate = user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome & Character Showcase */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-[#111827] border border-white/10 rounded-2xl p-7 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-cyan-400">
              Level {user.level} Contender · {onlineCount} Players Online
            </div>
            <h1 className="font-display text-3xl font-bold text-white mt-2">
              Welcome back, {user.displayName}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Jump straight into a 3D Hide &amp; Seek arena, host a custom private lobby for friends, or track your rank across all five worlds.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Wins</div>
              <div className="font-mono-num text-2xl font-bold text-white mt-1">{user.wins}</div>
            </div>
            <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Win Rate</div>
              <div className="font-mono-num text-2xl font-bold text-cyan-400 mt-1">{winRate}%</div>
            </div>
            <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Total XP</div>
              <div className="font-mono-num text-2xl font-bold text-white mt-1">{user.xp}</div>
            </div>
            <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Coins</div>
              <div className="font-mono-num text-2xl font-bold text-amber-400 mt-1">{user.coins}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await onQuickMatch();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {busy ? 'Joining...' : 'Instant Quick Match'}
            </button>
            <button
              onClick={() => onNavigate('create_room')}
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </button>
            <button
              onClick={() => onNavigate('lobby')}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm transition-colors"
            >
              Browse All Rooms ({rooms.length})
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#111827] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold text-white">Active Loadout</span>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Customize →
            </button>
          </div>
          <CharacterPreview3D
            skinId={user.equippedSkin}
            accessoryId={user.equippedAccessory}
            role="hider"
            className="w-full h-56"
          />
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-white/10">
            <span>Favorite Map: {MAPS[user.favoriteMap]?.name || 'Modern House'}</span>
            <button onClick={() => onNavigate('profile')} className="text-cyan-400 hover:text-cyan-300">
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Live Public Arenas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-white">Open Multiplayer Rooms</h2>
          <button
            onClick={() => onNavigate('lobby')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            View Server Browser →
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.slice(0, 6).map((room) => (
            <div
              key={room.id}
              className="bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-num">{room.id}</span>
                  <span>{room.mode.toUpperCase()}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-white mt-1 flex items-center gap-2">
                  {room.hasPassword && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  {room.name}
                </h3>
                <div className="text-xs text-slate-300 mt-2">
                  Map: <span className="text-white font-medium">{MAPS[room.mapId]?.name}</span> · Host: {room.hostName}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="font-mono-num text-xs text-slate-300">
                  {room.playerCount}/{room.maxPlayers} Players · {room.phase}
                </span>
                <button
                  onClick={() => onJoinRoom(room.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LobbyPage({
  rooms,
  onJoinRoom,
  onNavigate,
}: {
  rooms: RoomSummary[];
  onJoinRoom: (roomId: string, password?: string) => Promise<void>;
  onNavigate: (r: PageRoute) => void;
}) {
  const [search, setSearch] = useState('');
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [joinCode, setJoinCode] = useState('');
  const [passwordModalRoom, setPasswordModalRoom] = useState<RoomSummary | null>(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        if (!r.isPublic && !search) return false;
        if (mapFilter !== 'all' && r.mapId !== mapFilter) return false;
        if (modeFilter !== 'all' && r.mode !== modeFilter) return false;
        if (
          search &&
          !r.name.toLowerCase().includes(search.toLowerCase()) &&
          !r.id.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [rooms, mapFilter, modeFilter, search]
  );

  const tryJoin = async (room: RoomSummary) => {
    setError(null);
    if (room.hasPassword) {
      setPasswordModalRoom(room);
      setRoomPassword('');
      return;
    }
    try {
      await onJoinRoom(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join room');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Multiplayer Room Browser</h1>
          <p className="text-sm text-slate-400 mt-1">
            Join an active Hide &amp; Seek arena or enter a private room code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('quick_match')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Quick Match
          </button>
          <button
            onClick={() => onNavigate('create_room')}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Filters & Direct Code Join */}
      <div className="bg-[#111827] border border-white/10 rounded-xl p-4 grid md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms or ID..."
            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
        <select
          value={mapFilter}
          onChange={(e) => setMapFilter(e.target.value)}
          className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
        >
          <option value="all">All Maps</option>
          {MAP_LIST.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
        >
          <option value="all">All Modes</option>
          {GAME_MODES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!joinCode.trim()) return;
            setError(null);
            try {
              await onJoinRoom(joinCode.trim().toUpperCase());
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Room not found');
            }
          }}
          className="flex gap-2"
        >
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Code e.g. HV-1A2B3C"
            className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono-num"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300"
          >
            Enter
          </button>
        </form>
      </div>

      {/* Room Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((room) => (
          <div
            key={room.id}
            className="bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono-num">{room.id}</span>
                <span>{room.mode.toUpperCase()}</span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                {room.hasPassword && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                {room.name}
              </h3>
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                <div>Arena: {MAPS[room.mapId]?.name}</div>
                <div>
                  Host: {room.hostName} · Duration: {room.settings.matchDuration}s
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="font-mono-num text-xs text-slate-300">
                {room.playerCount}/{room.maxPlayers} Players · {room.phase}
              </span>
              <button
                onClick={() => tryJoin(room)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Join Room
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full bg-[#111827] border border-white/10 rounded-xl p-8 text-center text-sm text-slate-400">
            No rooms match your current filters. Create a new room to host your own match.
          </div>
        )}
      </div>

      {passwordModalRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onJoinRoom(passwordModalRoom.id, roomPassword);
                setPasswordModalRoom(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Incorrect password');
              }
            }}
            className="w-full max-w-sm bg-[#111827] border border-white/15 rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-white">
              Enter Password for {passwordModalRoom.name}
            </h3>
            <input
              type="password"
              required
              autoFocus
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Room password..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalRoom(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Unlock &amp; Join
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function QuickMatchPage({
  onQuickMatch,
  onNavigate,
}: {
  onQuickMatch: (mapId?: MapId) => Promise<void>;
  onNavigate: (r: PageRoute) => void;
}) {
  const [selectedMap, setSelectedMap] = useState<MapId | 'any'>('any');
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Quick Matchmaker</h1>
        <p className="text-sm text-slate-400 mt-1">
          Select a preferred 3D world or match into any open arena immediately with AI bots ready to fill empty slots.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => setSelectedMap('any')}
          className={`text-left p-5 rounded-xl border transition-colors ${
            selectedMap === 'any'
              ? 'bg-cyan-500/10 border-cyan-400 text-white'
              : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <Compass className="w-5 h-5 text-cyan-400 mb-2" />
          <div className="font-display font-bold">Any Open Arena</div>
          <div className="text-xs text-slate-400 mt-1">Fastest queue across all 5 maps</div>
        </button>

        {MAP_LIST.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMap(m.id)}
            className={`text-left p-5 rounded-xl border transition-colors ${
              selectedMap === m.id
                ? 'bg-cyan-500/10 border-cyan-400 text-white'
                : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <div className="text-xs text-slate-400">{m.subtitle}</div>
            <div className="font-display font-bold mt-1">{m.name}</div>
            <div className="text-xs text-slate-400 mt-1">
              {m.bounds.width}×{m.bounds.depth}m
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onQuickMatch(selectedMap === 'any' ? undefined : selectedMap);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="px-7 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {busy ? 'Finding Arena...' : 'Find Match Now'}
        </button>
        <button
          onClick={() => onNavigate('create_room')}
          className="px-5 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold"
        >
          Configure Custom Match
        </button>
      </div>
    </div>
  );
}

export function CreateRoomPage({
  defaultName,
  onCreateRoom,
  onNavigate,
}: {
  defaultName: string;
  onCreateRoom: (settings: Partial<RoomSettings>, password?: string) => Promise<void>;
  onNavigate: (r: PageRoute) => void;
}) {
  const [name, setName] = useState(`${defaultName}'s Arena`);
  const [mapId, setMapId] = useState<MapId>('modern_house');
  const [mode, setMode] = useState<GameMode>('classic');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [matchDuration, setMatchDuration] = useState(120);
  const [hidingDuration, setHidingDuration] = useState(15);
  const [seekerCount, setSeekerCount] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [separateVoiceChannels, setSeparateVoiceChannels] = useState(true);
  const [fillWithBots, setFillWithBots] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreateRoom(
        {
          name,
          mapId,
          mode,
          maxPlayers,
          matchDuration,
          hidingDuration,
          seekerCount,
          isPublic,
          inviteOnly,
          separateVoiceChannels,
          fillWithBots,
        },
        password.trim() || undefined
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Create Custom Match Room</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure arena, ruleset, countdown timers, voice separation, and privacy.
          </p>
        </div>
        <button onClick={() => onNavigate('lobby')} className="text-xs text-slate-400 hover:text-white">
          Back to Browser
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Room Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Room Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for open entry"
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">3D Map</label>
            <select
              value={mapId}
              onChange={(e) => setMapId(e.target.value as MapId)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {MAP_LIST.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.subtitle})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Game Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {GAME_MODES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Max Players</label>
            <input
              type="number"
              min={2}
              max={16}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Seekers</label>
            <input
              type="number"
              min={1}
              max={4}
              value={seekerCount}
              onChange={(e) => setSeekerCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Hiding (sec)</label>
            <input
              type="number"
              min={5}
              max={45}
              value={hidingDuration}
              onChange={(e) => setHidingDuration(Number(e.target.value))}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Match (sec)</label>
            <input
              type="number"
              min={45}
              max={360}
              value={matchDuration}
              onChange={(e) => setMatchDuration(Number(e.target.value))}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono-num"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public room visible in server browser
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={inviteOnly} onChange={(e) => setInviteOnly(e.target.checked)} />
            Invite-only entry
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={separateVoiceChannels}
              onChange={(e) => setSeparateVoiceChannels(e.target.checked)}
            />
            Isolate Hider &amp; Seeker voice channels
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={fillWithBots} onChange={(e) => setFillWithBots(e.target.checked)} />
            Fill empty slots with AI bots (great for solo play)
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors"
        >
          {busy ? 'Creating Room...' : 'Create & Enter Room Lobby'}
        </button>
      </form>
    </div>
  );
}

export function RoomLobbyPage({
  user,
  room,
  members,
  chatMessages,
  typingUsers,
  voiceConnected,
  voiceMuted,
  voiceDeafened,
  voicePeers,
  onSetReady,
  onUpdateSettings,
  onKickPlayer,
  onStartMatch,
  onLeaveRoom,
  onSendChat,
  onSendTyping,
  onToggleVoiceJoin,
  onToggleVoiceMute,
  onToggleVoiceDeafen,
}: {
  user: AuthUser;
  room: RoomSummary;
  members: RoomMemberInfo[];
  chatMessages: ChatMessage[];
  typingUsers: string[];
  voiceConnected: boolean;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  voicePeers: VoicePeerState[];
  onSetReady: (ready: boolean) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onKickPlayer: (targetId: string) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
  onSendTyping: (typing: boolean) => void;
  onToggleVoiceJoin: () => void;
  onToggleVoiceMute: () => void;
  onToggleVoiceDeafen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [chatText, setChatText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [previewMember, setPreviewMember] = useState<RoomMemberInfo | null>(null);

  const me = members.find((m) => m.id === user.uid);
  const isHost = room.hostId === user.uid;
  const activePreview = previewMember || me;
  const map = MAPS[room.mapId];

  useEffect(() => {
    if (!chatText) {
      onSendTyping(false);
      return;
    }
    onSendTyping(true);
    const t = setTimeout(() => onSendTyping(false), 1800);
    return () => clearTimeout(t);
  }, [chatText, onSendTyping]);

  const shareUrl = `${window.location.origin}/?room=${room.id}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Room Header */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono-num text-cyan-400 font-semibold">{room.id}</span>
            <span>·</span>
            <span>{map.name}</span>
            <span>·</span>
            <span>{room.mode.toUpperCase()}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mt-1">{room.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied' : 'Copy Invite Link'}
          </button>

          <button
            onClick={() => onSetReady(!me?.ready)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              me?.ready
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {me?.ready ? 'Ready ✓' : 'Mark Ready'}
          </button>

          {isHost && (
            <button
              onClick={onStartMatch}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" />
              Start 3D Match
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-rose-600/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Character Preview & Players */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-slate-400 mb-1">3D Character Preview</div>
            <div className="font-display text-lg font-bold text-white">
              {activePreview?.displayName || user.displayName}
            </div>
            <CharacterPreview3D
              skinId={activePreview?.equippedSkin || user.equippedSkin}
              accessoryId={activePreview?.equippedAccessory || user.equippedAccessory}
              role="hider"
              className="w-full h-56 mt-2"
            />
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Players ({members.length}/{room.maxPlayers})
              </h2>
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setPreviewMember(m)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-white/10 cursor-pointer hover:border-cyan-500/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="text-xs font-semibold text-white truncate">{m.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-semibold ${
                        m.ready ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {m.ready ? 'Ready' : 'Waiting'}
                    </span>
                    {isHost && m.id !== user.uid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onKickPlayer(m.id);
                        }}
                        title="Kick player"
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Host Controls & Voice */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                Match Configuration
              </h2>
              {!isHost && <span className="text-[11px] text-slate-400">Host Controlled</span>}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Arena Map</label>
                <select
                  disabled={!isHost}
                  value={room.mapId}
                  onChange={(e) => onUpdateSettings({ mapId: e.target.value as MapId })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white disabled:opacity-60"
                >
                  {MAP_LIST.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Game Mode</label>
                <select
                  disabled={!isHost}
                  value={room.mode}
                  onChange={(e) => onUpdateSettings({ mode: e.target.value as GameMode })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white disabled:opacity-60"
                >
                  {GAME_MODES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">Hiding Phase</div>
                  <div className="font-mono-num text-sm font-bold text-white mt-0.5">
                    {room.settings.hidingDuration}s
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">Match Length</div>
                  <div className="font-mono-num text-sm font-bold text-white mt-0.5">
                    {room.settings.matchDuration}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WebRTC Voice Room */}
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                WebRTC Voice Channel
              </h2>
              <span className="text-[11px] text-slate-400">
                {room.settings.separateVoiceChannels ? 'Team Isolated' : 'Open Room'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleVoiceJoin}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                  voiceConnected
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {voiceConnected ? 'Disconnect Voice' : 'Join Room Voice'}
              </button>
              {voiceConnected && (
                <>
                  <button
                    onClick={onToggleVoiceMute}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                    title="Mute / Unmute"
                  >
                    {voiceMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  </button>
                  <button
                    onClick={onToggleVoiceDeafen}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                    title="Deafen / Undeafen"
                  >
                    {voiceDeafened ? <HeadphoneOff className="w-4 h-4 text-rose-400" /> : <Headphones className="w-4 h-4 text-cyan-400" />}
                  </button>
                </>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              {voicePeers.map((vp) => (
                <div key={vp.playerId} className="flex items-center justify-between text-slate-300">
                  <span>{vp.displayName}</span>
                  <span className="text-slate-400">{vp.muted ? 'Muted' : 'Live Mic'}</span>
                </div>
              ))}
              {voicePeers.length === 0 && (
                <div className="text-slate-500">No players connected to voice yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Lobby Chat */}
        <div className="lg:col-span-4 bg-[#111827] border border-white/10 rounded-2xl p-5 flex flex-col h-[460px]">
          <h2 className="font-display text-base font-bold text-white mb-3">Lobby Chat</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-cyan-300">{msg.senderName}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-slate-200 mt-1">{msg.text}</div>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="text-xs text-slate-500">Say hello and coordinate before the round starts.</div>
            )}
          </div>

          {typingUsers.length > 0 && (
            <div className="text-[11px] text-cyan-300 py-1">
              {typingUsers.join(', ')} typing...
            </div>
          )}

          {showEmoji && (
            <div className="flex flex-wrap gap-1.5 py-2 border-t border-white/10">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setChatText((t) => `${t}${em}`)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatText.trim()) return;
              onSendChat(chatText);
              setChatText('');
              setShowEmoji(false);
            }}
            className="mt-2 flex items-center gap-2 pt-2 border-t border-white/10"
          >
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              aria-label="Toggle emoji picker"
            >
              <Smile className="w-4 h-4" />
            </button>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Message lobby..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function GameResultsPage({
  result,
  isHost,
  onPlayAgain,
  onReturnToLobby,
  onLeaveRoom,
}: {
  result: MatchResultSummary;
  isHost: boolean;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
  onLeaveRoom: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 text-center">
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {MAPS[result.mapId]?.name} · {result.mode.toUpperCase()}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
          {result.winnerRole === 'hiders' ? 'Hiders Win the Round!' : 'Seekers Claim Victory!'}
        </h1>
        <p className="text-sm text-slate-300 mt-2">
          Duration: <span className="font-mono-num">{result.durationSeconds}s</span> · Base Rewards:{' '}
          <span className="font-mono-num text-cyan-400">+{result.xpEarned} XP</span> &amp;{' '}
          <span className="font-mono-num text-amber-400">+{result.coinsEarned} Coins</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isHost && (
            <button
              onClick={onPlayAgain}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>
          )}
          <button
            onClick={onReturnToLobby}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
          >
            Back to Room Lobby
          </button>
          <button
            onClick={onLeaveRoom}
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm"
          >
            Exit to Dashboard
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Match Scoreboard
          </h2>
          <span className="text-xs text-slate-400">Server Verified</span>
        </div>
        <div className="divide-y divide-white/10">
          {result.players.map((p, idx) => (
            <div key={p.id} className="px-6 py-3.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-mono-num text-xs text-slate-400 w-5">#{idx + 1}</span>
                <div>
                  <div className="font-semibold text-white">{p.displayName}</div>
                  <div className="text-xs text-slate-400">
                    {p.role.toUpperCase()} {p.tagged ? '· Tagged' : '· Active'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 font-mono-num text-xs">
                <span className="text-slate-300">{p.tagsCount} Tags</span>
                <span className="font-bold text-cyan-400">{p.score} PTS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
