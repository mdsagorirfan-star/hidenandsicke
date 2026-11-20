import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { COSMETICS, DAILY_MISSIONS } from '../shared/catalog.ts';
import type { AuthUser, MapId } from '../shared/types.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'hideverse-dev-secret-rotate-in-prod';
const COOKIE_NAME = 'hideverse_session';

export interface StoredUser extends AuthUser {
  passwordHash: string;
  verifyToken?: string;
  resetToken?: string;
  resetExpiresAt?: number;
}

export interface ReportRecord {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetUid: string;
  targetName: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: string;
}

// Authoritative server-side user & moderation stores
export const usersByUid = new Map<string, StoredUser>();
export const uidByEmail = new Map<string, string>();
export const reportsStore: ReportRecord[] = [];
export const auditLogsStore: AuditLogRecord[] = [];
export const enabledMaps = new Set<MapId>(['modern_house', 'school', 'city', 'jungle', 'amusement_park']);

// Simple sliding-window rate limiter per IP
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitAuth(maxHits = 25, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'local'}:${req.path}`;
    const now = Date.now();
    const entry = rateBuckets.get(key);
    if (!entry || entry.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxHits) {
      return res.status(429).json({ error: 'Too many authentication attempts. Please wait a minute.' });
    }
    entry.count += 1;
    return next();
  };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signSessionToken(uid: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof parsed.uid === 'string' ? parsed.uid : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, uid: string) {
  const token = signSessionToken(uid);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function sanitizeUser(u: StoredUser): AuthUser {
  const { passwordHash: _p, verifyToken: _v, resetToken: _r, resetExpiresAt: _e, ...safe } = u;
  return safe;
}

export function getSessionUser(req: Request): StoredUser | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== 'string') return null;
  const uid = verifySessionToken(token);
  if (!uid) return null;
  return usersByUid.get(uid) || null;
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.isBanned) return res.status(403).json({ error: 'Account is suspended' });
  (req as Request & { authUser?: StoredUser }).authUser = user;
  next();
}

export function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin role required' });
  (req as Request & { authUser?: StoredUser }).authUser = user;
  next();
}

// Seed realistic initial leaderboard & bootstrapped admin account
function seedInitialAccounts() {
  const seeds: Array<{ uid: string; username: string; displayName: string; email: string; role: 'admin' | 'player'; wins: number; matches: number; xp: number; coins: number; skin: string; acc: string }> = [
    { uid: 'admin_root', username: 'hideverse_admin', displayName: 'Hideverse Admin', email: 'jjjj91551jjjj@gmail.com', role: 'admin', wins: 42, matches: 58, xp: 4850, coins: 1200, skin: 'skin_crimson_vanguard', acc: 'acc_crown' },
    { uid: 'player_nova', username: 'novashade', displayName: 'NovaShade', email: 'nova@hideverse.gg', role: 'player', wins: 31, matches: 44, xp: 3920, coins: 640, skin: 'skin_emerald_phantom', acc: 'acc_jetpack' },
    { uid: 'player_kairo', username: 'kairo_blitz', displayName: 'KairoBlitz', email: 'kairo@hideverse.gg', role: 'player', wins: 24, matches: 39, xp: 2890, coins: 420, skin: 'skin_amber_striker', acc: 'acc_antenna' },
    { uid: 'player_lyra', username: 'lyra_vox', displayName: 'LyraVox', email: 'lyra@hideverse.gg', role: 'player', wins: 19, matches: 31, xp: 2240, coins: 510, skin: 'skin_cobalt_sentinel', acc: 'acc_none' },
  ];

  for (const s of seeds) {
    if (usersByUid.has(s.uid)) continue;
    const u: StoredUser = {
      uid: s.uid,
      username: s.username,
      displayName: s.displayName,
      email: s.email,
      photoUrl: '',
      bio: 'Competitive Hideverse contender.',
      favoriteMap: 'modern_house',
      role: s.role,
      emailVerified: true,
      isBanned: false,
      level: Math.max(1, Math.floor(s.xp / 250) + 1),
      xp: s.xp,
      coins: s.coins,
      wins: s.wins,
      losses: s.matches - s.wins,
      matchesPlayed: s.matches,
      playtimeSeconds: s.matches * 165,
      equippedSkin: s.skin,
      equippedAccessory: s.acc,
      unlockedCosmetics: ['skin_cyan_runner', 'acc_none', s.skin, s.acc],
      claimedMissions: [],
      unlockedAchievements: ['ach_first_match'],
      passwordHash: hashPassword('Hideverse#2026'),
    };
    usersByUid.set(u.uid, u);
    uidByEmail.set(u.email.toLowerCase(), u.uid);
  }
}

seedInitialAccounts();

export function createNewUserRecord(params: {
  uid?: string;
  username: string;
  displayName?: string;
  email: string;
  password?: string;
  photoUrl?: string;
  emailVerified?: boolean;
}): StoredUser {
  const emailLower = params.email.trim().toLowerCase();
  const uid = params.uid || `usr_${crypto.randomBytes(8).toString('hex')}`;
  const isBootstrappedAdmin = emailLower === 'jjjj91551jjjj@gmail.com';
  const cleanUsername = params.username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || `player_${uid.slice(0, 6)}`;

  const u: StoredUser = {
    uid,
    username: cleanUsername,
    displayName: (params.displayName || cleanUsername).slice(0, 36),
    email: emailLower,
    photoUrl: params.photoUrl || '',
    bio: 'New challenger in the Hideverse.',
    favoriteMap: 'modern_house',
    role: isBootstrappedAdmin ? 'admin' : 'player',
    emailVerified: Boolean(params.emailVerified),
    isBanned: false,
    level: 1,
    xp: 0,
    coins: 200,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    playtimeSeconds: 0,
    equippedSkin: 'skin_cyan_runner',
    equippedAccessory: 'acc_none',
    unlockedCosmetics: ['skin_cyan_runner', 'acc_none'],
    claimedMissions: [],
    unlockedAchievements: [],
    passwordHash: hashPassword(params.password || crypto.randomBytes(16).toString('hex')),
    verifyToken: params.emailVerified ? undefined : crypto.randomBytes(16).toString('hex'),
  };
  usersByUid.set(u.uid, u);
  uidByEmail.set(emailLower, u.uid);
  return u;
}

export function applyMatchRewardsToUser(uid: string, won: boolean, xpEarned: number, coinsEarned: number, durationSeconds: number) {
  const user = usersByUid.get(uid);
  if (!user) return;
  user.matchesPlayed += 1;
  if (won) user.wins += 1;
  else user.losses += 1;
  user.xp += xpEarned;
  user.coins += coinsEarned;
  user.playtimeSeconds += durationSeconds;
  user.level = Math.max(1, Math.floor(user.xp / 250) + 1);
  if (!user.unlockedAchievements.includes('ach_first_match')) {
    user.unlockedAchievements.push('ach_first_match');
    user.coins += 75;
  }
}

export function buyOrEquipCosmetic(user: StoredUser, itemId: string): { ok: boolean; error?: string; user: AuthUser } {
  const item = COSMETICS.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: 'Cosmetic item not found', user: sanitizeUser(user) };

  if (!user.unlockedCosmetics.includes(item.id)) {
    if (user.coins < item.price) {
      return { ok: false, error: 'Insufficient coins', user: sanitizeUser(user) };
    }
    user.coins -= item.price;
    user.unlockedCosmetics.push(item.id);
  }

  if (item.category === 'skin') user.equippedSkin = item.id;
  else user.equippedAccessory = item.id;

  return { ok: true, user: sanitizeUser(user) };
}

export function claimMissionReward(user: StoredUser, missionId: string): { ok: boolean; error?: string; user: AuthUser } {
  const mission = DAILY_MISSIONS.find((m) => m.id === missionId);
  if (!mission) return { ok: false, error: 'Mission not found', user: sanitizeUser(user) };
  if (user.claimedMissions.includes(mission.id)) {
    return { ok: false, error: 'Mission already claimed', user: sanitizeUser(user) };
  }
  user.claimedMissions.push(mission.id);
  user.xp += mission.rewardXp;
  user.coins += mission.rewardCoins;
  user.level = Math.max(1, Math.floor(user.xp / 250) + 1);
  return { ok: true, user: sanitizeUser(user) };
}
