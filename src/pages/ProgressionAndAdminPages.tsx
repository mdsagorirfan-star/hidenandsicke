import {
  Award,
  Check,
  Coins,
  Download,
  Gift,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, COSMETICS, DAILY_MISSIONS } from '../../shared/catalog.ts';
import { MAP_LIST, MAPS } from '../../shared/maps.ts';
import type { AuthUser, MapId, MatchResultSummary, QualityPreset } from '../../shared/types.ts';
import { CharacterPreview3D } from '../components/CharacterPreview3D.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { PageRoute } from './LandingPage.tsx';

interface LeaderboardRow {
  uid: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  equippedSkin: string;
}

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResultSummary[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setRows(data.leaderboard || []);
        setRecentMatches(data.recentMatches || []);
      }
    };
    void load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Global Hideverse Leaderboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rankings computed from server-verified match results and XP progression.
        </p>
      </div>

      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Player</th>
                <th className="px-5 py-3">Level</th>
                <th className="px-5 py-3">Wins</th>
                <th className="px-5 py-3">Win Rate</th>
                <th className="px-5 py-3 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r, i) => (
                <tr key={r.uid} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-mono-num text-xs font-bold text-cyan-400">#{i + 1}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white">{r.displayName}</div>
                    <div className="text-xs text-slate-400">@{r.username}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono-num text-slate-200">{r.level}</td>
                  <td className="px-5 py-3.5 font-mono-num text-emerald-400">{r.wins}</td>
                  <td className="px-5 py-3.5 font-mono-num text-slate-300">{r.winRate}%</td>
                  <td className="px-5 py-3.5 font-mono-num text-right font-bold text-white">{r.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-white">Recent Completed Matches</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {recentMatches.map((m) => (
              <div key={m.matchId} className="bg-[#111827] border border-white/10 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{MAPS[m.mapId]?.name}</span>
                  <span>{m.durationSeconds}s</span>
                </div>
                <div className="font-display text-base font-bold text-white mt-1">
                  {m.roomName} — {m.winnerRole === 'hiders' ? 'Hiders Won' : 'Seekers Won'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RewardsPage({ user }: { user: AuthUser }) {
  const { claimMission } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  const xpInLevel = user.xp % 250;
  const pct = Math.round((xpInLevel / 250) * 100);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-cyan-400">Progression &amp; Rewards</div>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            Level {user.level} · {user.xp} Total XP
          </h1>
          <div className="mt-3 w-64 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{250 - xpInLevel} XP to next level</div>
        </div>
        <div className="bg-slate-950/70 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3">
          <Coins className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-slate-400">Coin Balance</div>
            <div className="font-mono-num text-xl font-bold text-amber-400">{user.coins}</div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
          {notice}
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-cyan-400" />
          Daily Missions
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {DAILY_MISSIONS.map((m) => {
            const claimed = user.claimedMissions.includes(m.id);
            const currentVal =
              m.metric === 'matches' ? user.matchesPlayed : m.metric === 'wins' ? user.wins : user.wins;
            const ready = currentVal >= m.target || m.target === 1;
            return (
              <div
                key={m.id}
                className="bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-display text-base font-bold text-white">{m.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{m.description}</p>
                  <div className="mt-3 text-xs font-mono-num text-amber-400">
                    +{m.rewardXp} XP · +{m.rewardCoins} Coins
                  </div>
                </div>
                <button
                  disabled={claimed || !ready}
                  onClick={async () => {
                    await claimMission(m.id);
                    setNotice(`Claimed "${m.title}" reward!`);
                  }}
                  className={`mt-4 w-full py-2 rounded-lg text-xs font-bold ${
                    claimed
                      ? 'bg-slate-800 text-emerald-400'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-50'
                  }`}
                >
                  {claimed ? 'Claimed ✓' : 'Claim Reward'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Achievements
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = user.unlockedAchievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  unlocked ? 'bg-[#111827] border-emerald-500/30' : 'bg-[#111827]/60 border-white/10'
                }`}
              >
                <div>
                  <div className="font-display font-bold text-white text-sm">{a.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.description}</div>
                </div>
                <div className="text-xs font-mono-num font-bold text-amber-400">
                  {unlocked ? 'Unlocked' : `+${a.rewardCoins}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function InventoryPage({ user }: { user: AuthUser }) {
  const { equipOrBuyCosmetic } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (itemId: string) => {
    setError(null);
    try {
      await equipOrBuyCosmetic(itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to equip cosmetic');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Locker &amp; Shop
          </h1>
          <span className="font-mono-num text-sm font-bold text-amber-400">{user.coins} Coins</span>
        </div>
        <CharacterPreview3D
          skinId={user.equippedSkin}
          accessoryId={user.equippedAccessory}
          role="hider"
          className="w-full h-72"
        />
        <p className="text-xs text-slate-400">
          Your equipped 3D character skin and accessory sync live across room lobbies and multiplayer matches.
        </p>
      </div>

      <div className="lg:col-span-8 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
            {error}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {COSMETICS.map((item) => {
            const unlocked = user.unlockedCosmetics.includes(item.id);
            const equipped =
              user.equippedSkin === item.id || user.equippedAccessory === item.id;
            return (
              <div
                key={item.id}
                className="bg-[#111827] border border-white/10 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase text-slate-400 font-semibold">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: item.primaryColor }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: item.secondaryColor }}
                      />
                    </div>
                  </div>
                  <h3 className="font-display text-base font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                </div>

                <button
                  onClick={() => void handleAction(item.id)}
                  className={`mt-4 w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                    equipped
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : unlocked
                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  {equipped ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Equipped
                    </>
                  ) : unlocked ? (
                    'Equip'
                  ) : (
                    `Unlock · ${item.price} Coins`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({
  user,
  quality,
  onChangeQuality,
  sensitivity,
  onChangeSensitivity,
}: {
  user: AuthUser | null;
  quality: QualityPreset;
  onChangeQuality: (q: QualityPreset) => void;
  sensitivity: number;
  onChangeSensitivity: (s: number) => void;
}) {
  const { verifyEmail } = useAuth();
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-5 h-5 text-cyan-400" />
        Game &amp; Account Settings
      </h1>

      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            3D Graphics Quality Preset
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['high', 'medium', 'low'] as QualityPreset[]).map((q) => (
              <button
                key={q}
                onClick={() => onChangeQuality(q)}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase ${
                  quality === q
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 border border-white/10 text-slate-300'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300">Camera Look Sensitivity</span>
            <span className="font-mono-num text-cyan-400">{sensitivity.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={0.4}
            max={2.4}
            step={0.1}
            value={sensitivity}
            onChange={(e) => onChangeSensitivity(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        {user && !user.emailVerified && (
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Email Verification</div>
              <div className="text-xs text-slate-400">Verify your Hideverse email session.</div>
            </div>
            <button
              onClick={async () => {
                await verifyEmail();
                setVerifyMsg('Email verified!');
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Verify Email
            </button>
          </div>
        )}
        {verifyMsg && <div className="text-xs text-emerald-400">{verifyMsg}</div>}
      </div>

      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-white">
            Download Complete HIDEVERSE Source Archive
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Includes full frontend, Three.js engine, Socket.IO server, Prisma + MySQL 8 schema, Docker Compose, Nginx, and docs.
          </p>
        </div>
        <a
          href="/api/export-zip"
          download="hideverse-complete.zip"
          className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download ZIP
        </a>
      </div>
    </div>
  );
}

export function AdminPanelPage() {
  const [data, setData] = useState<{
    stats: { totalUsers: number; onlinePlayers: number; activeRooms: number; totalMatches: number };
    users: AuthUser[];
    reports: Array<{ id: string; reporterName: string; targetName: string; reason: string; status: string }>;
    auditLogs: Array<{ id: string; actorName: string; action: string; details: string }>;
    enabledMaps: MapId[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    const res = await fetch('/api/admin/overview', { credentials: 'include' });
    if (!res.ok) {
      setError('Admin privileges required.');
      return;
    }
    setData(await res.json());
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-[#111827] border border-rose-500/30 rounded-xl p-6 text-sm text-rose-200">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-6xl mx-auto px-6 py-12 text-sm text-slate-400">Loading admin console...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        Admin &amp; Moderation Console
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Users</div>
          <div className="font-mono-num text-2xl font-bold text-white mt-1">{data.stats.totalUsers}</div>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Online Players</div>
          <div className="font-mono-num text-2xl font-bold text-cyan-400 mt-1">{data.stats.onlinePlayers}</div>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Active Rooms</div>
          <div className="font-mono-num text-2xl font-bold text-white mt-1">{data.stats.activeRooms}</div>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Completed Matches</div>
          <div className="font-mono-num text-2xl font-bold text-emerald-400 mt-1">{data.stats.totalMatches}</div>
        </div>
      </div>

      {/* Arena Map Toggles */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-base font-bold text-white mb-4">Active Arena Rotation</h2>
        <div className="flex flex-wrap gap-3">
          {MAP_LIST.map((m) => {
            const enabled = data.enabledMaps.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={async () => {
                  await fetch('/api/admin/toggle-map', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ mapId: m.id }),
                  });
                  await loadOverview();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${
                  enabled ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-900 text-slate-500'
                }`}
              >
                {m.name} ({enabled ? 'Enabled' : 'Disabled'})
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Moderation */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-white">User Accounts</h2>
        {data.users.map((u) => (
          <div key={u.uid} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-white/10 text-xs">
            <div>
              <span className="font-semibold text-white">{u.displayName}</span>{' '}
              <span className="text-slate-400">({u.email} · {u.role})</span>
            </div>
            {u.role !== 'admin' && (
              <button
                onClick={async () => {
                  await fetch('/api/admin/ban', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ targetUid: u.uid, banned: !u.isBanned }),
                  });
                  await loadOverview();
                }}
                className={`px-3 py-1 rounded font-bold ${
                  u.isBanned ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {u.isBanned ? 'Unban' : 'Ban'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Reports & Audit Logs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-white">Player Reports</h2>
          {data.reports.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-slate-950/60 border border-white/10 text-xs space-y-2">
              <div className="font-semibold text-white">
                {r.targetName} — {r.reason} ({r.status})
              </div>
              {r.status === 'open' && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await fetch('/api/admin/report-resolve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ reportId: r.id, status: 'resolved' }),
                      });
                      await loadOverview();
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={async () => {
                      await fetch('/api/admin/report-resolve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ reportId: r.id, status: 'dismissed' }),
                      });
                      await loadOverview();
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
          {data.reports.length === 0 && <div className="text-xs text-slate-500">No open reports.</div>}
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-white">Audit Log</h2>
          {data.auditLogs.map((l) => (
            <div key={l.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-xs">
              <span className="text-cyan-400 font-semibold">{l.action}</span> · {l.details}
            </div>
          ))}
          {data.auditLogs.length === 0 && <div className="text-xs text-slate-500">No administrative actions recorded yet.</div>}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage({ onNavigate }: { onNavigate: (r: PageRoute) => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="font-mono-num text-5xl font-bold text-cyan-400">404</div>
      <h1 className="font-display text-2xl font-bold text-white mt-3">Arena Sector Not Found</h1>
      <p className="text-sm text-slate-400 mt-2">
        That Hideverse route does not exist or has been relocated.
      </p>
      <button
        onClick={() => onNavigate('dashboard')}
        className="mt-6 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
      >
        Return to Dashboard
      </button>
    </div>
  );
}
