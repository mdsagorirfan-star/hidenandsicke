import type { AchievementItem, CosmeticItem, GameMode, MissionItem } from './types.ts';

export const GAME_MODES: Array<{
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  accent: string;
}> = [
  {
    id: 'classic',
    name: 'Classic Hide & Seek',
    tagline: 'Outsmart the Seekers',
    description: 'Hiders scatter during the countdown before Seekers are unleashed. Survive until zero to win.',
    accent: '#06B6D4',
  },
  {
    id: 'team',
    name: 'Team Hide & Seek',
    tagline: 'Squads & Strategy',
    description: 'Two coordinated squads clash with dedicated team voice channels and tactical point multipliers.',
    accent: '#3B82F6',
  },
  {
    id: 'infection',
    name: 'Infection Mode',
    tagline: 'Every Tag Grows the Hunt',
    description: 'Tagged Hiders convert into Seekers immediately. Last Hider standing earns massive bonus XP.',
    accent: '#F59E0B',
  },
  {
    id: 'custom',
    name: 'Custom Private Match',
    tagline: 'Your Rules, Your Arena',
    description: 'Configure match timers, hiding durations, seeker count, password protection, and voice rules.',
    accent: '#8B5CF6',
  },
  {
    id: 'quick',
    name: 'Quick Match',
    tagline: 'Instant Queue',
    description: 'Jump straight into the fastest open public match or spin up an instant arena with AI bots.',
    accent: '#10B981',
  },
];

export const COSMETICS: CosmeticItem[] = [
  {
    id: 'skin_cyan_runner',
    name: 'Cyan Runner',
    category: 'skin',
    price: 0,
    primaryColor: '#0F172A',
    secondaryColor: '#06B6D4',
    accentColor: '#67E8F9',
    description: 'Standard issue Hideverse stealth suit with cyan telemetry trim.',
  },
  {
    id: 'skin_amber_striker',
    name: 'Amber Striker',
    category: 'skin',
    price: 150,
    primaryColor: '#1C1917',
    secondaryColor: '#F59E0B',
    accentColor: '#FDE68A',
    description: 'High-contrast solar tactical jacket favored by veteran seekers.',
  },
  {
    id: 'skin_emerald_phantom',
    name: 'Emerald Phantom',
    category: 'skin',
    price: 250,
    primaryColor: '#064E3B',
    secondaryColor: '#10B981',
    accentColor: '#A7F3D0',
    description: 'Deep canopy camouflage rig ideal for Jungle and Park shadows.',
  },
  {
    id: 'skin_crimson_vanguard',
    name: 'Crimson Vanguard',
    category: 'skin',
    price: 400,
    primaryColor: '#1F1218',
    secondaryColor: '#F43F5E',
    accentColor: '#FDA4AF',
    description: 'Crimson interceptor armor with brushed dark titanium plates.',
  },
  {
    id: 'skin_cobalt_sentinel',
    name: 'Cobalt Sentinel',
    category: 'skin',
    price: 350,
    primaryColor: '#172554',
    secondaryColor: '#3B82F6',
    accentColor: '#93C5FD',
    description: 'Cobalt tactical weave engineered for urban night ops.',
  },
  {
    id: 'acc_none',
    name: 'Standard Visor',
    category: 'accessory',
    price: 0,
    primaryColor: '#334155',
    secondaryColor: '#94A3B8',
    accentColor: '#38BDF8',
    description: 'Clean tactical helmet profile.',
  },
  {
    id: 'acc_jetpack',
    name: 'Aero Thruster Pack',
    category: 'accessory',
    price: 200,
    primaryColor: '#334155',
    secondaryColor: '#06B6D4',
    accentColor: '#E0F2FE',
    description: 'Twin-nozzle cosmetic backpack module.',
  },
  {
    id: 'acc_crown',
    name: 'Champion Crown',
    category: 'accessory',
    price: 500,
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE047',
    accentColor: '#FFFFFF',
    description: 'Brushed gold geometric crown for Hideverse champions.',
  },
  {
    id: 'acc_antenna',
    name: 'Recon Beacon',
    category: 'accessory',
    price: 180,
    primaryColor: '#1E293B',
    secondaryColor: '#10B981',
    accentColor: '#6EE7B7',
    description: 'Shoulder-mounted comms antenna array.',
  },
];

export const DAILY_MISSIONS: MissionItem[] = [
  {
    id: 'mission_play_3',
    title: 'Arena Regular',
    description: 'Complete 3 Hide & Seek matches across any map.',
    target: 3,
    rewardXp: 200,
    rewardCoins: 100,
    metric: 'matches',
  },
  {
    id: 'mission_win_1',
    title: 'First Victory',
    description: 'Win 1 match as either a Hider or a Seeker.',
    target: 1,
    rewardXp: 250,
    rewardCoins: 125,
    metric: 'wins',
  },
  {
    id: 'mission_tag_3',
    title: 'Sharp Reflexes',
    description: 'Tag 3 opposing Hiders before time runs out.',
    target: 3,
    rewardXp: 300,
    rewardCoins: 150,
    metric: 'tags',
  },
];

export const ACHIEVEMENTS: AchievementItem[] = [
  { id: 'ach_first_match', title: 'Into the Hideverse', description: 'Finish your first 3D match.', rewardCoins: 75, badgeColor: '#06B6D4' },
  { id: 'ach_ghost', title: 'Untouchable Ghost', description: 'Win a match as a Hider without being tagged.', rewardCoins: 150, badgeColor: '#10B981' },
  { id: 'ach_hunter', title: 'Apex Seeker', description: 'Sweep a match as a Seeker.', rewardCoins: 150, badgeColor: '#F59E0B' },
  { id: 'ach_social', title: 'Squad Leader', description: 'Host a custom match room.', rewardCoins: 100, badgeColor: '#8B5CF6' },
];
