export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export type GameMode = 'SURVIVAL' | 'CREATIVE';

export type Difficulty = 'NORMAL' | 'HARD';

export type TimePhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

export type WeatherType = 'CLEAR' | 'FOG' | 'RAIN';

export type ResourceId =
  | 'wood'
  | 'stone'
  | 'fiber'
  | 'berries'
  | 'raw_meat'
  | 'cooked_meat'
  | 'iron'
  | 'herbs'
  | 'ember_shard';

export type ItemId =
  | 'hand'
  | 'axe'
  | 'pickaxe'
  | 'spear'
  | 'iron_spear'
  | 'bow'
  | 'torch'
  | 'campfire_kit'
  | 'wall_kit'
  | 'torch_post_kit'
  | 'shelter_kit'
  | 'beacon_kit'
  | 'berries'
  | 'cooked_meat'
  | 'herbal_salve'
  | 'water_flask';

export type CraftCategory = 'TOOLS' | 'STRUCTURES' | 'SUPPLIES';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  kind: 'tool' | 'weapon' | 'consumable' | 'structure';
  damage?: number;
  woodPower?: number;
  stonePower?: number;
  range?: number;
  cooldown?: number;
  lightRadius?: number;
  placeStructureType?: StructureType;
  hungerRestore?: number;
  thirstRestore?: number;
  hpRestore?: number;
  warmthRestore?: number;
}

export interface CraftRecipe {
  id: string;
  resultItem: ItemId;
  resultCount: number;
  category: CraftCategory;
  name: string;
  description: string;
  costs: Partial<Record<ResourceId, number>>;
  requiresNearFire?: boolean;
}

export type NodeType =
  | 'pine_tree'
  | 'oak_tree'
  | 'rock'
  | 'iron_vein'
  | 'berry_bush'
  | 'herb_plant'
  | 'ruin_crystal';

export interface WorldNode {
  id: number;
  type: NodeType;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  shakeTimer: number;
  respawnTimer: number; // 0 if active, > 0 if depleted and regrowing
  variant: number;
}

export interface WaterPond {
  id: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
}

export type StructureType =
  | 'campfire'
  | 'wooden_wall'
  | 'torch_post'
  | 'shelter'
  | 'signal_beacon';

export interface Structure {
  id: number;
  type: StructureType;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  fuel: number; // seconds remaining for campfire/beacon
  maxFuel: number;
  hitFlash: number;
}

export type EnemyType = 'wolf' | 'boar' | 'shadow_stalker' | 'alpha_beast';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  hitFlash: number;
  state: 'ROAM' | 'CHASE' | 'FLEE';
  roamAngle: number;
  roamTimer: number;
  angle: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  fromPlayer: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'spark' | 'chip' | 'blood' | 'smoke' | 'firefly' | 'footprint' | 'ring';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HotbarSlot {
  itemId: ItemId | null;
  count: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  warmth: number;
  maxWarmth: number;
  stamina: number;
  maxStamina: number;
  attackTimer: number;
  attackSwingAngle: number;
  swingDuration: number;
  invulnTimer: number;
  hitFlash: number;
  flaskCharges: number;
  maxFlaskCharges: number;
  stepAccumulator: number;
}

export interface GameWorld {
  width: number;
  height: number;
  mode: GameMode;
  difficulty: Difficulty;
  day: number;
  timeOfDay: number; // 0..1 (0 = dawn, 0.25 = noon, 0.6 = dusk, 0.75 = midnight)
  dayLengthSeconds: number;
  weather: WeatherType;
  weatherTimer: number;
  player: Player;
  resources: Record<ResourceId, number>;
  hotbar: HotbarSlot[];
  selectedSlot: number;
  nodes: WorldNode[];
  ponds: WaterPond[];
  structures: Structure[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  camera: { x: number; y: number; shake: number };
  kills: number;
  gatheredTotal: number;
  craftedTotal: number;
  beaconLit: boolean;
  beaconDefenseTimer: number; // countdown once lit (e.g. 30s)
  beaconTargetSeconds: number;
  causeOfDeath: string;
  phaseBannerText: string;
  phaseBannerTimer: number;
  nextId: number;
}

export interface HudSnapshot {
  mode: GameMode;
  day: number;
  timeOfDay: number;
  phase: TimePhase;
  weather: WeatherType;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  warmth: number;
  maxWarmth: number;
  stamina: number;
  maxStamina: number;
  flaskCharges: number;
  maxFlaskCharges: number;
  resources: Record<ResourceId, number>;
  hotbar: HotbarSlot[];
  selectedSlot: number;
  nearFire: boolean;
  nearWater: boolean;
  nearShelter: boolean;
  inShelter: boolean;
  contextHint: string | null;
  beaconBuilt: boolean;
  beaconLit: boolean;
  beaconDefenseTimer: number;
  beaconTargetSeconds: number;
  kills: number;
  gatheredTotal: number;
  craftedTotal: number;
  causeOfDeath: string;
  phaseBannerText: string;
  phaseBannerTimer: number;
}
