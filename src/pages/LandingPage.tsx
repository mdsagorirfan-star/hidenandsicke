import { ArrowRight, Compass, Download, Shield, Trophy, Users, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { GAME_MODES } from '../../shared/catalog.ts';
import { MAP_LIST } from '../../shared/maps.ts';
import type { MapId, RoomSummary } from '../../shared/types.ts';

export type PageRoute =
  | 'landing'
  | 'register'
  | 'login'
  | 'dashboard'
  | 'lobby'
  | 'quick_match'
  | 'create_room'
  | 'room_lobby'
  | 'gameplay'
  | 'results'
  | 'friends'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'leaderboard'
  | 'rewards'
  | 'inventory'
  | 'settings'
  | 'admin'
  | 'not_found';

interface LandingPageProps {
  onlineCount: number;
  activeRooms: RoomSummary[];
  onNavigate: (route: PageRoute) => void;
  onQuickPlayMap: (mapId: MapId) => void;
}

export function LandingPage({
  onlineCount,
  activeRooms,
  onNavigate,
  onQuickPlayMap,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100">
      {/* Top Bar Contract: 3 zones (Wordmark — 4 links — 1 primary CTA) */}
      <header className="sticky top-0 z-30 bg-[#090D16]/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            onClick={() => onNavigate('landing')}
            className="font-display text-xl font-bold tracking-wider text-white whitespace-nowrap shrink-0"
          >
            HIDEVERSE
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#how-to-play" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              How to Play
            </a>
            <a href="#modes" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Game Modes
            </a>
            <a href="#maps" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Maps
            </a>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Leaderboard
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              Play Now
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <div className="text-xs font-medium text-cyan-400 tracking-wide mb-3">
              3D Browser Multiplayer · {onlineCount} Online · {activeRooms.length} Active Rooms
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
              Outsmart Seekers Across Five Interactive 3D Worlds
            </h1>
            <p className="mt-5 text-base text-slate-300 leading-relaxed max-w-xl">
              Sprint, vault, and vanish inside real-time 3D arenas directly in your browser. Form squads, coordinate over isolated Hider and Seeker voice channels, and climb the global ranks.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('quick_match')}
                className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                Play Now
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('lobby')}
                className="px-6 py-3 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-white/10 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap"
              >
                Browse Live Rooms
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-white/10 bg-[#111827] min-h-[320px]"
          >
            <img
              src="/src/assets/images/hero_hideverse_arena_1795122758498.jpg"
              alt="HIDEVERSE 3D multiplayer arena"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs text-cyan-300 font-medium">Instant Browser Play</div>
                <div className="font-display text-lg font-bold text-white">
                  No Downloads Required · 60 FPS WebGL
                </div>
              </div>
              <button
                onClick={() => onNavigate('register')}
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold whitespace-nowrap"
              >
                Create Account
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How to Play */}
      <section id="how-to-play" className="max-w-7xl mx-auto px-6 py-16 border-b border-white/10">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            How to Play
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Every match runs on server-authoritative timers, movement bounds, and distance-verified tagging.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01. Scatter & Conceal',
              desc: 'When a round starts, Hiders receive a countdown head start to explore stairs, rooms, caves, and cover spots before Seekers unlock.',
              icon: Compass,
            },
            {
              step: '02. Coordinate in Voice',
              desc: 'Use WebRTC room voice with separate Hider and Seeker channels so your team tactics stay private during active rounds.',
              icon: Volume2,
            },
            {
              step: '03. Tag or Survive',
              desc: 'Seekers close the gap and press E or click to tag Hiders. Survive until zero to claim Hider victory XP and coins.',
              icon: Shield,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-[#111827] border border-white/10 rounded-xl p-6"
            >
              <item.icon className="w-5 h-5 text-cyan-400 mb-3" />
              <h3 className="font-display text-lg font-bold text-white">{item.step}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game Modes */}
      <section id="modes" className="max-w-7xl mx-auto px-6 py-16 border-b border-white/10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Game Modes</h2>
            <p className="mt-2 text-sm text-slate-400">
              Five server-authoritative rulesets built for solo queues, friend squads, and private tournaments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('create_room')}
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Configure Custom Match
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAME_MODES.map((m) => (
            <div
              key={m.id}
              className="bg-[#111827] border border-white/10 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">{m.tagline}</div>
                <h3 className="font-display text-lg font-bold text-white">{m.name}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{m.description}</p>
              </div>
              <button
                onClick={() => onNavigate(m.id === 'custom' ? 'create_room' : 'quick_match')}
                className="mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 text-left"
              >
                Launch Mode →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Maps */}
      <section id="maps" className="max-w-7xl mx-auto px-6 py-16 border-b border-white/10">
        <div className="mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Featured 3D Maps</h2>
          <p className="mt-2 text-sm text-slate-400">
            Five distinct playable worlds with full collision geometry, multi-level platforms, and hiding alcoves.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAP_LIST.map((map) => (
            <div
              key={map.id}
              className="bg-[#111827] border border-white/10 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden">
                {map.previewImage ? (
                  <img
                    src={map.previewImage}
                    alt={map.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                    <Compass className="w-10 h-10 text-blue-400 mb-2" />
                    <div className="font-display text-lg font-bold text-white">{map.name}</div>
                    <div className="text-xs text-slate-300 mt-1">{map.subtitle}</div>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400">
                    {map.subtitle} · {map.bounds.width}×{map.bounds.depth}m Arena
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mt-1">{map.name}</h3>
                  <p className="mt-2 text-sm text-slate-300">{map.description}</p>
                </div>
                <button
                  onClick={() => onQuickPlayMap(map.id)}
                  className="mt-4 w-full py-2.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-100 text-xs font-semibold transition-colors"
                >
                  Play {map.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social & Competitive Strip */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-white/10 grid md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-white/10 rounded-xl p-7">
          <Users className="w-6 h-6 text-cyan-400 mb-3" />
          <h3 className="font-display text-xl font-bold text-white">Squad Up With Friends</h3>
          <p className="mt-2 text-sm text-slate-300">
            Search players, send friend requests, chat in real time, and join a friend's active 3D room in one click.
          </p>
          <button
            onClick={() => onNavigate('friends')}
            className="mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Open Friends Hub
          </button>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-7">
          <Trophy className="w-6 h-6 text-amber-400 mb-3" />
          <h3 className="font-display text-xl font-bold text-white">Global & Weekly Leaderboards</h3>
          <p className="mt-2 text-sm text-slate-300">
            Earn server-validated XP and coins from every match to unlock outfits, accessories, and top rankings.
          </p>
          <button
            onClick={() => onNavigate('leaderboard')}
            className="mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            View Rankings
          </button>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div>HIDEVERSE · Real-Time 3D Multiplayer Hide &amp; Seek</div>
        <div className="flex flex-wrap items-center gap-6">
          <a
            href="/api/export-zip"
            download="hideverse-complete.zip"
            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Download Complete Project ZIP
          </a>
          <button onClick={() => onNavigate('register')} className="hover:text-white">
            Sign Up
          </button>
          <button onClick={() => onNavigate('login')} className="hover:text-white">
            Login
          </button>
          <button onClick={() => onNavigate('settings')} className="hover:text-white">
            Settings
          </button>
        </div>
      </footer>
    </div>
  );
}
