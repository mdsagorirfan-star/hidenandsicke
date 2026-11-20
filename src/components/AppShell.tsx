import {
  Bell,
  Download,
  Gift,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { AuthUser, RoomSummary } from '../../shared/types.ts';
import type { PageRoute } from '../pages/LandingPage.tsx';
import { LiveVoiceCoach } from './LiveVoiceCoach.tsx';

export function AppShell({
  user,
  route,
  currentRoom,
  onNavigate,
  onLogout,
  children,
}: {
  user: AuthUser;
  route: PageRoute;
  currentRoom: RoomSummary | null;
  onNavigate: (r: PageRoute) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [coachOpen, setCoachOpen] = useState(false);

  const navItems: Array<{ id: PageRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'lobby', label: 'Rooms', icon: Zap },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'messages', label: 'Chat', icon: MessageSquare },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'inventory', label: 'Locker', icon: Sparkles },
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-[#090D16]/95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="font-display text-lg font-bold tracking-wider text-white whitespace-nowrap shrink-0"
            >
              HIDEVERSE
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const active = route === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentRoom && route !== 'room_lobby' && (
              <button
                onClick={() => onNavigate('room_lobby')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold whitespace-nowrap"
              >
                Active Room: {currentRoom.id}
              </button>
            )}

            <button
              onClick={() => setCoachOpen((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                coachOpen ? 'bg-cyan-500 text-slate-950' : 'bg-[#111827] border border-white/10 text-slate-200'
              }`}
              title="Gemini Live Tactical Voice Coach"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            <a
              href="/api/export-zip"
              download="hideverse-complete.zip"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] border border-white/10 text-xs text-cyan-300 hover:border-cyan-400/50"
              title="Download Complete Project ZIP"
            >
              <Download className="w-3.5 h-3.5" />
              ZIP
            </a>

            <button
              onClick={() => onNavigate('notifications')}
              className="p-2 rounded-lg bg-[#111827] border border-white/10 text-slate-300 hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="p-2 rounded-lg bg-[#111827] border border-white/10 text-slate-300 hover:text-white"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('profile')}
              className="px-3 py-1.5 rounded-lg bg-[#111827] border border-white/10 text-xs font-semibold text-white hover:border-cyan-400/40 hidden sm:block"
            >
              {user.displayName} · Lv.{user.level}
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-[#111827] border border-white/10 text-slate-400 hover:text-rose-400"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-white/5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                route === item.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 bg-[#111827]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {coachOpen && (
        <div className="fixed bottom-5 right-5 z-50">
          <LiveVoiceCoach onClose={() => setCoachOpen(false)} />
        </div>
      )}
    </div>
  );
}
