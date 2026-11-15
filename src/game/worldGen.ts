import {
  BEACON_DEFENSE_SECONDS,
  DAY_LENGTH_SECONDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import {
  Difficulty,
  Enemy,
  GameMode,
  GameWorld,
  HotbarSlot,
  NodeType,
  WaterPond,
  WorldNode,
} from './types';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function createInitialWorld(
  difficulty: Difficulty,
  mode: GameMode = 'SURVIVAL'
): GameWorld {
  let nextId = 1;
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;

  // Water ponds placed organically around the world, including one near the starting clearing
  const ponds: WaterPond[] = [
    { id: nextId++, x: cx - 340, y: cy + 210, rx: 125, ry: 85, rotation: 0.3 },
    { id: nextId++, x: cx + 620, y: cy - 420, rx: 165, ry: 110, rotation: -0.4 },
    { id: nextId++, x: cx - 720, y: cy - 580, rx: 145, ry: 95, rotation: 0.7 },
    { id: nextId++, x: cx + 480, y: cy + 680, rx: 180, ry: 115, rotation: 0.15 },
    { id: nextId++, x: cx - 840, y: cy + 720, rx: 130, ry: 90, rotation: -0.5 },
  ];

  const isInsidePond = (x: number, y: number, pad = 45): boolean => {
    for (const p of ponds) {
      const dx = x - p.x;
      const dy = y - p.y;
      const cos = Math.cos(-p.rotation);
      const sin = Math.sin(-p.rotation);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      const norm =
        (lx * lx) / ((p.rx + pad) * (p.rx + pad)) +
        (ly * ly) / ((p.ry + pad) * (p.ry + pad));
      if (norm <= 1) return true;
    }
    return false;
  };

  const nodes: WorldNode[] = [];

  const canPlaceNode = (x: number, y: number, radius: number): boolean => {
    if (x < 90 || x > WORLD_WIDTH - 90 || y < 90 || y > WORLD_HEIGHT - 90) return false;
    // Keep immediate spawn camp clearing tidy
    if (dist(x, y, cx, cy) < 130) return false;
    if (isInsidePond(x, y, radius + 24)) return false;
    for (const n of nodes) {
      if (dist(x, y, n.x, n.y) < radius + n.radius + 22) return false;
    }
    return true;
  };

  const spawnNode = (type: NodeType, x: number, y: number) => {
    const stats: Record<NodeType, { r: number; hp: number }> = {
      pine_tree: { r: 24, hp: 50 },
      oak_tree: { r: 28, hp: 65 },
      rock: { r: 22, hp: 55 },
      iron_vein: { r: 24, hp: 80 },
      berry_bush: { r: 18, hp: 22 },
      herb_plant: { r: 14, hp: 16 },
      ruin_crystal: { r: 24, hp: 90 },
    };
    const s = stats[type];
    if (!canPlaceNode(x, y, s.r)) return;
    nodes.push({
      id: nextId++,
      type,
      x,
      y,
      radius: s.r,
      hp: s.hp,
      maxHp: s.hp,
      hitFlash: 0,
      shakeTimer: 0,
      respawnTimer: 0,
      variant: Math.floor(Math.random() * 3),
    });
  };

  // Starter ring so player immediately sees wood, stone, and berries nearby
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + randRange(-0.15, 0.15);
    const d = randRange(165, 290);
    const t: NodeType = i % 3 === 0 ? 'rock' : i % 4 === 0 ? 'berry_bush' : 'pine_tree';
    spawnNode(t, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }

  // Ancient ruins clusters with Ember Shards (Köz Kristali) & Iron
  const ruinCenters = [
    { x: cx - 780, y: cy - 720 },
    { x: cx + 820, y: cy - 680 },
    { x: cx + 760, y: cy + 780 },
    { x: cx - 760, y: cy + 760 },
  ];
  for (const rc of ruinCenters) {
    spawnNode('ruin_crystal', rc.x, rc.y);
    spawnNode('ruin_crystal', rc.x + randRange(-95, 95), rc.y + randRange(-95, 95));
    for (let i = 0; i < 5; i++) {
      spawnNode(
        'iron_vein',
        rc.x + randRange(-180, 180),
        rc.y + randRange(-180, 180)
      );
    }
  }

  // Dense forest & biome scatter
  for (let i = 0; i < 190; i++) {
    const x = randRange(120, WORLD_WIDTH - 120);
    const y = randRange(120, WORLD_HEIGHT - 120);
    const r = Math.random();
    let type: NodeType = 'pine_tree';
    if (r < 0.34) type = 'pine_tree';
    else if (r < 0.56) type = 'oak_tree';
    else if (r < 0.72) type = 'rock';
    else if (r < 0.83) type = 'berry_bush';
    else if (r < 0.91) type = 'herb_plant';
    else type = 'iron_vein';
    spawnNode(type, x, y);
  }

  // Initial campfire slightly offset from spawn
  const structures = [
    {
      id: nextId++,
      type: 'campfire' as const,
      x: cx + 68,
      y: cy - 28,
      radius: 20,
      hp: 120,
      maxHp: 120,
      fuel: 75,
      maxFuel: 120,
      hitFlash: 0,
    },
  ];

  // Monsters ONLY appear at night, so daytime begins peaceful
  const enemies: Enemy[] = [];

  const isCreative = mode === 'CREATIVE';
  const hotbar: HotbarSlot[] = isCreative
    ? [
        { itemId: 'axe', count: 1 },
        { itemId: 'iron_spear', count: 1 },
        { itemId: 'torch', count: 1 },
        { itemId: 'shelter_kit', count: 10 },
        { itemId: 'wall_kit', count: 20 },
        { itemId: 'campfire_kit', count: 10 },
        { itemId: 'torch_post_kit', count: 10 },
        { itemId: 'bow', count: 1 },
      ]
    : [
        { itemId: 'hand', count: 1 },
        { itemId: 'torch', count: 1 },
        { itemId: 'water_flask', count: 1 },
        { itemId: 'berries', count: 3 },
        { itemId: null, count: 0 },
        { itemId: null, count: 0 },
        { itemId: null, count: 0 },
        { itemId: null, count: 0 },
      ];

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    mode,
    difficulty,
    day: 1,
    timeOfDay: 0.08, // Morning light
    dayLengthSeconds: DAY_LENGTH_SECONDS,
    weather: 'CLEAR',
    weatherTimer: 45,
    player: {
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: 15,
      angle: 0,
      hp: 100,
      maxHp: 100,
      hunger: 92,
      maxHunger: 100,
      thirst: 92,
      maxThirst: 100,
      warmth: 90,
      maxWarmth: 100,
      stamina: 100,
      maxStamina: 100,
      attackTimer: 0,
      attackSwingAngle: 0,
      swingDuration: 0.22,
      invulnTimer: 0,
      hitFlash: 0,
      flaskCharges: 2,
      maxFlaskCharges: 3,
      stepAccumulator: 0,
    },
    resources: isCreative
      ? {
          wood: 999,
          stone: 999,
          fiber: 999,
          berries: 999,
          raw_meat: 999,
          cooked_meat: 999,
          iron: 999,
          herbs: 999,
          ember_shard: 999,
        }
      : {
          wood: 4,
          stone: 2,
          fiber: 2,
          berries: 3,
          raw_meat: 0,
          cooked_meat: 0,
          iron: 0,
          herbs: 0,
          ember_shard: 0,
        },
    hotbar,
    selectedSlot: 0,
    nodes,
    ponds,
    structures,
    enemies,
    projectiles: [],
    particles: [],
    floatingTexts: [],
    camera: { x: cx, y: cy, shake: 0 },
    kills: 0,
    gatheredTotal: 0,
    craftedTotal: 0,
    beaconLit: false,
    beaconDefenseTimer: 0,
    beaconTargetSeconds: BEACON_DEFENSE_SECONDS,
    causeOfDeath: '',
    phaseBannerText: isCreative ? 'Yaratıcı Mod · 1. Gün' : '1. Gün · Şafak',
    phaseBannerTimer: 3.4,
    nextId,
  };
}
