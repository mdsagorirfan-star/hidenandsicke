# HIDEVERSE API & Socket.IO Documentation

## REST API Endpoints
- `GET /api/health` — Returns online player count and active room count.
- `POST /api/auth/register` — Registers a player with scrypt password hashing and HTTP-only session cookie.
- `POST /api/auth/login` — Authenticates credentials with rate limiting.
- `POST /api/auth/firebase-sync` — Synchronizes Firebase Google Sign-In identity into server session.
- `POST /api/auth/logout` — Clears session cookie.
- `GET /api/auth/me` — Returns current authenticated player profile.
- `POST /api/auth/forgot-password` & `POST /api/auth/reset-password` — Password recovery token flow.
- `POST /api/auth/verify-email` — Marks account email as verified.
- `PUT /api/profile` — Updates display name, bio, favorite map, and photo URL.
- `POST /api/cosmetics/equip` — Unlocks (with coin validation) and equips skins or accessories.
- `POST /api/missions/claim` — Claims validated XP/coin mission rewards.
- `GET /api/leaderboard` — Top ranked players and recent match results.
- `GET /api/users/search?q=` — Search players for friend requests.
- `GET /api/rooms` — Lists active rooms and enabled maps.
- `POST /api/reports` — Submits a moderation report.
- `GET /api/admin/overview`, `POST /api/admin/ban`, `POST /api/admin/report-resolve`, `POST /api/admin/toggle-map` — Role-protected admin controls.
- `GET /api/export-zip` — Streams `hideverse-complete.zip` containing the full project archive.

## Socket.IO Events
- `room:create`, `room:quick_match`, `room:join`, `room:leave`, `room:ready`, `room:update_settings`, `room:kick`
- `match:start`, `match:reset_lobby`, `player:move`, `player:tag_attempt`
- Server broadcasts: `rooms:list`, `room:state`, `match:state`, `match:tag_effect`, `match:seekers_released`, `match:ended`
- Chat: `chat:send`, `chat:typing`, `chat:message`
- WebRTC Signaling (with Hider/Seeker channel isolation): `voice:join`, `voice:leave`, `voice:mute`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice`

## Gemini Live API WebSocket
- `WS /live` — Streams 16kHz PCM audio to `gemini-3.8-live` and receives 24kHz PCM tactical voice coaching responses.
