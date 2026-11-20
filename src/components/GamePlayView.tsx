import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  HeadphoneOff,
  Headphones,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MAPS } from '../../shared/maps.ts';
import type {
  AuthUser,
  ChatMessage,
  MatchStateSnapshot,
  QualityPreset,
  RoomSummary,
} from '../../shared/types.ts';
import { gameAudio } from '../game-engine/audio.ts';
import { HideverseEngine } from '../game-engine/HideverseEngine.ts';
import { LiveVoiceCoach } from './LiveVoiceCoach.tsx';
import { MobileControls } from './MobileControls.tsx';

interface GamePlayViewProps {
  user: AuthUser;
  room: RoomSummary;
  matchState: MatchStateSnapshot | null;
  lastTagEffect: { x: number; y: number; z: number; ts: number } | null;
  quality: QualityPreset;
  onChangeQuality: (q: QualityPreset) => void;
  sensitivity: number;
  onMoveSync: (pos: { x: number; y: number; z: number }, yaw: number, anim: 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'tag') => void;
  onAttemptTag: (targetId?: string) => void;
  onLeaveMatch: () => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  voiceConnected: boolean;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  onToggleVoiceJoin: () => void;
  onToggleVoiceMute: () => void;
  onToggleVoiceDeafen: () => void;
}

function formatTimer(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function GamePlayView({
  user,
  room,
  matchState,
  lastTagEffect,
  quality,
  onChangeQuality,
  sensitivity,
  onMoveSync,
  onAttemptTag,
  onLeaveMatch,
  chatMessages,
  onSendChat,
  voiceConnected,
  voiceMuted,
  voiceDeafened,
  onToggleVoiceJoin,
  onToggleVoiceMute,
  onToggleVoiceDeafen,
}: GamePlayViewProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HideverseEngine | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [pointerLocked, setPointerLocked] = useState(false);

  const map = MAPS[room.mapId];

  const onMoveRef = useRef(onMoveSync);
  const onTagRef = useRef(onAttemptTag);
  onMoveRef.current = onMoveSync;
  onTagRef.current = onAttemptTag;

  // Mount isolated Three.js canvas once per map/room
  useEffect(() => {
    const el = canvasMountRef.current;
    if (!el) return;

    const engine = new HideverseEngine(
      el,
      map,
      user.uid,
      user.equippedSkin,
      user.equippedAccessory,
      quality,
      {
        onMoveSync: (pos, yaw, anim) => onMoveRef.current(pos, yaw, anim),
        onAttemptTag: (tid) => onTagRef.current(tid),
        onPointerLockChange: (locked) => setPointerLocked(locked),
      }
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [map, user.uid]);

  useEffect(() => {
    engineRef.current?.applyQuality(quality);
  }, [quality]);

  useEffect(() => {
    engineRef.current?.setSensitivity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    if (matchState) {
      engineRef.current?.syncMatchState(matchState.phase, matchState.players);
    }
  }, [matchState]);

  useEffect(() => {
    if (lastTagEffect) {
      engineRef.current?.spawnBurst(lastTagEffect.x, lastTagEffect.y, lastTagEffect.z, '#F59E0B');
    }
  }, [lastTagEffect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'KeyH') setDockCollapsed((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const localPlayer = useMemo(
    () => matchState?.players.find((p) => p.id === user.uid),
    [matchState, user.uid]
  );

  const activeHidersCount = useMemo(
    () => matchState?.players.filter((p) => p.role === 'hider' && !p.tagged).length ?? 0,
    [matchState]
  );

  const isSeeker = localPlayer?.role === 'seeker';
  const phase = matchState?.phase ?? 'waiting';

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#090D16] select-none">
      {/* Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Low-Occlusion Perimeter HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
        {/* Top Row: Role + Countdown + Map */}
        <div className="flex items-start justify-between gap-4">
          {/* Top-Left: Role & Squad Status */}
          <div className="bg-[#0B1120]/90 border border-white/15 rounded-xl px-4 py-2.5 shadow-xl">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{map.name}</span>
              <span aria-hidden="true">·</span>
              <span>{room.mode.toUpperCase()}</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`font-display text-lg font-bold tracking-wide ${
                  localPlayer?.tagged
                    ? 'text-slate-400'
                    : isSeeker
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                }`}
              >
                {localPlayer?.tagged ? 'TAGGED' : isSeeker ? 'SEEKER' : 'HIDER'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="font-mono-num text-xs text-slate-200">
                {activeHidersCount} Hiders Left
              </span>
            </div>
          </div>

          {/* Top-Center: Authoritative Timer */}
          <div className="bg-[#0B1120]/90 border border-white/15 rounded-xl px-5 py-2.5 text-center shadow-xl">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {phase === 'hiding'
                ? isSeeker
                  ? 'Seekers Frozen — Waiting'
                  : 'Hiding Countdown'
                : phase === 'seeking'
                  ? 'Active Hunt'
                  : 'Match Complete'}
            </div>
            <div
              className={`font-mono-num text-2xl font-bold ${
                (matchState?.timeRemaining ?? 0) <= 10 && phase !== 'waiting'
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {formatTimer(matchState?.timeRemaining ?? 0)}
            </div>
          </div>

          {/* Top-Right: Latest Event Feed */}
          <div className="hidden sm:block w-64 bg-[#0B1120]/90 border border-white/15 rounded-xl px-3.5 py-2.5 shadow-xl">
            <div className="text-[11px] font-semibold text-slate-400 mb-1">Match Feed</div>
            <div className="space-y-1 text-xs">
              {(matchState?.events ?? []).slice(-3).map((ev) => (
                <div
                  key={ev.id}
                  className={
                    ev.tone === 'tag'
                      ? 'text-amber-300 truncate'
                      : ev.tone === 'victory'
                        ? 'text-emerald-300 font-semibold truncate'
                        : 'text-slate-300 truncate'
                  }
                >
                  {ev.text}
                </div>
              ))}
              {(matchState?.events?.length ?? 0) === 0 && (
                <div className="text-slate-500">Round initializing...</div>
              )}
            </div>
          </div>
        </div>

        {/* Center Crosshair & Seeker Frozen Banner */}
        <div className="flex flex-col items-center justify-center">
          {phase === 'hiding' && isSeeker && (
            <div className="bg-[#0B1120]/95 border border-amber-500/40 rounded-xl px-6 py-4 text-center shadow-2xl">
              <div className="font-display text-lg font-bold text-amber-400">
                Hiders Are Scattering
              </div>
              <p className="text-xs text-slate-300 mt-1">
                You will be released in <span className="font-mono-num font-bold">{matchState?.timeRemaining ?? 0}s</span>
              </p>
            </div>
          )}
          {pointerLocked && (
            <div className="w-2 h-2 rounded-full border border-white/80 bg-cyan-400/70" />
          )}
        </div>

        {/* Bottom Area: Radar, Optional Drawers, Collapsible Dock */}
        <div className="flex items-end justify-between gap-4">
          {/* Bottom-Left: Chat / Voice Coach Panels */}
          <div className="flex flex-col gap-3">
            {showCoach && <LiveVoiceCoach onClose={() => setShowCoach(false)} />}
            {showChat && (
              <div className="w-80 bg-[#0B1120]/95 border border-white/15 rounded-xl p-3 pointer-events-auto shadow-2xl">
                <div className="text-xs font-semibold text-slate-300 mb-2">Room Chat</div>
                <div className="h-36 overflow-y-auto space-y-1.5 mb-2 pr-1">
                  {chatMessages.map((m) => (
                    <div key={m.id} className="text-xs">
                      <span className="font-semibold text-cyan-300">{m.senderName}: </span>
                      <span className="text-slate-200">{m.text}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message room..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Bottom-Center: Collapsible Control Dock */}
          <div className="flex flex-col items-center pointer-events-auto mx-auto">
            <button
              onClick={() => setDockCollapsed((v) => !v)}
              className="mb-1.5 px-3 py-1 rounded-t-lg bg-[#0B1120]/95 border border-white/15 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1"
            >
              {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}
            </button>

            {!dockCollapsed && (
              <div className="bg-[#0B1120]/95 border border-white/15 rounded-xl px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2 max-w-[94vw]">
                {isSeeker && phase === 'seeking' && (
                  <button
                    onClick={() => engineRef.current?.triggerTagAction()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold whitespace-nowrap"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Tag Nearby (E)
                  </button>
                )}

                <button
                  onClick={() => {
                    const next = !sfxMuted;
                    setSfxMuted(next);
                    gameAudio.setMuted(next);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap"
                >
                  {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                  SFX
                </button>

                <button
                  onClick={onToggleVoiceJoin}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    voiceConnected
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {voiceConnected
                    ? room.settings.separateVoiceChannels
                      ? `Voice (${isSeeker ? 'Seekers' : 'Hiders'})`
                      : 'Voice On'
                    : 'Join Voice'}
                </button>

                {voiceConnected && (
                  <>
                    <button
                      onClick={onToggleVoiceMute}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title={voiceMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                      {voiceMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      onClick={onToggleVoiceDeafen}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title={voiceDeafened ? 'Undeafen' : 'Deafen'}
                    >
                      {voiceDeafened ? <HeadphoneOff className="w-3.5 h-3.5 text-rose-400" /> : <Headphones className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowCoach((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    showCoach ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  AI Coach
                </button>

                <button
                  onClick={() => setShowChat((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    showChat ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>

                <select
                  value={quality}
                  onChange={(e) => onChangeQuality(e.target.value as QualityPreset)}
                  aria-label="Graphics quality"
                  className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="high">High GFX</option>
                  <option value="medium">Med GFX</option>
                  <option value="low">Low GFX</option>
                </select>

                <button
                  onClick={onLeaveMatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-200 hover:text-white text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
            )}

            <div className="hidden md:block mt-1.5 text-[11px] text-slate-300/80 bg-[#0B1120]/75 px-3 py-0.5 rounded">
              WASD Move · Drag or Double-Click Look · Shift Sprint · Space Jump · E Tag · H Hide HUD
            </div>
          </div>

          {/* Bottom-Right: Tactical Arena Radar */}
          <div className="hidden sm:flex flex-col items-center bg-[#0B1120]/90 border border-white/15 rounded-xl p-2 shadow-xl">
            <svg width="112" height="112" viewBox="-34 -34 68 68" className="rounded-lg bg-slate-950/90">
              <rect
                x={-map.bounds.width / 2}
                y={-map.bounds.depth / 2}
                width={map.bounds.width}
                height={map.bounds.depth}
                fill="none"
                stroke="rgba(148,163,184,0.25)"
                strokeWidth="0.8"
              />
              {map.hidingSpots.map((sp, i) => (
                <circle key={i} cx={sp.x} cy={sp.z} r="1.4" fill="rgba(6,182,212,0.35)" />
              ))}
              {matchState?.players.map((p) => {
                // Seekers cannot see hidden Hiders on radar!
                if (isSeeker && p.role === 'hider' && !p.tagged) return null;
                const isSelf = p.id === user.uid;
                const fill = isSelf
                  ? '#FFFFFF'
                  : p.role === 'seeker'
                    ? '#F59E0B'
                    : p.tagged
                      ? '#64748B'
                      : '#06B6D4';
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.z}
                    r={isSelf ? 2.4 : 1.8}
                    fill={fill}
                  />
                );
              })}
            </svg>
            <span className="text-[10px] text-slate-400 mt-1">Arena Radar</span>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <MobileControls
        isSeeker={Boolean(isSeeker && phase === 'seeking')}
        onMove={(x, y, s) => engineRef.current?.setMobileInput(x, y, s)}
        onJump={() => engineRef.current?.triggerJump()}
        onTag={() => engineRef.current?.triggerTagAction()}
      />
    </div>
  );
}
