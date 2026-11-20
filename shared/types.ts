export type MapId = 'modern_house' | 'school' | 'city' | 'jungle' | 'amusement_park';

export type GameMode = 'classic' | 'team' | 'infection' | 'custom' | 'quick';

export type PlayerRole = 'hider' | 'seeker' | 'spectator';

export type MatchPhase = 'waiting' | 'hiding' | 'seeking' | 'finished';

export type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'tag';

export type QualityPreset = 'high' | 'medium' | 'low';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MapCollider {
  id: string;
  x: number;
  y: number; // bottom Y
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  kind:
    | 'wall'
    | 'floor'
    | 'furniture'
    | 'stairs'
    | 'foliage'
    | 'vehicle'
    | 'structure'
    | 'water'
    | 'hide_box'
    | 'prop';
  roughness?: number;
  metalness?: number;
  label?: string;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  previewImage: string;
  accentColor: string;
  bounds: { width: number; depth: number };
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  ambientLight: { sky: string; ground: string; intensity: number };
  keyLight: { color: string; intensity: number; position: Vec3 };
  isOutdoor: boolean;
  hiderSpawns: Vec3[];
  seekerSpawns: Vec3[];
  hidingSpots: Vec3[];
  colliders: MapCollider[];
}

export interface RoomSettings {
  name: string;
  mapId: MapId;
  mode: GameMode;
  maxPlayers: number;
  matchDuration: number; // seconds
  hidingDuration: number; // seconds
  seekerCount: number;
  isPublic: boolean;
  inviteOnly: boolean;
  hasPassword: boolean;
  separateVoiceChannels: boolean;
  fillWithBots: boolean;
}

export interface RoomMemberInfo {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string;
  ready: boolean;
  isHost: boolean;
  isBot?: boolean;
  equippedSkin: string;
  equippedAccessory: string;
  role: PlayerRole;
  team?: 'cyan' | 'amber';
  tagged: boolean;
  score: number;
  tagsCount: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  mapId: MapId;
  mode: GameMode;
  maxPlayers: number;
  playerCount: number;
  phase: MatchPhase;
  isPublic: boolean;
  hasPassword: boolean;
  inviteOnly: boolean;
  settings: RoomSettings;
}

export interface PlayerRuntimeState {
  id: string;
  username: string;
  displayName: string;
  role: PlayerRole;
  team?: 'cyan' | 'amber';
  tagged: boolean;
  isBot?: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  anim: PlayerAnimState;
  equippedSkin: string;
  equippedAccessory: string;
  score: number;
  tagsCount: number;
  lastTagTime: number;
}

export interface MatchStateSnapshot {
  roomId: string;
  phase: MatchPhase;
  timeRemaining: number;
  phaseTotalTime: number;
  winnerRole: 'hiders' | 'seekers' | null;
  players: PlayerRuntimeState[];
  events: Array<{
    id: string;
    text: string;
    timestamp: number;
    tone: 'info' | 'tag' | 'victory';
  }>;
}

export interface MatchResultSummary {
  matchId: string;
  roomId: string;
  roomName: string;
  mapId: MapId;
  mode: GameMode;
  winnerRole: 'hiders' | 'seekers';
  durationSeconds: number;
  xpEarned: number;
  coinsEarned: number;
  players: Array<{
    id: string;
    displayName: string;
    role: PlayerRole;
    tagged: boolean;
    score: number;
    tagsCount: number;
  }>;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  text: string;
  timestamp: string;
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'skin' | 'accessory';
  price: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
}

export interface MissionItem {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  metric: 'matches' | 'wins' | 'tags' | 'survive';
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  badgeColor: string;
}

export interface AuthUser {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoUrl: string;
  bio: string;
  favoriteMap: MapId;
  role: 'player' | 'moderator' | 'admin';
  emailVerified: boolean;
  isBanned: boolean;
  level: number;
  xp: number;
  coins: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  playtimeSeconds: number;
  equippedSkin: string;
  equippedAccessory: string;
  unlockedCosmetics: string[];
  claimedMissions: string[];
  unlockedAchievements: string[];
}
