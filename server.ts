import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  auditLogsStore,
  buyOrEquipCosmetic,
  claimMissionReward,
  clearSessionCookie,
  createNewUserRecord,
  enabledMaps,
  getSessionUser,
  hashPassword,
  rateLimitAuth,
  reportsStore,
  requireAdminMiddleware,
  requireAuthMiddleware,
  sanitizeUser,
  setSessionCookie,
  type StoredUser,
  uidByEmail,
  usersByUid,
  verifyPassword,
} from './backend/auth.ts';
import {
  getActiveRoomsList,
  getOnlinePlayersCount,
  matchHistoryStore,
  setupSocketServer,
} from './backend/gameServer.ts';
import { setupLiveVoiceBridge } from './backend/liveVoiceBridge.ts';
import { buildHideverseZipBuffer } from './backend/zipBuilder.ts';
import { MAPS } from './shared/maps.ts';
import type { MapId } from './shared/types.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health & Platform Stats
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, onlinePlayers: getOnlinePlayersCount(), activeRooms: getActiveRoomsList().length });
  });

  // --- Authentication Routes ---
  app.post('/api/auth/register', rateLimitAuth(20, 60_000), (req, res) => {
    const { username, email, password, confirmPassword, photoUrl } = req.body || {};
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const emailLower = email.trim().toLowerCase();
    if (uidByEmail.has(emailLower)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = createNewUserRecord({
      username: username.trim(),
      displayName: username.trim(),
      email: emailLower,
      password,
      photoUrl: typeof photoUrl === 'string' ? photoUrl.slice(0, 512) : '',
      emailVerified: false,
    });
    setSessionCookie(res, user.uid);
    return res.status(201).json({ user: sanitizeUser(user), verifyToken: user.verifyToken });
  });

  app.post('/api/auth/login', rateLimitAuth(25, 60_000), (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const uid = uidByEmail.get(String(email).trim().toLowerCase());
    const user = uid ? usersByUid.get(uid) : undefined;
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    setSessionCookie(res, user.uid);
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/firebase-sync', (req, res) => {
    const { uid, email, displayName, photoUrl, emailVerified } = req.body || {};
    if (!uid || !email) {
      return res.status(400).json({ error: 'Firebase uid and email required.' });
    }
    const emailLower = String(email).trim().toLowerCase();
    let user = usersByUid.get(String(uid));
    if (!user) {
      const existingUid = uidByEmail.get(emailLower);
      if (existingUid) {
        user = usersByUid.get(existingUid);
      }
    }
    if (!user) {
      user = createNewUserRecord({
        uid: String(uid),
        username: String(displayName || emailLower.split('@')[0]),
        displayName: String(displayName || emailLower.split('@')[0]),
        email: emailLower,
        photoUrl: typeof photoUrl === 'string' ? photoUrl : '',
        emailVerified: Boolean(emailVerified),
      });
    } else {
      user.emailVerified = Boolean(emailVerified) || user.emailVerified;
      if (photoUrl && !user.photoUrl) user.photoUrl = String(photoUrl);
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    setSessionCookie(res, user.uid);
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ user: null });
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body || {};
    const sessionUser = getSessionUser(req);
    if (sessionUser && (!token || sessionUser.verifyToken === token)) {
      sessionUser.emailVerified = true;
      sessionUser.verifyToken = undefined;
      return res.json({ ok: true, user: sanitizeUser(sessionUser) });
    }
    for (const u of usersByUid.values()) {
      if (u.verifyToken && u.verifyToken === token) {
        u.emailVerified = true;
        u.verifyToken = undefined;
        return res.json({ ok: true });
      }
    }
    return res.status(400).json({ error: 'Invalid verification token.' });
  });

  app.post('/api/auth/forgot-password', rateLimitAuth(15, 60_000), (req, res) => {
    const { email } = req.body || {};
    const uid = uidByEmail.get(String(email || '').trim().toLowerCase());
    const user = uid ? usersByUid.get(uid) : undefined;
    if (!user) {
      return res.json({ ok: true, message: 'If that email exists, a reset token was generated.' });
    }
    const token = crypto.randomBytes(12).toString('hex');
    user.resetToken = token;
    user.resetExpiresAt = Date.now() + 30 * 60 * 1000;
    return res.json({ ok: true, resetToken: token, message: 'Password reset token generated.' });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Valid reset token and password (6+ chars) required.' });
    }
    for (const u of usersByUid.values()) {
      if (u.resetToken === token && (u.resetExpiresAt || 0) > Date.now()) {
        u.passwordHash = hashPassword(String(newPassword));
        u.resetToken = undefined;
        u.resetExpiresAt = undefined;
        return res.json({ ok: true });
      }
    }
    return res.status(400).json({ error: 'Reset token is invalid or expired.' });
  });

  // --- Profile, Progression & Leaderboard ---
  app.put('/api/profile', requireAuthMiddleware, (req, res) => {
    const user = (req as express.Request & { authUser: StoredUser }).authUser;
    const { displayName, bio, favoriteMap, photoUrl } = req.body || {};
    if (typeof displayName === 'string' && displayName.trim().length >= 1) {
      user.displayName = displayName.trim().slice(0, 36);
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 280);
    }
    if (typeof favoriteMap === 'string' && MAPS[favoriteMap as MapId]) {
      user.favoriteMap = favoriteMap as MapId;
    }
    if (typeof photoUrl === 'string') {
      user.photoUrl = photoUrl.slice(0, 512);
    }
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/cosmetics/equip', requireAuthMiddleware, (req, res) => {
    const user = (req as express.Request & { authUser: StoredUser }).authUser;
    const result = buyOrEquipCosmetic(user, String(req.body?.itemId || ''));
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ user: result.user });
  });

  app.post('/api/missions/claim', requireAuthMiddleware, (req, res) => {
    const user = (req as express.Request & { authUser: StoredUser }).authUser;
    const result = claimMissionReward(user, String(req.body?.missionId || ''));
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ user: result.user });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const players = Array.from(usersByUid.values())
      .filter((u) => !u.isBanned)
      .map((u) => ({
        uid: u.uid,
        username: u.username,
        displayName: u.displayName,
        level: u.level,
        xp: u.xp,
        wins: u.wins,
        losses: u.losses,
        matchesPlayed: u.matchesPlayed,
        winRate: u.matchesPlayed > 0 ? Math.round((u.wins / u.matchesPlayed) * 100) : 0,
        equippedSkin: u.equippedSkin,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50);
    res.json({ leaderboard: players, recentMatches: matchHistoryStore.slice(0, 15) });
  });

  app.get('/api/users/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const list = Array.from(usersByUid.values())
      .filter((u) => !u.isBanned && (!q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)))
      .map((u) => ({
        uid: u.uid,
        username: u.username,
        displayName: u.displayName,
        level: u.level,
        wins: u.wins,
        equippedSkin: u.equippedSkin,
      }))
      .slice(0, 20);
    res.json({ users: list });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getActiveRoomsList(), enabledMaps: Array.from(enabledMaps) });
  });

  app.post('/api/reports', requireAuthMiddleware, (req, res) => {
    const user = (req as express.Request & { authUser: StoredUser }).authUser;
    const { targetUid, targetName, reason, details } = req.body || {};
    if (!targetUid || !reason) return res.status(400).json({ error: 'Target and reason required.' });
    const rec = {
      id: `rep_${Date.now()}`,
      reporterUid: user.uid,
      reporterName: user.displayName,
      targetUid: String(targetUid),
      targetName: String(targetName || targetUid),
      reason: String(reason).slice(0, 64),
      details: String(details || '').slice(0, 400),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    reportsStore.unshift(rec);
    res.status(201).json({ report: rec });
  });

  // --- Admin Panel Endpoints ---
  app.get('/api/admin/overview', requireAdminMiddleware, (_req, res) => {
    res.json({
      stats: {
        totalUsers: usersByUid.size,
        onlinePlayers: getOnlinePlayersCount(),
        activeRooms: getActiveRoomsList().length,
        totalMatches: matchHistoryStore.length,
      },
      users: Array.from(usersByUid.values()).map(sanitizeUser),
      rooms: getActiveRoomsList(),
      reports: reportsStore,
      auditLogs: auditLogsStore.slice(0, 40),
      enabledMaps: Array.from(enabledMaps),
    });
  });

  app.post('/api/admin/ban', requireAdminMiddleware, (req, res) => {
    const actor = (req as express.Request & { authUser: StoredUser }).authUser;
    const { targetUid, banned } = req.body || {};
    const target = usersByUid.get(String(targetUid));
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Cannot ban an admin' });
    target.isBanned = Boolean(banned);
    auditLogsStore.unshift({
      id: `log_${Date.now()}`,
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: target.isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
      targetId: target.uid,
      details: `${actor.displayName} set isBanned=${target.isBanned} on ${target.displayName}`,
      createdAt: new Date().toISOString(),
    });
    res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/report-resolve', requireAdminMiddleware, (req, res) => {
    const actor = (req as express.Request & { authUser: StoredUser }).authUser;
    const { reportId, status } = req.body || {};
    const rep = reportsStore.find((r) => r.id === reportId);
    if (!rep) return res.status(404).json({ error: 'Report not found' });
    rep.status = status === 'dismissed' ? 'dismissed' : 'resolved';
    auditLogsStore.unshift({
      id: `log_${Date.now()}`,
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'REPORT_UPDATED',
      targetId: rep.id,
      details: `Marked report ${rep.id} as ${rep.status}`,
      createdAt: new Date().toISOString(),
    });
    res.json({ report: rep });
  });

  app.post('/api/admin/toggle-map', requireAdminMiddleware, (req, res) => {
    const actor = (req as express.Request & { authUser: StoredUser }).authUser;
    const mapId = String(req.body?.mapId || '') as MapId;
    if (!MAPS[mapId]) return res.status(400).json({ error: 'Invalid map ID' });
    if (enabledMaps.has(mapId) && enabledMaps.size > 1) enabledMaps.delete(mapId);
    else enabledMaps.add(mapId);
    auditLogsStore.unshift({
      id: `log_${Date.now()}`,
      actorUid: actor.uid,
      actorName: actor.displayName,
      action: 'MAP_TOGGLED',
      targetId: mapId,
      details: `Enabled=${enabledMaps.has(mapId)}`,
      createdAt: new Date().toISOString(),
    });
    res.json({ enabledMaps: Array.from(enabledMaps) });
  });

  // --- Real Downloadable ZIP Export ---
  app.get('/api/export-zip', async (_req, res) => {
    try {
      const buf = await buildHideverseZipBuffer(__dirname);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="hideverse-complete.zip"');
      res.setHeader('Content-Length', buf.length);
      res.send(buf);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'ZIP export failed' });
    }
  });

  // Attach Socket.IO & Gemini Live API WebSocket bridge
  setupSocketServer(httpServer);
  setupLiveVoiceBridge(httpServer);

  // Vite Dev Middleware or Static Production Build
  const distDir = path.join(__dirname, 'dist');
  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distDir)) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HIDEVERSE server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
