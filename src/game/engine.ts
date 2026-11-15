import { soundEngine } from './audio';
import {
  BEACON_DEFENSE_SECONDS,
  CRAFT_RECIPES,
  ITEM_DEFINITIONS,
  RESOURCE_META,
} from './constants';
import {
  CraftRecipe,
  Enemy,
  EnemyType,
  GameWorld,
  HudSnapshot,
  ItemId,
  ResourceId,
  StructureType,
  TimePhase,
  WaterPond,
  WorldNode,
} from './types';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  joyX: number;
  joyY: number;
  sprint: boolean;
  attackHeld: boolean;
  touchAttackHeld: boolean;
  mouseScreenX: number;
  mouseScreenY: number;
  mouseMovedRecently: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function getTimePhase(timeOfDay: number): TimePhase {
  if (timeOfDay < 0.14) return 'DAWN';
  if (timeOfDay < 0.56) return 'DAY';
  if (timeOfDay < 0.68) return 'DUSK';
  return 'NIGHT';
}

export function getDarknessLevel(timeOfDay: number, weather: GameWorld['weather']): number {
  let dark = 0;
  if (timeOfDay < 0.14) {
    // Dawn fades from 0.45 -> 0
    dark = 0.45 * (1 - timeOfDay / 0.14);
  } else if (timeOfDay < 0.54) {
    dark = 0;
  } else if (timeOfDay < 0.68) {
    // Dusk climbs 0 -> 0.86
    const t = (timeOfDay - 0.54) / 0.14;
    dark = 0.86 * t;
  } else if (timeOfDay < 0.92) {
    dark = 0.88;
  } else {
    // Pre-dawn eases 0.88 -> 0.45
    const t = (timeOfDay - 0.92) / 0.08;
    dark = 0.88 - 0.43 * t;
  }
  if (weather === 'RAIN') dark = Math.min(0.92, dark + 0.14);
  if (weather === 'FOG') dark = Math.min(0.88, dark + 0.08);
  return dark;
}

export function isPointInPond(x: number, y: number, ponds: WaterPond[], pad = 0): boolean {
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
}

export function isNearPond(x: number, y: number, ponds: WaterPond[], margin = 46): boolean {
  return isPointInPond(x, y, ponds, margin);
}

export function addFloatingText(
  world: GameWorld,
  x: number,
  y: number,
  text: string,
  color: string
) {
  world.floatingTexts.push({
    id: world.nextId++,
    x: x + (Math.random() - 0.5) * 16,
    y: y - 14,
    text,
    color,
    life: 1.05,
    maxLife: 1.05,
  });
}

export function spawnParticles(
  world: GameWorld,
  x: number,
  y: number,
  count: number,
  color: string,
  kind: GameWorld['particles'][number]['kind'],
  speed = 90
) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.75);
    const life = kind === 'smoke' ? 0.9 + Math.random() * 0.6 : 0.35 + Math.random() * 0.35;
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - (kind === 'smoke' ? 28 : 0),
      size: kind === 'chip' ? 3 + Math.random() * 3 : 2 + Math.random() * 2.5,
      alpha: 1,
      life,
      maxLife: life,
      color,
      kind,
    });
  }
}

export function addHotbarItem(world: GameWorld, itemId: ItemId, count: number): boolean {
  const def = ITEM_DEFINITIONS[itemId];
  const stackable = def.kind === 'consumable' || def.kind === 'structure';
  if (stackable) {
    const existing = world.hotbar.find((s) => s.itemId === itemId);
    if (existing) {
      existing.count += count;
      return true;
    }
  } else {
    // For tools/weapons, avoid duplicates if already owned
    const existing = world.hotbar.find((s) => s.itemId === itemId);
    if (existing) {
      return true;
    }
  }
  const empty = world.hotbar.find((s) => s.itemId === null);
  if (empty) {
    empty.itemId = itemId;
    empty.count = count;
    return true;
  }
  return false;
}

function addResource(world: GameWorld, id: ResourceId, amount: number) {
  world.resources[id] += amount;
  world.gatheredTotal += amount;
  if (id === 'berries') {
    addHotbarItem(world, 'berries', amount);
  } else if (id === 'cooked_meat') {
    addHotbarItem(world, 'cooked_meat', amount);
  }
}

export function isPlayerNearFire(world: GameWorld): boolean {
  const { player, structures } = world;
  for (const s of structures) {
    if (
      (s.type === 'campfire' && s.fuel > 0) ||
      (s.type === 'signal_beacon' && world.beaconLit)
    ) {
      if (dist(player.x, player.y, s.x, s.y) < 155) return true;
    }
  }
  return false;
}

export function isPlayerNearShelter(world: GameWorld): boolean {
  const { player, structures } = world;
  for (const s of structures) {
    if (s.type === 'shelter' && dist(player.x, player.y, s.x, s.y) < 115) {
      return true;
    }
  }
  return false;
}

export function isPlayerInsideShelter(world: GameWorld): boolean {
  const { player, structures } = world;
  for (const s of structures) {
    if (s.type === 'shelter' && Math.abs(player.x - s.x) < 40 && Math.abs(player.y - s.y) < 34) {
      return true;
    }
  }
  return false;
}

export function canCraftRecipe(world: GameWorld, recipe: CraftRecipe): boolean {
  if (world.mode === 'CREATIVE') return true;
  if (recipe.requiresNearFire && !isPlayerNearFire(world)) return false;
  for (const [resKey, cost] of Object.entries(recipe.costs)) {
    const res = resKey as ResourceId;
    if ((world.resources[res] || 0) < (cost || 0)) return false;
  }
  return true;
}

export function craftRecipe(world: GameWorld, recipeId: string): boolean {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraftRecipe(world, recipe)) return false;

  // Check if hotbar has room before consuming
  const def = ITEM_DEFINITIONS[recipe.resultItem];
  const alreadyHasTool =
    def.kind !== 'consumable' &&
    def.kind !== 'structure' &&
    world.hotbar.some((s) => s.itemId === recipe.resultItem);

  if (alreadyHasTool) {
    addFloatingText(world, world.player.x, world.player.y - 20, 'Zaten Sahipsin', '#FBBF24');
    return false;
  }

  if (world.mode !== 'CREATIVE') {
    for (const [resKey, cost] of Object.entries(recipe.costs)) {
      const res = resKey as ResourceId;
      world.resources[res] -= cost || 0;
      if (res === 'berries' || res === 'cooked_meat') {
        const slot = world.hotbar.find((s) => s.itemId === res);
        if (slot) {
          slot.count = Math.max(0, slot.count - (cost || 0));
          if (slot.count === 0) {
            slot.itemId = null;
          }
        }
      }
    }

    if (recipe.resultItem === 'cooked_meat') {
      world.resources.cooked_meat += recipe.resultCount;
    }
  }

  const placed = addHotbarItem(world, recipe.resultItem, recipe.resultCount);
  if (!placed) {
    // Refund if hotbar completely full
    for (const [resKey, cost] of Object.entries(recipe.costs)) {
      world.resources[resKey as ResourceId] += cost || 0;
    }
    addFloatingText(world, world.player.x, world.player.y - 20, 'Çanta Dolu!', '#EF4444');
    return false;
  }

  world.craftedTotal += 1;
  soundEngine.playCraft();
  addFloatingText(
    world,
    world.player.x,
    world.player.y - 24,
    `+ ${recipe.name}`,
    '#F59E0B'
  );

  // Auto-select newly crafted item
  const idx = world.hotbar.findIndex((s) => s.itemId === recipe.resultItem);
  if (idx !== -1) world.selectedSlot = idx;

  return true;
}

export function useSelectedItem(world: GameWorld): boolean {
  const slot = world.hotbar[world.selectedSlot];
  if (!slot || !slot.itemId) return false;
  const def = ITEM_DEFINITIONS[slot.itemId];
  const p = world.player;

  if (def.kind === 'consumable') {
    if (slot.itemId === 'water_flask') {
      if (p.flaskCharges <= 0) {
        addFloatingText(world, p.x, p.y - 18, 'Matara Boş! Gölete Git', '#60A5FA');
        return true;
      }
      p.flaskCharges -= 1;
      p.thirst = clamp(p.thirst + (def.thirstRestore || 40), 0, p.maxThirst);
      p.warmth = clamp(p.warmth + (def.warmthRestore || 0), 0, p.maxWarmth);
      soundEngine.playDrink();
      addFloatingText(world, p.x, p.y - 18, '+45 Susuzluk', '#38BDF8');
      return true;
    }

    p.hunger = clamp(p.hunger + (def.hungerRestore || 0), 0, p.maxHunger);
    p.thirst = clamp(p.thirst + (def.thirstRestore || 0), 0, p.maxThirst);
    p.hp = clamp(p.hp + (def.hpRestore || 0), 0, p.maxHp);
    p.warmth = clamp(p.warmth + (def.warmthRestore || 0), 0, p.maxWarmth);
    soundEngine.playEat();
    const label = def.hpRestore && def.hpRestore > 20 ? `+${def.hpRestore} Can` : `${def.name} Yenildi`;
    addFloatingText(world, p.x, p.y - 18, label, '#34D399');

    if (slot.itemId === 'berries') {
      world.resources.berries = Math.max(0, world.resources.berries - 1);
    } else if (slot.itemId === 'cooked_meat') {
      world.resources.cooked_meat = Math.max(0, world.resources.cooked_meat - 1);
    }

    slot.count -= 1;
    if (slot.count <= 0) {
      slot.itemId = null;
      slot.count = 0;
      world.selectedSlot = 0;
    }
    return true;
  }

  if (def.kind === 'structure' && def.placeStructureType) {
    return tryPlaceStructure(world, def.placeStructureType, slot);
  }

  return false;
}

function tryPlaceStructure(
  world: GameWorld,
  type: StructureType,
  slot: GameWorld['hotbar'][number]
): boolean {
  const p = world.player;
  const placeDist = type === 'signal_beacon' ? 68 : 54;
  const tx = clamp(p.x + Math.cos(p.angle) * placeDist, 80, world.width - 80);
  const ty = clamp(p.y + Math.sin(p.angle) * placeDist, 80, world.height - 80);

  const radiusMap: Record<StructureType, number> = {
    campfire: 20,
    wooden_wall: 22,
    torch_post: 14,
    shelter: 38,
    signal_beacon: 28,
  };
  const r = radiusMap[type];

  if (isPointInPond(tx, ty, world.ponds, r + 6)) {
    addFloatingText(world, tx, ty, 'Suyun Üstüne Kurulamaz', '#F87171');
    return true;
  }

  for (const n of world.nodes) {
    if (n.respawnTimer <= 0 && dist(tx, ty, n.x, n.y) < r + n.radius + 4) {
      addFloatingText(world, tx, ty, 'Alan Dolu', '#F87171');
      return true;
    }
  }
  for (const s of world.structures) {
    if (dist(tx, ty, s.x, s.y) < r + s.radius + 4) {
      addFloatingText(world, tx, ty, 'Çok Yakın!', '#F87171');
      return true;
    }
  }

  const stats: Record<StructureType, { hp: number; fuel: number; maxFuel: number }> = {
    campfire: { hp: 120, fuel: 100, maxFuel: 120 },
    wooden_wall: { hp: 180, fuel: 0, maxFuel: 0 },
    torch_post: { hp: 90, fuel: 9999, maxFuel: 9999 },
    shelter: { hp: 260, fuel: 0, maxFuel: 0 },
    signal_beacon: { hp: 360, fuel: 0, maxFuel: 100 },
  };
  const st = stats[type];

  world.structures.push({
    id: world.nextId++,
    type,
    x: tx,
    y: ty,
    radius: r,
    hp: st.hp,
    maxHp: st.hp,
    fuel: st.fuel,
    maxFuel: st.maxFuel,
    hitFlash: 0,
  });

  soundEngine.playPlace();
  spawnParticles(world, tx, ty, 12, '#F59E0B', 'spark', 75);
  addFloatingText(
    world,
    tx,
    ty - 20,
    type === 'signal_beacon' ? 'Kule Kuruldu! [E] ile Yak' : 'Yapı Kuruldu',
    '#FBBF24'
  );

  if (world.mode !== 'CREATIVE') {
    slot.count -= 1;
    if (slot.count <= 0) {
      slot.itemId = null;
      slot.count = 0;
      world.selectedSlot = 0;
    }
  }
  return true;
}

export function performContextInteract(world: GameWorld) {
  const p = world.player;

  // 1. Signal Beacon ignition!
  const beacon = world.structures.find(
    (s) => s.type === 'signal_beacon' && dist(p.x, p.y, s.x, s.y) < 105
  );
  if (beacon && !world.beaconLit) {
    world.beaconLit = true;
    world.beaconDefenseTimer = BEACON_DEFENSE_SECONDS;
    beacon.fuel = 100;
    soundEngine.playFireBurst();
    world.camera.shake = 10;
    world.phaseBannerText = 'İşaret Ateşi Yakıldı · 35 sn Koru!';
    world.phaseBannerTimer = 3.5;
    spawnParticles(world, beacon.x, beacon.y, 28, '#F59E0B', 'spark', 150);
    // Spawn dramatic raid wave around beacon
    for (let i = 0; i < 4; i++) {
      spawnEnemyNear(world, beacon.x, beacon.y, i === 0 ? 'alpha_beast' : 'shadow_stalker', 480);
    }
    return;
  }

  // 2. Water pond: drink + refill flask
  if (isNearPond(p.x, p.y, world.ponds, 48)) {
    p.thirst = clamp(p.thirst + 35, 0, p.maxThirst);
    p.flaskCharges = p.maxFlaskCharges;
    soundEngine.playDrink();
    addFloatingText(world, p.x, p.y - 20, 'Su İçildi · Matara Doldu', '#38BDF8');
    return;
  }

  // 3. Inside Baraka (Shelter): sleep until dawn at night or rest during day
  if (isPlayerInsideShelter(world)) {
    const phase = getTimePhase(world.timeOfDay);
    if (phase === 'DUSK' || phase === 'NIGHT') {
      world.day += 1;
      world.timeOfDay = 0.05;
      if (!world.beaconLit) {
        world.enemies = [];
      }
      p.hp = Math.min(p.maxHp, p.hp + 35);
      p.warmth = p.maxWarmth;
      soundEngine.playPhaseChime(false);
      world.phaseBannerText = `${world.day}. Gün · Barakada Uyudun`;
      world.phaseBannerTimer = 3.2;
      addFloatingText(world, p.x, p.y - 24, '+35 Can · Şafak Oldu', '#34D399');
      return;
    } else if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      p.warmth = p.maxWarmth;
      soundEngine.playCraft();
      addFloatingText(world, p.x, p.y - 24, 'Barakada Dinlendin (+25 Can)', '#34D399');
      return;
    }
  }

  // 4. Campfire: cook raw meat or add wood fuel
  const fire = world.structures
    .filter((s) => s.type === 'campfire')
    .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];

  if (fire && dist(p.x, p.y, fire.x, fire.y) < 110) {
    if (world.resources.raw_meat > 0 && fire.fuel > 0) {
      if (world.mode !== 'CREATIVE') world.resources.raw_meat -= 1;
      addResource(world, 'cooked_meat', 1);
      soundEngine.playCraft();
      spawnParticles(world, fire.x, fire.y, 8, '#FB923C', 'spark', 60);
      addFloatingText(world, fire.x, fire.y - 18, '+1 Kızarmış Et', '#FB923C');
      return;
    }
    if (world.resources.wood > 0 && fire.fuel < fire.maxFuel - 5) {
      if (world.mode !== 'CREATIVE') world.resources.wood -= 1;
      fire.fuel = Math.min(fire.maxFuel, fire.fuel + 45);
      soundEngine.playFireBurst();
      spawnParticles(world, fire.x, fire.y, 10, '#F59E0B', 'spark', 85);
      addFloatingText(world, fire.x, fire.y - 18, '+Odun · Ateş Güçlendi', '#F59E0B');
      return;
    }
    if (fire.fuel <= 0 && world.resources.wood === 0) {
      addFloatingText(world, fire.x, fire.y - 18, 'Odun Gerekli!', '#F87171');
      return;
    }
  }
}

export function applySmartTouchAim(world: GameWorld) {
  const p = world.player;
  const slot = world.hotbar[world.selectedSlot];
  const itemId: ItemId = slot?.itemId || 'hand';
  const def = ITEM_DEFINITIONS[itemId];

  if (def.kind === 'structure' || def.kind === 'consumable') return;

  const enemySearchRadius = itemId === 'bow' ? 380 : (def.range || 60) + 46;
  let bestEnemy: Enemy | null = null;
  let bestEnemyD = Infinity;
  for (const e of world.enemies) {
    const d = dist(p.x, p.y, e.x, e.y) - e.radius;
    if (d <= enemySearchRadius && d < bestEnemyD) {
      bestEnemyD = d;
      bestEnemy = e;
    }
  }
  if (bestEnemy) {
    p.angle = Math.atan2(bestEnemy.y - p.y, bestEnemy.x - p.x);
    return;
  }

  const nodeSearchRadius = (def.range || 60) + 38;
  let bestNode: WorldNode | null = null;
  let bestNodeD = Infinity;
  for (const n of world.nodes) {
    if (n.respawnTimer > 0) continue;
    const d = dist(p.x, p.y, n.x, n.y) - n.radius;
    if (d <= nodeSearchRadius && d < bestNodeD) {
      bestNodeD = d;
      bestNode = n;
    }
  }
  if (bestNode) {
    p.angle = Math.atan2(bestNode.y - p.y, bestNode.x - p.x);
  }
}

export function triggerPrimaryAction(world: GameWorld, isTouch = false) {
  const p = world.player;
  if (p.attackTimer > 0) return;

  if (isTouch) {
    applySmartTouchAim(world);
  }

  const slot = world.hotbar[world.selectedSlot];
  const itemId: ItemId = slot?.itemId || 'hand';
  const def = ITEM_DEFINITIONS[itemId];

  // Consumables or structures trigger on click too
  if (def.kind === 'consumable' || def.kind === 'structure') {
    if (useSelectedItem(world)) {
      p.attackTimer = 0.25;
    }
    return;
  }

  // Bow shoots arrow
  if (itemId === 'bow') {
    p.attackTimer = def.cooldown || 0.45;
    p.swingDuration = 0.2;
    p.attackSwingAngle = p.angle;
    soundEngine.playBowShoot();
    world.projectiles.push({
      id: world.nextId++,
      x: p.x + Math.cos(p.angle) * 20,
      y: p.y + Math.sin(p.angle) * 20,
      vx: Math.cos(p.angle) * 560,
      vy: Math.sin(p.angle) * 560,
      damage: def.damage || 34,
      life: 0.9,
      fromPlayer: true,
    });
    return;
  }

  // Melee / Tool Swing
  p.attackTimer = def.cooldown || 0.36;
  p.swingDuration = 0.2;
  p.attackSwingAngle = p.angle;
  soundEngine.playSwing();

  const reach = def.range || 56;
  const hitCenterX = p.x + Math.cos(p.angle) * (reach * 0.55);
  const hitCenterY = p.y + Math.sin(p.angle) * (reach * 0.55);
  const hitRadius = reach * 0.62;

  // Hit Enemies first
  let hitAny = false;
  for (const e of world.enemies) {
    if (dist(hitCenterX, hitCenterY, e.x, e.y) <= hitRadius + e.radius) {
      let dmg = def.damage || 10;
      if (itemId === 'torch' && e.type === 'shadow_stalker') {
        dmg *= 1.8;
      }
      damageEnemy(world, e, dmg, p.x, p.y);
      hitAny = true;
    }
  }

  // Hit Resource Nodes
  if (!hitAny) {
    let bestNode: WorldNode | null = null;
    let bestD = Infinity;
    for (const n of world.nodes) {
      if (n.respawnTimer > 0) continue;
      const d = dist(hitCenterX, hitCenterY, n.x, n.y);
      if (d <= hitRadius + n.radius && d < bestD) {
        bestD = d;
        bestNode = n;
      }
    }
    if (bestNode) {
      harvestNode(world, bestNode, def);
    }
  }
}

function damageEnemy(
  world: GameWorld,
  e: Enemy,
  dmg: number,
  sourceX: number,
  sourceY: number
) {
  e.hp -= dmg;
  e.hitFlash = 0.16;
  e.state = 'CHASE';

  const a = Math.atan2(e.y - sourceY, e.x - sourceX);
  e.vx += Math.cos(a) * 190;
  e.vy += Math.sin(a) * 190;

  world.camera.shake = Math.max(world.camera.shake, 4.5);
  soundEngine.playHit(dmg >= 30);
  spawnParticles(world, e.x, e.y, 8, '#EF4444', 'blood', 110);
  addFloatingText(world, e.x, e.y - 12, `-${Math.round(dmg)}`, '#FCA5A5');

  if (e.hp <= 0) {
    world.kills += 1;
    spawnParticles(world, e.x, e.y, 16, '#DC2626', 'blood', 140);
    if (e.type === 'wolf' || e.type === 'boar') {
      const meat = e.type === 'boar' ? 2 : 1;
      addResource(world, 'raw_meat', meat);
      addFloatingText(world, e.x, e.y - 20, `+${meat} Çiğ Et`, '#F87171');
    } else if (e.type === 'shadow_stalker') {
      addResource(world, 'ember_shard', 1);
      addFloatingText(world, e.x, e.y - 20, '+1 Köz Kristali', '#F59E0B');
    } else if (e.type === 'alpha_beast') {
      addResource(world, 'raw_meat', 2);
      addResource(world, 'ember_shard', 2);
      addFloatingText(world, e.x, e.y - 20, '+2 Köz Kristali · +2 Et', '#F59E0B');
    }
  }
}

function harvestNode(
  world: GameWorld,
  node: WorldNode,
  tool: (typeof ITEM_DEFINITIONS)[ItemId]
) {
  let dmg = tool.damage || 10;
  if (node.type === 'pine_tree' || node.type === 'oak_tree') {
    dmg = tool.woodPower || 8;
    soundEngine.playChop();
    spawnParticles(world, node.x, node.y, 7, '#B45309', 'chip', 95);
  } else if (node.type === 'rock' || node.type === 'iron_vein' || node.type === 'ruin_crystal') {
    dmg = tool.stonePower || 5;
    soundEngine.playMine();
    const chipColor =
      node.type === 'ruin_crystal'
        ? '#F59E0B'
        : node.type === 'iron_vein'
          ? '#60A5FA'
          : '#94A3B8';
    spawnParticles(world, node.x, node.y, 7, chipColor, 'chip', 105);
  } else {
    dmg = 14;
    soundEngine.playRustle();
    spawnParticles(world, node.x, node.y, 6, '#4ADE80', 'chip', 70);
  }

  if (world.mode === 'CREATIVE') {
    dmg = node.maxHp;
  }

  node.hp -= dmg;
  node.hitFlash = 0.14;
  node.shakeTimer = 0.16;
  world.camera.shake = Math.max(world.camera.shake, 2.5);

  if (node.hp <= 0) {
    node.respawnTimer = node.type === 'ruin_crystal' ? 95 : 55;
    if (node.type === 'pine_tree') {
      addResource(world, 'wood', 3);
      addResource(world, 'fiber', 1);
      addFloatingText(world, node.x, node.y, '+3 Odun · +1 Lif', RESOURCE_META.wood.color);
    } else if (node.type === 'oak_tree') {
      addResource(world, 'wood', 4);
      addResource(world, 'fiber', 2);
      addFloatingText(world, node.x, node.y, '+4 Odun · +2 Lif', RESOURCE_META.wood.color);
    } else if (node.type === 'rock') {
      addResource(world, 'stone', 3);
      addFloatingText(world, node.x, node.y, '+3 Taş', RESOURCE_META.stone.color);
    } else if (node.type === 'iron_vein') {
      addResource(world, 'iron', 2);
      addResource(world, 'stone', 1);
      addFloatingText(world, node.x, node.y, '+2 Demir · +1 Taş', RESOURCE_META.iron.color);
    } else if (node.type === 'berry_bush') {
      addResource(world, 'berries', 2);
      addResource(world, 'fiber', 1);
      addFloatingText(world, node.x, node.y, '+2 Böğürtlen', RESOURCE_META.berries.color);
    } else if (node.type === 'herb_plant') {
      addResource(world, 'herbs', 2);
      addResource(world, 'fiber', 1);
      addFloatingText(world, node.x, node.y, '+2 Şifalı Ot', RESOURCE_META.herbs.color);
    } else if (node.type === 'ruin_crystal') {
      addResource(world, 'ember_shard', 1);
      addResource(world, 'stone', 2);
      addFloatingText(world, node.x, node.y, '+1 Köz Kristali', '#F59E0B');
    }
  }
}

function spawnEnemyNear(
  world: GameWorld,
  cx: number,
  cy: number,
  type: EnemyType,
  radiusDist: number
) {
  const a = Math.random() * Math.PI * 2;
  const ex = clamp(cx + Math.cos(a) * radiusDist, 80, world.width - 80);
  const ey = clamp(cy + Math.sin(a) * radiusDist, 80, world.height - 80);
  if (isPointInPond(ex, ey, world.ponds, 24)) return;

  const hardMult = world.difficulty === 'HARD' ? 1.25 : 1;
  const cfg: Record<EnemyType, { r: number; hp: number; spd: number; dmg: number }> = {
    wolf: { r: 16, hp: 55, spd: 142, dmg: Math.round(12 * hardMult) },
    boar: { r: 19, hp: 75, spd: 114, dmg: Math.round(15 * hardMult) },
    shadow_stalker: { r: 18, hp: 90, spd: 168, dmg: Math.round(18 * hardMult) },
    alpha_beast: { r: 26, hp: 210, spd: 132, dmg: Math.round(24 * hardMult) },
  };
  const c = cfg[type];
  world.enemies.push({
    id: world.nextId++,
    type,
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    radius: c.r,
    hp: c.hp,
    maxHp: c.hp,
    speed: c.spd,
    damage: c.dmg,
    attackCooldown: 0,
    hitFlash: 0,
    state: type === 'shadow_stalker' || type === 'alpha_beast' ? 'CHASE' : 'ROAM',
    roamAngle: Math.random() * Math.PI * 2,
    roamTimer: 2,
    angle: 0,
  });
}

export function updateGameWorld(
  world: GameWorld,
  dt: number,
  input: InputState,
  canvasWidth: number,
  canvasHeight: number
): 'PLAYING' | 'GAME_OVER' | 'VICTORY' {
  const p = world.player;
  const prevPhase = getTimePhase(world.timeOfDay);

  // 1. Time of Day & Weather (Monsters ONLY come at Night!)
  world.timeOfDay += dt / world.dayLengthSeconds;
  if (world.timeOfDay >= 1) {
    world.timeOfDay -= 1;
    world.day += 1;
    world.phaseBannerText = `${world.day}. Gün · Şafak · Canavarlar Çekildi`;
    world.phaseBannerTimer = 3.2;
    soundEngine.playPhaseChime(false);
    if (!world.beaconLit) {
      for (const e of world.enemies) {
        spawnParticles(world, e.x, e.y, 8, '#64748B', 'smoke', 55);
      }
      world.enemies = [];
    }
  }

  const nextPhase = getTimePhase(world.timeOfDay);
  if (prevPhase !== nextPhase) {
    if (nextPhase === 'DUSK') {
      world.phaseBannerText = `${world.day}. Gün · Alacakaranlık`;
      world.phaseBannerTimer = 2.8;
    } else if (nextPhase === 'NIGHT') {
      world.phaseBannerText = `${world.day}. Gece · Kurtlar ve Gölgeler Çıkıyor`;
      world.phaseBannerTimer = 3.4;
      soundEngine.playPhaseChime(true);
      const packCount = Math.min(6, 3 + world.day);
      for (let i = 0; i < packCount; i++) {
        const type: EnemyType =
          i % 3 === 0 ? 'shadow_stalker' : i % 4 === 1 ? 'boar' : 'wolf';
        spawnEnemyNear(world, p.x, p.y, type, 440 + Math.random() * 180);
      }
      if (world.day >= 2) {
        spawnEnemyNear(world, p.x, p.y, 'alpha_beast', 560);
      }
    }
  }

  // Trickle night spawns while dark
  if (nextPhase === 'NIGHT' && !world.beaconLit && world.enemies.length < 8 + world.day * 2) {
    if (Math.random() < dt * 0.25) {
      const t: EnemyType = Math.random() < 0.55 ? 'wolf' : Math.random() < 0.8 ? 'shadow_stalker' : 'boar';
      spawnEnemyNear(world, p.x, p.y, t, 480 + Math.random() * 140);
    }
  }

  if (world.phaseBannerTimer > 0) {
    world.phaseBannerTimer = Math.max(0, world.phaseBannerTimer - dt);
  }

  // Weather changes periodically
  world.weatherTimer -= dt;
  if (world.weatherTimer <= 0) {
    const r = Math.random();
    world.weather = r < 0.56 ? 'CLEAR' : r < 0.8 ? 'FOG' : 'RAIN';
    world.weatherTimer = 30 + Math.random() * 35;
  }

  // 2. Beacon Defense Victory Countdown
  if (world.beaconLit) {
    world.beaconDefenseTimer -= dt;
    if (Math.random() < dt * 0.45 && world.enemies.length < 24) {
      const beacon = world.structures.find((s) => s.type === 'signal_beacon');
      if (beacon) {
        spawnEnemyNear(world, beacon.x, beacon.y, 'shadow_stalker', 490);
      }
    }
    if (world.beaconDefenseTimer <= 0) {
      world.beaconDefenseTimer = 0;
      soundEngine.playVictory();
      return 'VICTORY';
    }
  }

  // 3. Player Movement & Aiming (supports keyboard + analog tablet joystick)
  const keyX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const keyY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let mx = keyX !== 0 || keyY !== 0 ? keyX : input.joyX;
  let my = keyX !== 0 || keyY !== 0 ? keyY : input.joyY;
  const rawMag = Math.hypot(mx, my);
  const moveFactor = rawMag > 1 ? 1 : rawMag;
  if (rawMag > 0.001) {
    mx /= rawMag;
    my /= rawMag;
  } else {
    mx = 0;
    my = 0;
  }

  const isMoving = moveFactor > 0.08;
  const isSprinting = input.sprint && isMoving && p.stamina > 4;
  const baseSpeed = isSprinting ? 268 : 182;
  if (isSprinting) {
    p.stamina = Math.max(0, p.stamina - 24 * dt);
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + 16 * dt);
  }

  p.vx = mx * baseSpeed * moveFactor;
  p.vy = my * baseSpeed * moveFactor;

  const prevX = p.x;
  const prevY = p.y;
  p.x = clamp(p.x + p.vx * dt, p.radius + 16, world.width - p.radius - 16);
  p.y = clamp(p.y + p.vy * dt, p.radius + 16, world.height - p.radius - 16);

  // Prevent walking deep into water ponds (allow wading edge slightly)
  if (isPointInPond(p.x, p.y, world.ponds, -6)) {
    p.x = prevX;
    p.y = prevY;
  }

  // Collide player with solid nodes & structures
  for (const n of world.nodes) {
    if (n.respawnTimer > 0 || n.type === 'herb_plant' || n.type === 'berry_bush') continue;
    const minD = p.radius + n.radius * 0.72;
    const d = dist(p.x, p.y, n.x, n.y);
    if (d < minD && d > 0.01) {
      const push = minD - d;
      p.x += ((p.x - n.x) / d) * push;
      p.y += ((p.y - n.y) / d) * push;
    }
  }
  for (const s of world.structures) {
    if (s.type === 'shelter') continue; // can walk inside shelter canopy
    const minD = p.radius + s.radius * 0.85;
    const d = dist(p.x, p.y, s.x, s.y);
    if (d < minD && d > 0.01) {
      const push = minD - d;
      p.x += ((p.x - s.x) / d) * push;
      p.y += ((p.y - s.y) / d) * push;
    }
  }

  // Footprints when walking
  if (isMoving) {
    p.stepAccumulator += Math.hypot(p.x - prevX, p.y - prevY);
    if (p.stepAccumulator > 36) {
      p.stepAccumulator = 0;
      world.particles.push({
        x: p.x + (Math.random() - 0.5) * 6,
        y: p.y + 8,
        vx: 0,
        vy: 0,
        size: 3,
        alpha: 0.35,
        life: 2.2,
        maxLife: 2.2,
        color: '#0f172a',
        kind: 'footprint',
      });
    }
  }

  // Aim direction: mouse pointer in world space or movement direction
  if (input.mouseMovedRecently && !input.touchAttackHeld) {
    const worldMouseX = world.camera.x - canvasWidth / 2 + input.mouseScreenX;
    const worldMouseY = world.camera.y - canvasHeight / 2 + input.mouseScreenY;
    p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
  } else if (isMoving) {
    p.angle = Math.atan2(my, mx);
  }

  if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);

  if ((input.attackHeld || input.touchAttackHeld) && p.attackTimer <= 0) {
    const slot = world.hotbar[world.selectedSlot];
    const item = slot?.itemId ? ITEM_DEFINITIONS[slot.itemId] : ITEM_DEFINITIONS.hand;
    if (item.kind === 'tool' || item.kind === 'weapon') {
      triggerPrimaryAction(world, input.touchAttackHeld);
    }
  }

  // 4. Survival Meters (Creative Mode stays full & invincible)
  const hardMult = world.difficulty === 'HARD' ? 1.3 : 1.0;
  const nearFire = isPlayerNearFire(world);
  const nearShelter = isPlayerNearShelter(world);
  const inShelter = isPlayerInsideShelter(world);
  const holdingTorch = world.hotbar[world.selectedSlot]?.itemId === 'torch';

  if (world.mode === 'CREATIVE') {
    p.hp = p.maxHp;
    p.hunger = p.maxHunger;
    p.thirst = p.maxThirst;
    p.warmth = p.maxWarmth;
    p.stamina = p.maxStamina;
  } else {
    p.hunger = Math.max(0, p.hunger - (0.58 + (isSprinting ? 0.32 : 0)) * hardMult * dt);
    p.thirst = Math.max(0, p.thirst - (0.72 + (isSprinting ? 0.4 : 0)) * hardMult * dt);

    let warmthDelta = 0;
    if (nearFire || inShelter) {
      warmthDelta += inShelter ? 12 : 14;
    } else if (nearShelter) {
      warmthDelta += 3.5;
    } else {
      if (nextPhase === 'DAY') warmthDelta += 2.2;
      else if (nextPhase === 'DAWN') warmthDelta -= 0.4;
      else if (nextPhase === 'DUSK') warmthDelta -= 1.8;
      else warmthDelta -= 4.2 * hardMult;

      if (world.weather === 'RAIN') warmthDelta -= 3.2;
      else if (world.weather === 'FOG') warmthDelta -= 0.9;

      if (holdingTorch) warmthDelta += 2.6;
    }
    p.warmth = clamp(p.warmth + warmthDelta * dt, 0, p.maxWarmth);

    // Passive healing vs starvation/dehydration/freezing damage
    if (p.hunger > 60 && p.thirst > 60 && p.warmth > 50 && (nearFire || nearShelter)) {
      p.hp = Math.min(p.maxHp, p.hp + 1.8 * dt);
    }
    let dangerCause = '';
    if (p.hunger <= 0) {
      p.hp -= 3.4 * dt;
      dangerCause = 'Açlıktan tükendin.';
    }
    if (p.thirst <= 0) {
      p.hp -= 3.8 * dt;
      dangerCause = 'Susuzluktan düştün.';
    }
    if (p.warmth <= 0) {
      p.hp -= 4.5 * dt;
      dangerCause = 'Dondurucu soğuğa yenik düştün.';
    }

    if (p.hp <= 0) {
      p.hp = 0;
      if (!world.causeOfDeath) {
        world.causeOfDeath = dangerCause || 'Vahşi doğada hayatını kaybettin.';
      }
      soundEngine.playDeath();
      return 'GAME_OVER';
    }
  }

  // 5. Structures (Campfire fuel, sparks, shelter)
  for (let i = world.structures.length - 1; i >= 0; i--) {
    const s = world.structures[i];
    if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt);
    if (s.type === 'campfire' && s.fuel > 0) {
      const rainBurn = world.weather === 'RAIN' ? 1.45 : 1.0;
      s.fuel = Math.max(0, s.fuel - 0.85 * rainBurn * dt);
      if (Math.random() < dt * 8) {
        world.particles.push({
          x: s.x + (Math.random() - 0.5) * 10,
          y: s.y - 4,
          vx: (Math.random() - 0.5) * 18,
          vy: -28 - Math.random() * 26,
          size: 2 + Math.random() * 2,
          alpha: 1,
          life: 0.65,
          maxLife: 0.65,
          color: Math.random() < 0.5 ? '#F59E0B' : '#EF4444',
          kind: 'spark',
        });
      }
      if (Math.random() < dt * 2.5) {
        world.particles.push({
          x: s.x + (Math.random() - 0.5) * 8,
          y: s.y - 10,
          vx: (Math.random() - 0.5) * 10,
          vy: -22 - Math.random() * 14,
          size: 6 + Math.random() * 5,
          alpha: 0.35,
          life: 1.2,
          maxLife: 1.2,
          color: '#64748B',
          kind: 'smoke',
        });
      }
    }
    if (s.type === 'torch_post' && Math.random() < dt * 4) {
      world.particles.push({
        x: s.x + (Math.random() - 0.5) * 6,
        y: s.y - 14,
        vx: (Math.random() - 0.5) * 12,
        vy: -24,
        size: 2,
        alpha: 0.9,
        life: 0.45,
        maxLife: 0.45,
        color: '#FBBF24',
        kind: 'spark',
      });
    }
    if (s.type === 'signal_beacon' && world.beaconLit && Math.random() < dt * 14) {
      world.particles.push({
        x: s.x + (Math.random() - 0.5) * 14,
        y: s.y - 12,
        vx: (Math.random() - 0.5) * 28,
        vy: -55 - Math.random() * 45,
        size: 3 + Math.random() * 2,
        alpha: 1,
        life: 0.85,
        maxLife: 0.85,
        color: '#F59E0B',
        kind: 'spark',
      });
    }
    if (s.hp <= 0) {
      spawnParticles(world, s.x, s.y, 14, '#78350F', 'chip', 120);
      world.structures.splice(i, 1);
    }
  }

  // 6. Nodes Regrowth & Hit Timers
  for (const n of world.nodes) {
    if (n.hitFlash > 0) n.hitFlash = Math.max(0, n.hitFlash - dt);
    if (n.shakeTimer > 0) n.shakeTimer = Math.max(0, n.shakeTimer - dt);
    if (n.respawnTimer > 0) {
      n.respawnTimer -= dt;
      if (n.respawnTimer <= 0) {
        n.respawnTimer = 0;
        n.hp = n.maxHp;
      }
    }
  }

  // 7. Projectiles
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const proj = world.projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;

    let remove = proj.life <= 0;
    if (!remove && proj.fromPlayer) {
      for (const e of world.enemies) {
        if (dist(proj.x, proj.y, e.x, e.y) <= e.radius + 6) {
          damageEnemy(world, e, proj.damage, proj.x - proj.vx, proj.y - proj.vy);
          remove = true;
          break;
        }
      }
    }
    if (remove) {
      world.projectiles.splice(i, 1);
    }
  }

  // 8. Enemies AI & Combat
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    if (e.hp <= 0) {
      world.enemies.splice(i, 1);
      continue;
    }

    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);

    // Shadow stalkers flee or weaken when dawn hits
    if (e.type === 'shadow_stalker' && nextPhase === 'DAY' && !world.beaconLit) {
      e.hp -= 18 * dt;
    }

    const dPlayer = dist(e.x, e.y, p.x, p.y);
    const aggroRange =
      e.type === 'shadow_stalker' || e.type === 'alpha_beast'
        ? 440
        : nextPhase === 'NIGHT'
          ? 300
          : 220;

    let targetX = p.x;
    let targetY = p.y;
    let targetStruct: GameWorld['structures'][number] | null = null;

    if (dPlayer < aggroRange || world.beaconLit) {
      e.state = 'CHASE';
    } else if (dPlayer > aggroRange * 1.4) {
      e.state = 'ROAM';
    }

    // Shadow stalkers hesitate right next to bright campfires unless beacon is lit
    if (e.type === 'shadow_stalker' && !world.beaconLit) {
      for (const s of world.structures) {
        if (s.type === 'campfire' && s.fuel > 0 && dist(e.x, e.y, s.x, s.y) < 115) {
          e.state = 'FLEE';
          targetX = e.x + (e.x - s.x);
          targetY = e.y + (e.y - s.y);
          break;
        }
      }
    }

    if (e.state === 'ROAM') {
      e.roamTimer -= dt;
      if (e.roamTimer <= 0) {
        e.roamAngle += (Math.random() - 0.5) * 2.2;
        e.roamTimer = 2 + Math.random() * 3;
      }
      e.vx = e.vx * 0.86 + Math.cos(e.roamAngle) * (e.speed * 0.42) * 0.14;
      e.vy = e.vy * 0.86 + Math.sin(e.roamAngle) * (e.speed * 0.42) * 0.14;
      e.angle = Math.atan2(e.vy, e.vx);
    } else {
      // Check if a wooden wall or beacon is blocking path
      if (world.beaconLit) {
        const beacon = world.structures.find((s) => s.type === 'signal_beacon');
        if (beacon && dist(e.x, e.y, beacon.x, beacon.y) < dPlayer) {
          targetX = beacon.x;
          targetY = beacon.y;
          targetStruct = beacon;
        }
      }

      const a = Math.atan2(targetY - e.y, targetX - e.x);
      const spd = e.state === 'FLEE' ? e.speed * 1.15 : e.speed;
      e.vx = e.vx * 0.82 + Math.cos(a) * spd * 0.18;
      e.vy = e.vy * 0.82 + Math.sin(a) * spd * 0.18;
      e.angle = a;
    }

    const oldEx = e.x;
    const oldEy = e.y;
    e.x = clamp(e.x + e.vx * dt, e.radius + 20, world.width - e.radius - 20);
    e.y = clamp(e.y + e.vy * dt, e.radius + 20, world.height - e.radius - 20);

    if (isPointInPond(e.x, e.y, world.ponds, -4)) {
      e.x = oldEx;
      e.y = oldEy;
      e.roamAngle += Math.PI * 0.6;
    }

    // Collide & Keep Enemies Outside Shelter (Baraka) and Attack Wooden Walls / Beacon
    for (const s of world.structures) {
      const blockR = s.type === 'shelter' ? s.radius + 14 : s.radius;
      const minD = e.radius + blockR;
      const ds = dist(e.x, e.y, s.x, s.y);
      if (ds < minD && ds > 0.01) {
        const push = minD - ds;
        e.x += ((e.x - s.x) / ds) * push;
        e.y += ((e.y - s.y) / ds) * push;

        if ((s.type === 'wooden_wall' || s === targetStruct) && e.attackCooldown <= 0) {
          e.attackCooldown = 1.1;
          s.hp -= e.damage * 0.9;
          s.hitFlash = 0.15;
          soundEngine.playChop();
          spawnParticles(world, s.x, s.y, 5, '#92400E', 'chip', 70);
        }
      }
    }

    // Attack Player (if not in Creative Mode and not safe inside Baraka)
    const dp = dist(e.x, e.y, p.x, p.y);
    if (
      world.mode !== 'CREATIVE' &&
      !inShelter &&
      dp < e.radius + p.radius + 8 &&
      e.attackCooldown <= 0 &&
      p.invulnTimer <= 0
    ) {
      e.attackCooldown = 1.05;
      p.invulnTimer = 0.45;
      p.hitFlash = 0.22;
      p.hp = Math.max(0, p.hp - e.damage);
      world.camera.shake = Math.max(world.camera.shake, 7);
      soundEngine.playHit(true);
      spawnParticles(world, p.x, p.y, 10, '#EF4444', 'blood', 120);
      addFloatingText(world, p.x, p.y - 22, `-${e.damage} Can`, '#EF4444');

      if (p.hp <= 0) {
        const nameMap: Record<EnemyType, string> = {
          wolf: 'Vahşi bir kurt sürüsü tarafından avlandın.',
          boar: 'Kızgın bir yaban domuzu saldırısına yenik düştün.',
          shadow_stalker: 'Karanlıktaki bir Gölge Avcısı seni alt etti.',
          alpha_beast: 'Alfa Karanlık Canavarı karşısında düştün.',
        };
        world.causeOfDeath = nameMap[e.type];
        soundEngine.playDeath();
        return 'GAME_OVER';
      }
    }
  }

  // 9. Ambient Fireflies at Dusk/Night
  if ((nextPhase === 'DUSK' || nextPhase === 'NIGHT') && Math.random() < dt * 3.5) {
    world.particles.push({
      x: p.x + (Math.random() - 0.5) * 900,
      y: p.y + (Math.random() - 0.5) * 650,
      vx: (Math.random() - 0.5) * 22,
      vy: (Math.random() - 0.5) * 22,
      size: 2.2,
      alpha: 0.9,
      life: 2.5,
      maxLife: 2.5,
      color: '#BEF264',
      kind: 'firefly',
    });
  }

  // 10. Particles & Floating Texts
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.kind === 'chip' || pt.kind === 'blood') {
      pt.vx *= 0.9;
      pt.vy *= 0.9;
    }
    pt.life -= dt;
    pt.alpha = Math.max(0, pt.life / pt.maxLife);
    if (pt.life <= 0) world.particles.splice(i, 1);
  }

  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.y -= 26 * dt;
    ft.life -= dt;
    if (ft.life <= 0) world.floatingTexts.splice(i, 1);
  }

  // 11. Smooth Camera Follow + Shake Decay
  world.camera.x += (p.x - world.camera.x) * Math.min(1, dt * 8);
  world.camera.y += (p.y - world.camera.y) * Math.min(1, dt * 8);
  world.camera.shake = Math.max(0, world.camera.shake - dt * 26);

  return 'PLAYING';
}

export function buildHudSnapshot(world: GameWorld): HudSnapshot {
  const p = world.player;
  const nearFire = isPlayerNearFire(world);
  const nearWater = isNearPond(p.x, p.y, world.ponds, 48);
  const nearShelter = isPlayerNearShelter(world);
  const inShelter = isPlayerInsideShelter(world);
  const beacon = world.structures.find((s) => s.type === 'signal_beacon');
  const phase = getTimePhase(world.timeOfDay);

  let contextHint: string | null = null;
  if (beacon && !world.beaconLit && dist(p.x, p.y, beacon.x, beacon.y) < 105) {
    contextHint = '[E] Kurtuluş İşaret Kulesini Yak';
  } else if (inShelter) {
    if (phase === 'DUSK' || phase === 'NIGHT') {
      contextHint = '[E] Barakada Uyu (Şafağa Geç)';
    } else if (p.hp < p.maxHp) {
      contextHint = '[E] Barakada Dinlen (+Can)';
    }
  } else if (nearWater) {
    contextHint = '[E] Su İç ve Matarayı Doldur';
  } else if (nearFire) {
    if (world.resources.raw_meat > 0) {
      contextHint = '[E] Ateşte Et Pişir';
    } else if (world.resources.wood > 0) {
      contextHint = '[E] Ateşe Odun At';
    }
  }

  return {
    mode: world.mode,
    day: world.day,
    timeOfDay: world.timeOfDay,
    phase,
    weather: world.weather,
    hp: Math.round(p.hp),
    maxHp: p.maxHp,
    hunger: Math.round(p.hunger),
    maxHunger: p.maxHunger,
    thirst: Math.round(p.thirst),
    maxThirst: p.maxThirst,
    warmth: Math.round(p.warmth),
    maxWarmth: p.maxWarmth,
    stamina: Math.round(p.stamina),
    maxStamina: p.maxStamina,
    flaskCharges: p.flaskCharges,
    maxFlaskCharges: p.maxFlaskCharges,
    resources: { ...world.resources },
    hotbar: world.hotbar.map((s) => ({ ...s })),
    selectedSlot: world.selectedSlot,
    nearFire,
    nearWater,
    nearShelter,
    inShelter,
    contextHint,
    beaconBuilt: Boolean(beacon),
    beaconLit: world.beaconLit,
    beaconDefenseTimer: Math.ceil(world.beaconDefenseTimer),
    beaconTargetSeconds: world.beaconTargetSeconds,
    kills: world.kills,
    gatheredTotal: world.gatheredTotal,
    craftedTotal: world.craftedTotal,
    causeOfDeath: world.causeOfDeath,
    phaseBannerText: world.phaseBannerText,
    phaseBannerTimer: world.phaseBannerTimer,
  };
}
