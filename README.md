# HIDEVERSE — 3D Multiplayer Hide & Seek Platform

HIDEVERSE is a browser-playable 3D multiplayer Hide & Seek game and social platform built with React, TypeScript, Three.js, Express, Socket.IO, WebRTC voice channels, Firebase Auth/Firestore, and Gemini Live API tactical voice coaching.

## Features
- **5 Playable 3D Maps**: Modern House, Academy Campus (School), Neon District (City), Mystic Jungle, Starlight Park (Amusement Park), each with full AABB collision geometry, stairs/ramps, hiding spots, and spawn points.
- **5 Game Modes**: Classic Hide & Seek, Team Hide & Seek, Infection Mode, Custom Private Match, Quick Match.
- **Authoritative Multiplayer**: Socket.IO 10 Hz server tick for role assignment, hiding countdown, seeker release, anti-cheat bounds clamping, server-validated tagging, and AI bots for solo/small-party play.
- **WebRTC Voice Channels & Gemini Live Coach**: Peer-to-peer WebRTC voice signaling with separate Hider/Seeker channels, plus a real-time Gemini Live API (`gemini-3.8-live`) tactical voice companion.
- **Social Platform & Progression**: Friends, requests, blocking, room & DM chat, notifications, XP/levels, daily missions, cosmetic skins & accessories, leaderboard, and role-protected admin panel.

## Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Docker & MySQL Deployment
```bash
cp .env.example .env
docker compose up --build -d
```
