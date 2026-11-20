import type { MapCollider, MapDefinition, MapId } from './types.ts';

function wall(id: string, x: number, y: number, z: number, w: number, h: number, d: number, color: string, label?: string): MapCollider {
  return { id, x, y, z, w, h, d, color, kind: 'wall', roughness: 0.78, metalness: 0.05, label };
}

function box(
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  kind: MapCollider['kind'],
  roughness = 0.6,
  metalness = 0.1,
  label?: string
): MapCollider {
  return { id, x, y, z, w, h, d, color, kind, roughness, metalness, label };
}

function stairs(idPrefix: string, startX: number, startZ: number, dirX: number, dirZ: number, steps: number, width: number, stepRun: number, stepRise: number, color: string): MapCollider[] {
  const out: MapCollider[] = [];
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepRise;
    const x = startX + dirX * i * stepRun;
    const z = startZ + dirZ * i * stepRun;
    out.push({
      id: `${idPrefix}_${i}`,
      x,
      y: 0,
      z,
      w: dirX !== 0 ? stepRun : width,
      h,
      d: dirZ !== 0 ? stepRun : width,
      color,
      kind: 'stairs',
      roughness: 0.65,
      metalness: 0.1,
    });
  }
  return out;
}

export const MAPS: Record<MapId, MapDefinition> = {
  modern_house: {
    id: 'modern_house',
    name: 'Modern House',
    subtitle: 'Villa & Glass Garden',
    description: 'Two-story contemporary residence featuring a vaulted living room, island kitchen, upstairs bedroom loft, and hedged garden patio.',
    previewImage: '/src/assets/images/map_modern_house_1795122758912.jpg',
    accentColor: '#06B6D4',
    bounds: { width: 52, depth: 52 },
    skyColor: '#131C2E',
    fogColor: '#131C2E',
    fogDensity: 0.011,
    ambientLight: { sky: '#93C5FD', ground: '#334155', intensity: 0.75 },
    keyLight: { color: '#FDE68A', intensity: 1.9, position: { x: 22, y: 34, z: 18 } },
    isOutdoor: false,
    hiderSpawns: [
      { x: -12, y: 0, z: -10 },
      { x: 10, y: 0, z: -12 },
      { x: -14, y: 0, z: 12 },
      { x: 14, y: 0, z: 10 },
      { x: 0, y: 4.1, z: -10 },
      { x: -12, y: 4.1, z: -6 },
    ],
    seekerSpawns: [
      { x: 0, y: 0, z: 21 },
      { x: 3, y: 0, z: 21 },
    ],
    hidingSpots: [
      { x: -16, y: 0, z: -15 },
      { x: 15, y: 0, z: -14 },
      { x: -8, y: 4.1, z: -13 },
      { x: 18, y: 0, z: 15 },
      { x: -18, y: 0, z: 16 },
    ],
    colliders: [
      // Outer compound perimeter walls
      wall('mh_n', 0, 0, -25, 50, 5.5, 1.2, '#1E293B'),
      wall('mh_s', 0, 0, 25, 50, 5.5, 1.2, '#1E293B'),
      wall('mh_w', -25, 0, 0, 1.2, 5.5, 50, '#1E293B'),
      wall('mh_e', 25, 0, 0, 1.2, 5.5, 50, '#1E293B'),
      // Interior House Partition Walls (with doorways)
      wall('mh_living_sep_l', -11, 0, 2, 10, 4.2, 0.8, '#CBD5E1', 'Living Room'),
      wall('mh_living_sep_r', 9, 0, 2, 12, 4.2, 0.8, '#CBD5E1', 'Kitchen'),
      wall('mh_mid_divider_n', -2, 0, -11, 0.8, 4.2, 12, '#E2E8F0'),
      wall('mh_mid_divider_s', -2, 0, -1, 0.8, 4.2, 4, '#E2E8F0'),
      // Living Room Furniture (Left wing)
      box('mh_sofa_main', -13, 0, -8, 6.2, 1.1, 2.2, '#334155', 'furniture', 0.85, 0.05),
      box('mh_sofa_side', -16.5, 0, -10.5, 2.0, 1.1, 4.4, '#334155', 'furniture', 0.85, 0.05),
      box('mh_coffee_tbl', -12.5, 0, -11.8, 3.0, 0.65, 1.8, '#92400E', 'furniture', 0.55, 0.1),
      box('mh_tv_unit', -13, 0, -16.8, 5.4, 1.3, 1.1, '#0F172A', 'furniture', 0.35, 0.4),
      box('mh_bookshelf', -20.5, 0, -14, 1.3, 3.2, 4.2, '#78350F', 'hide_box', 0.7, 0.05),
      // Kitchen (Right wing)
      box('mh_island', 11, 0, -8, 5.2, 1.15, 2.4, '#F8FAFC', 'furniture', 0.25, 0.15),
      box('mh_counter_back', 14, 0, -16.5, 10, 1.2, 1.6, '#E2E8F0', 'furniture', 0.3, 0.2),
      box('mh_fridge', 20.5, 0, -15.8, 1.8, 2.9, 1.8, '#94A3B8', 'hide_box', 0.25, 0.75),
      box('mh_dining_tbl', 11, 0, -2.5, 4.6, 0.95, 2.4, '#78350F', 'furniture', 0.5, 0.1),
      // Second Floor Bedroom Loft + Balcony
      box('mh_upper_deck', -10, 3.8, -11, 20, 0.4, 14, '#475569', 'floor', 0.7, 0.1),
      box('mh_bed', -15, 4.2, -13, 3.6, 0.95, 4.4, '#6366F1', 'furniture', 0.85, 0.05),
      box('mh_wardrobe', -6, 4.2, -16.5, 3.2, 2.8, 1.3, '#78350F', 'hide_box', 0.65, 0.05),
      // Stairs up to 2nd floor
      ...stairs('mh_stair', 3.5, -14, 0, 1, 8, 2.8, 1.1, 0.5, '#B45309'),
      // Garden Patio, Pool Rim, Pergola & Hedges (South half)
      box('mh_hedge_w', -17, 0, 13, 2.0, 1.9, 11, '#15803D', 'foliage', 0.92, 0.0),
      box('mh_hedge_e', 17, 0, 13, 2.0, 1.9, 11, '#15803D', 'foliage', 0.92, 0.0),
      box('mh_garden_shed', -19.5, 0, 18.5, 4.2, 2.8, 4.2, '#475569', 'hide_box', 0.7, 0.2),
      box('mh_patio_bar', 12, 0, 14, 4.6, 1.3, 1.6, '#7C2D12', 'furniture', 0.6, 0.1),
      box('mh_planter_c', 0, 0, 12, 5.2, 1.1, 2.6, '#0F766E', 'structure', 0.4, 0.1),
    ],
  },

  school: {
    id: 'school',
    name: 'Academy Campus',
    subtitle: 'Classrooms, Library & Yard',
    description: 'Navigate locker-lined hallways, stacked library bookshelves, classroom desk rows, and an open courtyard playground.',
    previewImage: '',
    accentColor: '#3B82F6',
    bounds: { width: 58, depth: 58 },
    skyColor: '#141D2F',
    fogColor: '#141D2F',
    fogDensity: 0.01,
    ambientLight: { sky: '#BAE6FD', ground: '#334155', intensity: 0.8 },
    keyLight: { color: '#FEF3C7', intensity: 1.85, position: { x: -24, y: 36, z: 20 } },
    isOutdoor: false,
    hiderSpawns: [
      { x: -18, y: 0, z: -16 },
      { x: 18, y: 0, z: -16 },
      { x: -18, y: 0, z: 4 },
      { x: 18, y: 0, z: 4 },
      { x: 0, y: 0, z: -20 },
    ],
    seekerSpawns: [
      { x: 0, y: 0, z: 23 },
      { x: -3, y: 0, z: 23 },
    ],
    hidingSpots: [
      { x: -23, y: 0, z: -21 },
      { x: 22, y: 0, z: -20 },
      { x: -22, y: 0, z: 8 },
      { x: 21, y: 0, z: 18 },
    ],
    colliders: [
      // Campus perimeter
      wall('sc_n', 0, 0, -28, 56, 5.5, 1.2, '#1E293B'),
      wall('sc_s', 0, 0, 28, 56, 5.5, 1.2, '#1E293B'),
      wall('sc_w', -28, 0, 0, 1.2, 5.5, 56, '#1E293B'),
      wall('sc_e', 28, 0, 0, 1.2, 5.5, 56, '#1E293B'),
      // Central Hallway Walls
      wall('sc_hall_w1', -7, 0, -18, 0.9, 4.4, 12, '#94A3B8'),
      wall('sc_hall_w2', -7, 0, -1, 0.9, 4.4, 10, '#94A3B8'),
      wall('sc_hall_e1', 7, 0, -18, 0.9, 4.4, 12, '#94A3B8'),
      wall('sc_hall_e2', 7, 0, -1, 0.9, 4.4, 10, '#94A3B8'),
      // Lockers along hallway
      box('sc_lockers_w', -6, 0, -16, 0.8, 2.3, 9, '#2563EB', 'hide_box', 0.35, 0.65),
      box('sc_lockers_e', 6, 0, -16, 0.8, 2.3, 9, '#2563EB', 'hide_box', 0.35, 0.65),
      // Classroom West (Desks + Teacher podium)
      box('sc_desk_1', -17, 0, -18, 2.2, 0.95, 1.4, '#B45309', 'furniture'),
      box('sc_desk_2', -22, 0, -18, 2.2, 0.95, 1.4, '#B45309', 'furniture'),
      box('sc_desk_3', -17, 0, -13, 2.2, 0.95, 1.4, '#B45309', 'furniture'),
      box('sc_desk_4', -22, 0, -13, 2.2, 0.95, 1.4, '#B45309', 'furniture'),
      box('sc_podium', -19.5, 0, -23, 3.4, 1.2, 1.5, '#78350F', 'furniture'),
      // Library East (Tall bookshelves creating stealth corridors)
      box('sc_shelf_1', 15, 0, -20, 1.1, 3.1, 7.5, '#7C2D12', 'hide_box'),
      box('sc_shelf_2', 20, 0, -20, 1.1, 3.1, 7.5, '#7C2D12', 'hide_box'),
      box('sc_shelf_3', 15, 0, -8, 1.1, 3.1, 7.5, '#7C2D12', 'hide_box'),
      box('sc_shelf_4', 20, 0, -8, 1.1, 3.1, 7.5, '#7C2D12', 'hide_box'),
      box('sc_lib_table', 17.5, 0, -1.5, 4.8, 0.95, 2.2, '#92400E', 'furniture'),
      // School Yard & Playground (South half)
      box('sc_play_fort', -14, 0, 14, 5.5, 2.6, 5.5, '#DC2626', 'structure', 0.5, 0.2),
      ...stairs('sc_play_stairs', -19.5, 14, 1, 0, 5, 2.4, 0.9, 0.52, '#F59E0B'),
      box('sc_bleachers_1', 16, 0, 13, 7.5, 1.0, 2.4, '#475569', 'stairs'),
      box('sc_bleachers_2', 16, 0, 15.5, 7.5, 2.0, 2.4, '#334155', 'stairs'),
      box('sc_bus_stop', 0, 0, 11, 5.0, 2.6, 2.2, '#FBBF24', 'vehicle', 0.35, 0.45),
    ],
  },

  city: {
    id: 'city',
    name: 'Neon District',
    subtitle: 'Downtown Shops, Cars & Park',
    description: 'Bustling urban intersection lined with cafe storefronts, parked cars, alleyways, and a lit pocket park.',
    previewImage: '/src/assets/images/map_neon_city_1795122758845.jpg',
    accentColor: '#F59E0B',
    bounds: { width: 64, depth: 64 },
    skyColor: '#0B1020',
    fogColor: '#0B1020',
    fogDensity: 0.012,
    ambientLight: { sky: '#60A5FA', ground: '#1E293B', intensity: 0.7 },
    keyLight: { color: '#FDBA74', intensity: 1.8, position: { x: 26, y: 38, z: -20 } },
    isOutdoor: true,
    hiderSpawns: [
      { x: -20, y: 0, z: -20 },
      { x: 20, y: 0, z: -20 },
      { x: -22, y: 0, z: 12 },
      { x: 22, y: 0, z: 12 },
      { x: 0, y: 0, z: -2 },
    ],
    seekerSpawns: [
      { x: 0, y: 0, z: 25 },
      { x: 4, y: 0, z: 25 },
    ],
    hidingSpots: [
      { x: -25, y: 0, z: -25 },
      { x: 25, y: 0, z: -24 },
      { x: -12, y: 0, z: 18 },
      { x: 14, y: 0, z: 16 },
    ],
    colliders: [
      // City Block Buildings
      box('ct_bldg_nw', -18, 0, -18, 12, 9.5, 12, '#1E293B', 'structure', 0.65, 0.25, 'Corner Cafe'),
      box('ct_bldg_ne', 18, 0, -18, 12, 11.0, 12, '#334155', 'structure', 0.6, 0.3, 'Bookstore'),
      box('ct_bldg_sw', -20, 0, 17, 10, 8.5, 10, '#1E293B', 'structure', 0.7, 0.2, 'Arcade'),
      box('ct_bldg_se', 20, 0, 17, 10, 10.5, 10, '#0F172A', 'structure', 0.55, 0.35, 'Market'),
      // Shopfront Stalls & Kiosks (navigable cover)
      box('ct_kiosk_1', -9, 0, -16, 3.2, 2.5, 3.2, '#0284C7', 'hide_box', 0.4, 0.3),
      box('ct_kiosk_2', 9, 0, -16, 3.2, 2.5, 3.2, '#D97706', 'hide_box', 0.4, 0.3),
      // Parked Cars on Streets
      box('ct_car_1', -7, 0, 3, 2.2, 1.5, 4.6, '#EF4444', 'vehicle', 0.25, 0.6),
      box('ct_car_2', 8, 0, -4, 4.6, 1.5, 2.2, '#06B6D4', 'vehicle', 0.25, 0.6),
      box('ct_van_1', -14, 0, 7, 2.5, 2.3, 5.6, '#F59E0B', 'vehicle', 0.35, 0.5),
      box('ct_car_3', 13, 0, 8, 2.2, 1.5, 4.6, '#8B5CF6', 'vehicle', 0.25, 0.6),
      // Central Pocket Park (Fountain + Planters + Benches)
      box('ct_fountain', 0, 0, -2, 4.4, 1.4, 4.4, '#475569', 'structure', 0.4, 0.2),
      box('ct_bench_n', 0, 0, -8, 3.4, 0.9, 1.1, '#92400E', 'furniture'),
      box('ct_bench_s', 0, 0, 4, 3.4, 0.9, 1.1, '#92400E', 'furniture'),
      box('ct_hedge_w', -5, 0, -2, 1.3, 1.6, 6.0, '#166534', 'foliage', 0.9, 0.0),
      box('ct_hedge_e', 5, 0, -2, 1.3, 1.6, 6.0, '#166534', 'foliage', 0.9, 0.0),
      // Subway stair cover
      box('ct_newsstand', 0, 0, -22, 4.2, 2.4, 2.6, '#0F766E', 'hide_box'),
    ],
  },

  jungle: {
    id: 'jungle',
    name: 'Mystic Jungle',
    subtitle: 'Canopy, River & Cave',
    description: 'Lush tropical clearing split by a crystal river bridge, giant mossy boulders, ancient stone ruins, and a shaded cave.',
    previewImage: '/src/assets/images/map_mystic_jungle_1795122758219.jpg',
    accentColor: '#10B981',
    bounds: { width: 64, depth: 64 },
    skyColor: '#0E241E',
    fogColor: '#0E241E',
    fogDensity: 0.014,
    ambientLight: { sky: '#6EE7B7', ground: '#1E291B', intensity: 0.8 },
    keyLight: { color: '#FEF08A', intensity: 1.95, position: { x: 24, y: 34, z: 22 } },
    isOutdoor: true,
    hiderSpawns: [
      { x: -20, y: 0, z: -18 },
      { x: 18, y: 0, z: -18 },
      { x: -18, y: 0, z: 8 },
      { x: 20, y: 0, z: 4 },
      { x: 0, y: 0, z: -22 },
    ],
    seekerSpawns: [
      { x: 0, y: 0, z: 24 },
      { x: -4, y: 0, z: 24 },
    ],
    hidingSpots: [
      { x: 21, y: 0, z: -20 },
      { x: -22, y: 0, z: -20 },
      { x: -22, y: 0, z: 16 },
      { x: 18, y: 0, z: 14 },
    ],
    colliders: [
      // Ancient Stone Cave (North-East corner with walk-in alcove)
      box('jg_cave_l', 15, 0, -20, 2.2, 4.6, 9.0, '#475569', 'structure', 0.9, 0.05),
      box('jg_cave_r', 24, 0, -20, 2.2, 4.6, 9.0, '#475569', 'structure', 0.9, 0.05),
      box('jg_cave_back', 19.5, 0, -25, 11.0, 5.0, 2.2, '#334155', 'structure', 0.9, 0.05),
      box('jg_cave_roof', 19.5, 4.4, -20, 11.0, 1.4, 9.5, '#334155', 'structure', 0.95, 0.0),
      // Mossy Boulders & Ruin Pillars
      box('jg_rock_1', -14, 0, -14, 4.6, 3.2, 4.2, '#57534E', 'structure', 0.92, 0.05),
      box('jg_rock_2', -21, 0, -6, 3.8, 2.8, 4.6, '#44403C', 'structure', 0.92, 0.05),
      box('jg_rock_3', 8, 0, -8, 4.0, 2.6, 3.6, '#57534E', 'structure', 0.92, 0.05),
      box('jg_rock_4', -12, 0, 12, 4.4, 2.9, 3.8, '#57534E', 'structure', 0.92, 0.05),
      box('jg_rock_5', 14, 0, 10, 4.2, 2.5, 4.2, '#44403C', 'structure', 0.92, 0.05),
      // Dense Hiding Bushes
      box('jg_bush_1', -7, 0, -18, 3.2, 2.0, 3.2, '#15803D', 'foliage', 0.95, 0.0),
      box('jg_bush_2', 3, 0, -15, 3.4, 2.0, 3.4, '#166534', 'foliage', 0.95, 0.0),
      box('jg_bush_3', -18, 0, 4, 3.6, 2.1, 3.6, '#15803D', 'foliage', 0.95, 0.0),
      box('jg_bush_4', 20, 0, -2, 3.4, 2.1, 3.4, '#166534', 'foliage', 0.95, 0.0),
      box('jg_bush_5', 4, 0, 15, 3.6, 2.0, 3.2, '#15803D', 'foliage', 0.95, 0.0),
      // Wooden Footbridge over center stream
      box('jg_bridge', 0, 0, 1, 5.2, 0.45, 9.0, '#92400E', 'floor', 0.8, 0.05),
      // Giant Jungle Tree Trunks
      box('jg_tree_1', -18, 0, -20, 2.0, 7.0, 2.0, '#78350F', 'foliage', 0.9, 0.0),
      box('jg_tree_2', 11, 0, 18, 2.0, 7.0, 2.0, '#78350F', 'foliage', 0.9, 0.0),
      box('jg_tree_3', -20, 0, 18, 2.0, 7.0, 2.0, '#78350F', 'foliage', 0.9, 0.0),
    ],
  },

  amusement_park: {
    id: 'amusement_park',
    name: 'Starlight Park',
    subtitle: 'Ferris Wheel & Food Plaza',
    description: 'Vibrant twilight carnival featuring a towering illuminated Ferris wheel, spinning carousel tent, food stalls, and ticket kiosks.',
    previewImage: '/src/assets/images/map_amusement_park_1795122759507.jpg',
    accentColor: '#EC4899',
    bounds: { width: 64, depth: 64 },
    skyColor: '#130F26',
    fogColor: '#130F26',
    fogDensity: 0.011,
    ambientLight: { sky: '#C4B5FD', ground: '#1E1B4B', intensity: 0.75 },
    keyLight: { color: '#FDE68A', intensity: 1.85, position: { x: -24, y: 36, z: 20 } },
    isOutdoor: true,
    hiderSpawns: [
      { x: -20, y: 0, z: -18 },
      { x: 20, y: 0, z: -18 },
      { x: -18, y: 0, z: 10 },
      { x: 18, y: 0, z: 10 },
      { x: 0, y: 0, z: -16 },
    ],
    seekerSpawns: [
      { x: 0, y: 0, z: 24 },
      { x: 4, y: 0, z: 24 },
    ],
    hidingSpots: [
      { x: -22, y: 0, z: -22 },
      { x: 22, y: 0, z: -20 },
      { x: -20, y: 0, z: 16 },
      { x: 20, y: 0, z: 16 },
    ],
    colliders: [
      // Ferris Wheel Base Platform & Support Legs (North Center)
      box('ap_ferris_base', 0, 0, -20, 10.0, 1.1, 6.0, '#334155', 'structure', 0.4, 0.5),
      // Carousel Tent Deck (West)
      box('ap_carousel_base', -17, 0, -8, 9.0, 1.0, 9.0, '#BE123C', 'structure', 0.45, 0.35),
      // Food Stalls (Navigable plaza lanes)
      box('ap_stall_popcorn', -8, 0, 4, 5.2, 3.0, 3.2, '#EC4899', 'hide_box', 0.45, 0.25, 'Popcorn & Candy'),
      box('ap_stall_taco', 8, 0, 4, 5.2, 3.0, 3.2, '#F59E0B', 'hide_box', 0.45, 0.25, 'Taco Treats'),
      box('ap_stall_drinks', 18, 0, -8, 4.6, 3.0, 3.4, '#06B6D4', 'hide_box', 0.4, 0.3, 'Drink Bar'),
      // Ticket Booth & Entrance Arch
      box('ap_ticket_booth', -14, 0, 16, 4.4, 2.9, 3.2, '#3B82F6', 'hide_box', 0.4, 0.3),
      box('ap_prize_tent', 15, 0, 15, 5.4, 3.2, 4.2, '#8B5CF6', 'hide_box', 0.65, 0.15),
      // Plaza Hedges & Benches
      box('ap_hedge_c1', 0, 0, -4, 4.2, 1.5, 2.2, '#15803D', 'foliage', 0.9, 0.0),
      box('ap_hedge_c2', 0, 0, 12, 4.2, 1.5, 2.2, '#15803D', 'foliage', 0.9, 0.0),
      box('ap_bench_1', -11, 0, -19, 3.4, 0.9, 1.1, '#92400E', 'furniture'),
      box('ap_bench_2', 11, 0, -19, 3.4, 0.9, 1.1, '#92400E', 'furniture'),
    ],
  },
};

export const MAP_LIST: MapDefinition[] = Object.values(MAPS);
