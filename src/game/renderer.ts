import { ITEM_DEFINITIONS } from './constants';
import { getDarknessLevel, getTimePhase } from './engine';
import { getTexturePack } from './textures';
import { Enemy, GameWorld, Structure, WorldNode } from './types';

let lightCanvas: HTMLCanvasElement | null = null;
let lightCtx: CanvasRenderingContext2D | null = null;

function ensureLightCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCtx = lightCanvas.getContext('2d');
  }
  if (lightCanvas.width !== w || lightCanvas.height !== h) {
    lightCanvas.width = w;
    lightCanvas.height = h;
  }
  return lightCtx;
}

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  width: number,
  height: number,
  nowSec: number
) {
  const textures = getTexturePack(ctx);
  const shakeX = world.camera.shake > 0 ? (Math.random() - 0.5) * world.camera.shake * 2 : 0;
  const shakeY = world.camera.shake > 0 ? (Math.random() - 0.5) * world.camera.shake * 2 : 0;
  const camX = world.camera.x - width / 2 + shakeX;
  const camY = world.camera.y - height / 2 + shakeY;

  ctx.save();
  ctx.translate(-camX, -camY);

  // 1. Seamless Textured Forest Ground
  if (textures.forestPattern) {
    ctx.fillStyle = textures.forestPattern;
    ctx.fillRect(camX - 10, camY - 10, width + 20, height + 20);
  } else {
    ctx.fillStyle = '#1b2d21';
    ctx.fillRect(camX, camY, width, height);
  }

  // Central Camp Textured Dirt Clearing with soft radial blend
  const cx = world.width / 2;
  const cy = world.height / 2;
  if (
    cx + 180 > camX &&
    cx - 180 < camX + width &&
    cy + 180 > camY &&
    cy - 180 < camY + height
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 155, 0, Math.PI * 2);
    ctx.clip();
    if (textures.dirtPattern) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = textures.dirtPattern;
      ctx.fillRect(cx - 160, cy - 160, 320, 320);
    }
    ctx.restore();

    // Soft moss transition border around camp
    const ringGrad = ctx.createRadialGradient(cx, cy, 115, cx, cy, 165);
    ringGrad.addColorStop(0, 'rgba(27, 45, 33, 0)');
    ringGrad.addColorStop(1, 'rgba(27, 45, 33, 0.95)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 165, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ancient Ruin Stone Flagstones beneath Ruin Crystals
  for (const n of world.nodes) {
    if (n.type !== 'ruin_crystal') continue;
    if (n.x < camX - 120 || n.x > camX + width + 120 || n.y < camY - 120 || n.y > camY + height + 120) {
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x, n.y, 72, 0, Math.PI * 2);
    ctx.clip();
    if (textures.stonePattern) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = textures.stonePattern;
      ctx.fillRect(n.x - 75, n.y - 75, 150, 150);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 62, 0, Math.PI * 2);
    ctx.stroke();
  }

  // World Border Dark Timber Perimeter
  ctx.strokeStyle = '#09110c';
  ctx.lineWidth = 36;
  ctx.strokeRect(18, 18, world.width - 36, world.height - 36);

  // 2. Textured Water Ponds with Shore Foam & Reeds
  for (const pond of world.ponds) {
    if (
      pond.x + pond.rx < camX - 70 ||
      pond.x - pond.rx > camX + width + 70 ||
      pond.y + pond.ry < camY - 70 ||
      pond.y - pond.ry > camY + height + 70
    ) {
      continue;
    }
    ctx.save();
    ctx.translate(pond.x, pond.y);
    ctx.rotate(pond.rotation);

    // Wet pebble shore
    ctx.fillStyle = '#474033';
    ctx.beginPath();
    ctx.ellipse(0, 0, pond.rx + 15, pond.ry + 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shallow turquoise shelf
    ctx.fillStyle = '#256d7f';
    ctx.beginPath();
    ctx.ellipse(0, 0, pond.rx + 4, pond.ry + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Textured deep water clipped inside pond
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, pond.rx - 2, pond.ry - 2, 0, 0, Math.PI * 2);
    ctx.clip();
    if (textures.waterPattern) {
      ctx.translate(Math.sin(nowSec * 0.6) * 8, Math.cos(nowSec * 0.5) * 6);
      ctx.fillStyle = textures.waterPattern;
      ctx.fillRect(-pond.rx - 20, -pond.ry - 20, pond.rx * 2 + 40, pond.ry * 2 + 40);
    }
    ctx.restore();

    // Inner depth gradient
    const depthGrad = ctx.createRadialGradient(-12, -8, 10, 0, 0, Math.max(pond.rx, pond.ry));
    depthGrad.addColorStop(0, 'rgba(13, 47, 62, 0.35)');
    depthGrad.addColorStop(0.75, 'rgba(13, 47, 62, 0.12)');
    depthGrad.addColorStop(1, 'rgba(186, 230, 253, 0.18)');
    ctx.fillStyle = depthGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, pond.rx, pond.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated shore foam ring
    const rip = Math.sin(nowSec * 1.9 + pond.id) * 2.5;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.24)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, pond.rx - 5 + rip, pond.ry - 5 + rip * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Decorative lily pads
    ctx.fillStyle = '#2f7a44';
    for (let l = 0; l < 3; l++) {
      const la = pond.id * 1.3 + l * 2.1;
      const lx = Math.cos(la) * (pond.rx * 0.52);
      const ly = Math.sin(la) * (pond.ry * 0.52);
      ctx.beginPath();
      ctx.arc(lx, ly, 6.5, 0.2, Math.PI * 1.85);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 3. Footprints
  for (const pt of world.particles) {
    if (pt.kind !== 'footprint') continue;
    ctx.fillStyle = `rgba(10, 18, 14, ${pt.alpha * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, pt.size * 1.15, pt.size * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Placement Ghost Preview
  const activeSlot = world.hotbar[world.selectedSlot];
  if (activeSlot?.itemId) {
    const def = ITEM_DEFINITIONS[activeSlot.itemId];
    if (def.kind === 'structure' && def.placeStructureType) {
      const p = world.player;
      const d = def.placeStructureType === 'signal_beacon' ? 68 : 54;
      const gx = p.x + Math.cos(p.angle) * d;
      const gy = p.y + Math.sin(p.angle) * d;
      const rMap: Record<Structure['type'], number> = {
        campfire: 20,
        wooden_wall: 22,
        torch_post: 14,
        shelter: 38,
        signal_beacon: 28,
      };
      const gr = rMap[def.placeStructureType];
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5. Structures (draw Shelter interior floor BEFORE player, roof AFTER player)
  for (const s of world.structures) {
    if (s.type === 'shelter') {
      drawShelterInterior(ctx, s, nowSec);
      continue;
    }
    drawStructure(ctx, s, world, nowSec);
  }

  // 6. Resource Nodes
  for (const n of world.nodes) {
    if (n.respawnTimer > 0) continue;
    if (
      n.x < camX - 90 ||
      n.x > camX + width + 90 ||
      n.y < camY - 90 ||
      n.y > camY + height + 90
    ) {
      continue;
    }
    drawNode(ctx, n, nowSec);
  }

  // 7. Projectiles
  for (const proj of world.projectiles) {
    const a = Math.atan2(proj.vy, proj.vx);
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(a);
    // Arrow shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.lineTo(8, 5);
    ctx.stroke();
    // Shaft
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    // Fletching
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-16, -3);
    ctx.moveTo(-12, 0);
    ctx.lineTo(-16, 3);
    ctx.stroke();
    // Steel tip
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(5, -3.5);
    ctx.lineTo(5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 8. Enemies
  for (const e of world.enemies) {
    if (
      e.x < camX - 70 ||
      e.x > camX + width + 70 ||
      e.y < camY - 70 ||
      e.y > camY + height + 70
    ) {
      continue;
    }
    drawEnemy(ctx, e, nowSec);
  }

  // 9. Player
  drawPlayer(ctx, world, nowSec);

  // 10. Shelter Roof Canopies
  for (const s of world.structures) {
    if (s.type === 'shelter') {
      drawStructure(ctx, s, world, nowSec);
    }
  }

  // 11. Foreground Particles
  for (const pt of world.particles) {
    if (pt.kind === 'footprint') continue;
    ctx.save();
    ctx.globalAlpha = pt.alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // 12. Golden Hour / Dawn Atmospheric Tint
  const phase = getTimePhase(world.timeOfDay);
  if (phase === 'DAWN') {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.06)';
    ctx.fillRect(0, 0, width, height);
  } else if (phase === 'DUSK') {
    ctx.fillStyle = 'rgba(234, 88, 12, 0.09)';
    ctx.fillRect(0, 0, width, height);
  }

  // 13. Dynamic Darkness & Light Cone Layer
  const darkness = getDarknessLevel(world.timeOfDay, world.weather);
  if (darkness > 0.02) {
    const lctx = ensureLightCanvas(width, height);
    if (lctx && lightCanvas) {
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, width, height);
      lctx.fillStyle = `rgba(6, 10, 20, ${darkness})`;
      lctx.fillRect(0, 0, width, height);

      lctx.globalCompositeOperation = 'destination-out';

      const punchLight = (wx: number, wy: number, radius: number) => {
        const sx = wx - camX;
        const sy = wy - camY;
        if (sx < -radius || sx > width + radius || sy < -radius || sy > height + radius) return;
        const g = lctx.createRadialGradient(sx, sy, radius * 0.14, sx, sy, radius);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.65, 'rgba(0,0,0,0.65)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(sx, sy, radius, 0, Math.PI * 2);
        lctx.fill();
      };

      const p = world.player;
      const holdingTorch = world.hotbar[world.selectedSlot]?.itemId === 'torch';
      const flicker = Math.sin(nowSec * 11) * 6 + Math.cos(nowSec * 7) * 4;
      punchLight(p.x, p.y, holdingTorch ? 240 + flicker : 112);

      for (const s of world.structures) {
        if (s.type === 'campfire' && s.fuel > 0) {
          const fuelRatio = Math.max(0.45, s.fuel / s.maxFuel);
          punchLight(s.x, s.y, (220 + flicker * 1.4) * fuelRatio + 72);
        } else if (s.type === 'torch_post') {
          punchLight(s.x, s.y, 180 + flicker * 0.8);
        } else if (s.type === 'signal_beacon') {
          punchLight(s.x, s.y, world.beaconLit ? 370 + flicker * 2 : 115);
        } else if (s.type === 'shelter') {
          punchLight(s.x, s.y, 100);
        }
      }

      for (const n of world.nodes) {
        if (n.respawnTimer <= 0 && n.type === 'ruin_crystal') {
          punchLight(n.x, n.y, 125);
        }
      }

      ctx.drawImage(lightCanvas, 0, 0);
    }

    // Warm additive fire glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const drawWarmGlow = (wx: number, wy: number, r: number, alpha: number) => {
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(245, 130, 30, ${alpha})`);
      g.addColorStop(1, 'rgba(245, 130, 30, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (world.hotbar[world.selectedSlot]?.itemId === 'torch') {
      drawWarmGlow(world.player.x, world.player.y, 165, 0.2);
    }
    for (const s of world.structures) {
      if (s.type === 'campfire' && s.fuel > 0) {
        drawWarmGlow(s.x, s.y, 220, 0.26);
      } else if (s.type === 'torch_post') {
        drawWarmGlow(s.x, s.y, 140, 0.17);
      } else if (s.type === 'signal_beacon' && world.beaconLit) {
        drawWarmGlow(s.x, s.y, 330, 0.35);
      }
    }
    ctx.restore();

    // Eerie glowing enemy eyes in the dark
    if (darkness > 0.35) {
      ctx.save();
      ctx.translate(-camX, -camY);
      for (const e of world.enemies) {
        if (
          e.x < camX - 40 ||
          e.x > camX + width + 40 ||
          e.y < camY - 40 ||
          e.y > camY + height + 40
        ) {
          continue;
        }
        const ex = e.x + Math.cos(e.angle) * (e.radius * 0.55);
        const ey = e.y + Math.sin(e.angle) * (e.radius * 0.55);
        const perpX = -Math.sin(e.angle) * 4;
        const perpY = Math.cos(e.angle) * 4;
        ctx.fillStyle =
          e.type === 'shadow_stalker' || e.type === 'alpha_beast'
            ? '#FB7185'
            : '#FBBF24';
        ctx.beginPath();
        ctx.arc(ex + perpX, ey + perpY, 2.3, 0, Math.PI * 2);
        ctx.arc(ex - perpX, ey - perpY, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 14. Weather Overlay (Rain / Fog)
  if (world.weather === 'RAIN') {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 197, 248, 0.3)';
    ctx.lineWidth = 1.3;
    const dropCount = 110;
    for (let i = 0; i < dropCount; i++) {
      const rx = ((i * 197 + nowSec * 440) % (width + 120)) - 60;
      const ry = ((i * 313 + nowSec * 910) % (height + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 10, ry + 24);
      ctx.stroke();
    }
    ctx.restore();
  } else if (world.weather === 'FOG') {
    ctx.save();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.1)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 15. Subtle Atmospheric Edge Vignette
  const vig = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.34,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4, 8, 14, 0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 16. Floating Texts
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  for (const ft of world.floatingTexts) {
    ctx.globalAlpha = Math.min(1, ft.life / (ft.maxLife * 0.4));
    ctx.fillStyle = '#090d14';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: GameWorld, nowSec: number) {
  const p = world.player;
  const speed = Math.hypot(p.vx, p.vy);
  const walkBob = speed > 10 ? Math.sin(nowSec * 12) * 1.4 : 0;

  ctx.save();
  ctx.translate(p.x, p.y);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 7, p.radius * 1.05, p.radius * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  // Attack swing arc
  if (p.attackTimer > 0) {
    const slot = world.hotbar[world.selectedSlot];
    const item = slot?.itemId ? ITEM_DEFINITIONS[slot.itemId] : ITEM_DEFINITIONS.hand;
    if (item.id !== 'bow' && item.kind !== 'consumable' && item.kind !== 'structure') {
      const progress = Math.max(0, 1 - p.attackTimer / (item.cooldown || 0.36));
      if (progress < 0.62) {
        const reach = item.range || 54;
        ctx.save();
        ctx.strokeStyle =
          item.id === 'torch' ? 'rgba(251, 146, 60, 0.72)' : 'rgba(241, 245, 249, 0.65)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, reach * 0.72, p.attackSwingAngle - 0.75, p.attackSwingAngle + 0.75);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.rotate(p.angle);
  ctx.translate(0, walkBob);

  // Leather Backpack + Bedroll
  ctx.fillStyle = '#6c3211';
  ctx.strokeStyle = '#331504';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-16, -9.5, 10, 19, 3.5);
  ctx.fill();
  ctx.stroke();
  // Rolled blanket on pack
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-17, -7, 4, 14, 2);
  ctx.fill();

  // Equipped Weapon / Tool
  const itemId = world.hotbar[world.selectedSlot]?.itemId || 'hand';
  if (itemId === 'torch') {
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(23, 10);
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(19, 7.5, 5, 5);
    const fl = 4.5 + Math.sin(nowSec * 16) * 1.4;
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.arc(25, 10, fl + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(25, 10, fl * 0.65, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'axe') {
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(4, 9);
    ctx.lineTo(25, 9);
    ctx.stroke();
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(19, 9);
    ctx.lineTo(26, 2);
    ctx.lineTo(26, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'pickaxe') {
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(4, 9);
    ctx.lineTo(25, 9);
    ctx.stroke();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(19, 9, 8, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
  } else if (itemId === 'spear' || itemId === 'iron_spear') {
    ctx.strokeStyle = '#854D0E';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(31, 10);
    ctx.stroke();
    ctx.fillStyle = itemId === 'iron_spear' ? '#93C5FD' : '#E2E8F0';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(39, 10);
    ctx.lineTo(28, 5.5);
    ctx.lineTo(28, 14.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'bow') {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13, -13);
    ctx.lineTo(7, 0);
    ctx.lineTo(13, 13);
    ctx.stroke();
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10, 0, 14, -Math.PI * 0.43, Math.PI * 0.43);
    ctx.stroke();
  }

  // Cloak / Shoulders with highlight shading
  ctx.fillStyle = p.hitFlash > 0 ? '#EF4444' : '#334155';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12.5, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fur collar rim
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, -Math.PI * 0.7, Math.PI * 0.7);
  ctx.stroke();

  // Hood / Head with gradient shading
  const hoodGrad = ctx.createRadialGradient(4, -2, 1, 2, 0, 9.5);
  hoodGrad.addColorStop(0, p.hitFlash > 0 ? '#FECACA' : '#F59E0B');
  hoodGrad.addColorStop(1, p.hitFlash > 0 ? '#EF4444' : '#B45309');
  ctx.fillStyle = hoodGrad;
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(2, 0, 8.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawStarCanopy(
  ctx: CanvasRenderingContext2D,
  radius: number,
  points: number,
  fill: string,
  stroke?: string
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points;
    const r = i % 2 === 0 ? radius : radius * 0.72;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function drawNode(ctx: CanvasRenderingContext2D, n: WorldNode, nowSec: number) {
  const shakeX = n.shakeTimer > 0 ? Math.sin(nowSec * 65) * 3.5 : 0;
  const sway =
    n.type === 'pine_tree' || n.type === 'oak_tree'
      ? Math.sin(nowSec * 1.6 + n.id * 0.7) * 1.6
      : 0;

  ctx.save();
  ctx.translate(n.x + shakeX, n.y);

  // Soft Ground Shadow
  ctx.fillStyle = 'rgba(5, 10, 7, 0.42)';
  ctx.beginPath();
  ctx.ellipse(5, 8, n.radius * 1.05, n.radius * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  const flash = n.hitFlash > 0;

  if (n.type === 'pine_tree') {
    // Textured bark trunk
    ctx.fillStyle = '#3f1d0b';
    ctx.fillRect(-4.5, 0, 9, 13);
    ctx.save();
    ctx.translate(sway, 0);
    drawStarCanopy(ctx, n.radius * 1.08, 9, flash ? '#FDE68A' : '#0f3d22', '#092615');
    ctx.translate(-1.5, -2.5);
    drawStarCanopy(ctx, n.radius * 0.78, 8, flash ? '#FEF3C7' : '#165b32');
    ctx.translate(-1.5, -2.5);
    drawStarCanopy(ctx, n.radius * 0.48, 7, flash ? '#FFFFFF' : '#228048');
    ctx.restore();
  } else if (n.type === 'oak_tree') {
    // Gnarled trunk & root flares
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(-5.5, 0, 11, 14);
    ctx.save();
    ctx.translate(sway, 0);
    // Scalloped lush leaf clusters
    const lobes = [
      [0, 0, n.radius * 0.92, flash ? '#FDE68A' : '#1b4721'],
      [-8, -5, n.radius * 0.62, flash ? '#FEF3C7' : '#26612d'],
      [8, -3, n.radius * 0.58, flash ? '#FEF3C7' : '#2d7034'],
      [-3, 6, n.radius * 0.55, flash ? '#FEF3C7' : '#225528'],
      [2, -8, n.radius * 0.44, flash ? '#FFFFFF' : '#3a8840'],
    ] as const;
    for (const [lx, ly, lr, col] of lobes) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (n.type === 'rock' || n.type === 'iron_vein') {
    // Chiseled granite base
    ctx.fillStyle = flash ? '#F1F5F9' : '#475569';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-n.radius * 0.95, n.radius * 0.25);
    ctx.lineTo(-n.radius * 0.55, -n.radius * 0.85);
    ctx.lineTo(n.radius * 0.42, -n.radius * 0.82);
    ctx.lineTo(n.radius * 0.95, n.radius * 0.15);
    ctx.lineTo(n.radius * 0.35, n.radius * 0.88);
    ctx.lineTo(-n.radius * 0.65, n.radius * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top-left sunlit stone facet
    ctx.fillStyle = flash ? '#FFFFFF' : '#64748B';
    ctx.beginPath();
    ctx.moveTo(-n.radius * 0.52, -n.radius * 0.78);
    ctx.lineTo(n.radius * 0.36, -n.radius * 0.75);
    ctx.lineTo(0, -2);
    ctx.lineTo(-n.radius * 0.82, n.radius * 0.16);
    ctx.closePath();
    ctx.fill();

    // Crevice shadow line
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(4, 3);
    ctx.lineTo(10, 12);
    ctx.stroke();

    // Moss patches on lower edge
    ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
    ctx.beginPath();
    ctx.arc(-8, n.radius * 0.52, 6, 0, Math.PI * 2);
    ctx.fill();

    if (n.type === 'iron_vein') {
      // Gleaming crystalline ore veins
      const ore = [
        [-8, -6, 6],
        [5, -2, 7],
        [-3, 7, 5],
      ];
      for (const [ox, oy, os] of ore) {
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.moveTo(ox, oy - os);
        ctx.lineTo(ox + os * 0.8, oy);
        ctx.lineTo(ox, oy + os * 0.7);
        ctx.lineTo(ox - os * 0.7, oy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#BAE6FD';
        ctx.fillRect(ox - 1.5, oy - 2, 2.5, 2.5);
      }
    }
  } else if (n.type === 'berry_bush') {
    const tufts = [
      [0, 0, n.radius],
      [-7, -5, n.radius * 0.65],
      [7, -4, n.radius * 0.62],
      [4, 6, n.radius * 0.6],
    ];
    for (const [tx, ty, tr] of tufts) {
      ctx.fillStyle = flash ? '#BBF7D0' : '#166534';
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fill();
    }
    const berries = [
      [-6, -4],
      [6, -6],
      [-5, 6],
      [7, 4],
      [0, -1],
    ];
    for (const [bx, by] of berries) {
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.arc(bx, by, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (n.type === 'herb_plant') {
    ctx.fillStyle = flash ? '#FFFFFF' : '#059669';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3 + 0.2);
      ctx.beginPath();
      ctx.ellipse(6.5, 0, 7.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#A7F3D0';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (n.type === 'ruin_crystal') {
    // Ancient carved pedestal
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-21, -21, 42, 42, 7);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-15, -15, 30, 30);

    // Glowing Ember Crystal Prism
    const pulse = 0.88 + Math.sin(nowSec * 3.5 + n.id) * 0.14;
    ctx.fillStyle = flash ? '#FFFFFF' : '#D97706';
    ctx.beginPath();
    ctx.moveTo(0, -17 * pulse);
    ctx.lineTo(12 * pulse, 0);
    ctx.lineTo(0, 17 * pulse);
    ctx.lineTo(-12 * pulse, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(0, -17 * pulse);
    ctx.lineTo(0, 17 * pulse);
    ctx.lineTo(-12 * pulse, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mini HP bar if damaged
  if (n.hp < n.maxHp) {
    const w = 34;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(-w / 2, -n.radius - 13, w, 4.5);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-w / 2, -n.radius - 13, w * (n.hp / n.maxHp), 4.5);
  }

  ctx.restore();
}

function drawShelterInterior(
  ctx: CanvasRenderingContext2D,
  s: Structure,
  nowSec: number
) {
  ctx.save();
  ctx.translate(s.x, s.y);

  // Wooden plank floor inside cabin
  ctx.fillStyle = '#3b2414';
  ctx.beginPath();
  ctx.roundRect(-41, -34, 82, 68, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 11, 5, 0.55)';
  ctx.lineWidth = 1.2;
  for (let y = -22; y <= 22; y += 11) {
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(40, y);
    ctx.stroke();
  }

  // Woven rug in center
  ctx.fillStyle = '#7c2d12';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-14, -8, 28, 22, 3);
  ctx.fill();
  ctx.stroke();

  // Cozy sleeping bedroll & pillow (top-left corner)
  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-36, -28, 24, 15, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(-34, -26, 7, 11, 2);
  ctx.fill();

  // Wooden supply crate (top-right corner)
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.2;
  ctx.fillRect(21, -28, 15, 14);
  ctx.strokeRect(21, -28, 15, 14);
  ctx.beginPath();
  ctx.moveTo(21, -28);
  ctx.lineTo(36, -14);
  ctx.stroke();

  // Warm flickering lantern glow inside
  const glowR = 16 + Math.sin(nowSec * 9 + s.id) * 2;
  const g = ctx.createRadialGradient(-28, 18, 1, -28, 18, glowR);
  g.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
  g.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-28, 18, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(-28, 18, 3, 0, Math.PI * 2);
  ctx.fill();

  // Welcome threshold plank at south doorway
  ctx.fillStyle = '#6c3c1b';
  ctx.fillRect(-13, 31, 26, 7);

  ctx.restore();
}

function drawStructure(
  ctx: CanvasRenderingContext2D,
  s: Structure,
  world: GameWorld,
  nowSec: number
) {
  ctx.save();
  ctx.translate(s.x, s.y);

  if (s.type === 'campfire') {
    // Ash bed
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    // Shaded stone ring
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rx = Math.cos(a) * 17;
      const ry = Math.sin(a) * 17;
      ctx.fillStyle = i % 2 === 0 ? '#64748B' : '#475569';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(rx, ry, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Crossed charred logs
    ctx.strokeStyle = '#5c280b';
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(12, 7);
    ctx.moveTo(12, -7);
    ctx.lineTo(-12, 7);
    ctx.stroke();

    if (s.fuel > 0) {
      const fl = 1 + Math.sin(nowSec * 14 + s.id) * 0.16;
      const sway = Math.cos(nowSec * 11 + s.id) * 2;
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(sway * 0.4, -1, 12 * fl, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(sway * 0.7, -2, 8.5 * fl, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(0, -2, 4.5 * fl, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const d = Math.hypot(world.player.x - s.x, world.player.y - s.y);
    if (d < 130 || s.fuel < 25) {
      const w = 36;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-w / 2, 25, w, 4.5);
      ctx.fillStyle = s.fuel > 25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(-w / 2, 25, w * (s.fuel / s.maxFuel), 4.5);
    }
  } else if (s.type === 'wooden_wall') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(3, 4, s.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = s.hitFlash > 0 ? '#FCA5A5' : '#6c3512';
    ctx.strokeStyle = '#381704';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Palisade log ends & lashing
    const posts = [
      [-7, -6],
      [7, -6],
      [-7, 6],
      [7, 6],
      [0, 0],
    ];
    for (const [px, py] of posts) {
      ctx.fillStyle = '#9a5221';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (s.type === 'torch_post') {
    ctx.fillStyle = '#5c2a0c';
    ctx.strokeStyle = '#2e1303';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const fl = 7.5 + Math.sin(nowSec * 12 + s.id) * 1.4;
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.arc(0, -2, fl + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, -2, fl * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.type === 'shelter') {
    const inside =
      Math.abs(world.player.x - s.x) < 42 && Math.abs(world.player.y - s.y) < 36;

    // Log cabin perimeter walls with open South doorway
    ctx.strokeStyle = '#3e210e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Top wall
    ctx.moveTo(-42, -35);
    ctx.lineTo(42, -35);
    // Left wall
    ctx.lineTo(42, 35);
    // Bottom right wall to doorway
    ctx.lineTo(14, 35);
    // Bottom left wall from doorway
    ctx.moveTo(-14, 35);
    ctx.lineTo(-42, 35);
    ctx.lineTo(-42, -35);
    ctx.stroke();

    // Roof (fades almost completely open when player steps inside!)
    ctx.save();
    ctx.globalAlpha = inside ? 0.14 : 0.94;
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.roundRect(-42, -33, 90, 74, 8);
    ctx.fill();

    ctx.fillStyle = '#4f311b';
    ctx.strokeStyle = '#29170a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-44, -38, 88, 76, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(28, 15, 6, 0.5)';
    ctx.lineWidth = 1.5;
    for (let x = -30; x <= 30; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, -36);
      ctx.lineTo(x, 36);
      ctx.stroke();
    }

    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-44, 0);
    ctx.lineTo(44, 0);
    ctx.stroke();
    ctx.restore();
  } else if (s.type === 'signal_beacon') {
    // Heavy stone base
    ctx.fillStyle = s.hitFlash > 0 ? '#FCA5A5' : '#475569';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Iron brazier ring & rivets
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    if (world.beaconLit) {
      const fl = 15 + Math.sin(nowSec * 15) * 3;
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(0, 0, fl + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, 0, fl * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF9C3';
      ctx.beginPath();
      ctx.arc(0, 0, fl * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (s.hp < s.maxHp) {
    const w = 40;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-w / 2, -s.radius - 11, w, 4.5);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-w / 2, -s.radius - 11, w * (s.hp / s.maxHp), 4.5);
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, nowSec: number) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 6, e.radius * 1.05, e.radius * 0.74, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(e.angle);

  const flash = e.hitFlash > 0;
  const stride = Math.sin(nowSec * 13 + e.id) * 4;

  if (e.type === 'wolf') {
    // 4 Paws moving in stride
    ctx.fillStyle = flash ? '#FFFFFF' : '#475569';
    ctx.beginPath();
    ctx.ellipse(8 + stride, -9, 4.2, 2.2, 0.2, 0, Math.PI * 2);
    ctx.ellipse(8 - stride, 9, 4.2, 2.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(-9 - stride, -8, 4.2, 2.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(-9 + stride, 8, 4.2, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Long bushy tapered wolf tail
    const wag = Math.sin(nowSec * 8 + e.id) * 3.5;
    ctx.fillStyle = flash ? '#FFFFFF' : '#475569';
    ctx.beginPath();
    ctx.moveTo(-12, -3.5);
    ctx.quadraticCurveTo(-22, wag * 0.5 - 4, -29, wag);
    ctx.quadraticCurveTo(-22, wag * 0.5 + 4, -12, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E293B';
    ctx.beginPath();
    ctx.arc(-27, wag, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Muscular wolf torso (wide chest tapering to narrow hindquarters)
    ctx.fillStyle = flash ? '#FFFFFF' : '#64748B';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.quadraticCurveTo(2, -10.5, -12, -6);
    ctx.quadraticCurveTo(-15, 0, -12, 6);
    ctx.quadraticCurveTo(2, 10.5, 10, 8);
    ctx.quadraticCurveTo(14, 0, 10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Darker dorsal fur stripe along spine
    ctx.fillStyle = flash ? '#FFFFFF' : '#334155';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wolf Head with Cheek Fur Ruff + Elongated Snout
    ctx.fillStyle = flash ? '#FFFFFF' : '#7C8B9E';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(8, -8.5);
    ctx.lineTo(14, -9.5); // left cheek ruff
    ctx.lineTo(17, -4.5);
    ctx.lineTo(25, -2.5); // long wolf snout
    ctx.quadraticCurveTo(27.5, 0, 25, 2.5);
    ctx.lineTo(17, 4.5);
    ctx.lineTo(14, 9.5); // right cheek ruff
    ctx.lineTo(8, 8.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Black wolf nose tip
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.arc(25.5, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Sharp triangular wolf ears with inner cavity
    ctx.fillStyle = flash ? '#FFFFFF' : '#475569';
    ctx.beginPath();
    ctx.moveTo(9, -6);
    ctx.lineTo(6, -13.5);
    ctx.lineTo(14, -7.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 6);
    ctx.lineTo(6, 13.5);
    ctx.lineTo(14, 7.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(9.5, -7);
    ctx.lineTo(7.5, -11.5);
    ctx.lineTo(12.5, -7.8);
    ctx.moveTo(9.5, 7);
    ctx.lineTo(7.5, 11.5);
    ctx.lineTo(12.5, 7.8);
    ctx.fill();
  } else if (e.type === 'boar') {
    ctx.fillStyle = flash ? '#FFFFFF' : '#5C3A21';
    ctx.strokeStyle = '#2B180B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.radius, e.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dark dorsal ridge
    ctx.strokeStyle = '#3B2313';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.65, 0);
    ctx.lineTo(e.radius * 0.45, 0);
    ctx.stroke();

    // Tusks
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(14, -7);
    ctx.lineTo(23, -10);
    ctx.lineTo(16, -3);
    ctx.moveTo(14, 7);
    ctx.lineTo(23, 10);
    ctx.lineTo(16, 3);
    ctx.fill();
  } else if (e.type === 'shadow_stalker') {
    const wobble = Math.sin(nowSec * 9 + e.id) * 2.5;
    // Smoky outer tendril aura
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.arc(-4, 0, e.radius * 1.15 + wobble * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#FCA5A5' : '#090D16';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.radius + wobble * 0.5, e.radius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'alpha_beast') {
    ctx.fillStyle = flash ? '#FCA5A5' : '#1E1B2E';
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horned crown
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.lineTo(19, -18);
    ctx.lineTo(14, -7);
    ctx.moveTo(8, 12);
    ctx.lineTo(19, 18);
    ctx.lineTo(14, 7);
    ctx.fill();
  }

  // Glowing Eyes
  ctx.fillStyle =
    e.type === 'shadow_stalker' || e.type === 'alpha_beast' ? '#FB7185' : '#FBBF24';
  const eyeX = e.type === 'wolf' ? 16 : e.radius * 0.55;
  const eyeY = e.type === 'wolf' ? 3.5 : 4;
  ctx.beginPath();
  ctx.arc(eyeX, -eyeY, 2.1, 0, Math.PI * 2);
  ctx.arc(eyeX, eyeY, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (e.hp < e.maxHp) {
    const w = e.type === 'alpha_beast' ? 46 : 30;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-w / 2, -e.radius - 12, w, 4.5);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-w / 2, -e.radius - 12, w * (e.hp / e.maxHp), 4.5);
  }

  ctx.restore();
}

export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  size: number
) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#0f1b15';
  ctx.fillRect(0, 0, size, size);

  const scale = size / world.width;

  ctx.fillStyle = '#1d4e63';
  for (const p of world.ponds) {
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);
    ctx.rotate(p.rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(2, p.rx * scale), Math.max(2, p.ry * scale), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
  for (const n of world.nodes) {
    if (n.respawnTimer <= 0 && n.type === 'ruin_crystal') {
      ctx.beginPath();
      ctx.arc(n.x * scale, n.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const s of world.structures) {
    ctx.fillStyle =
      s.type === 'campfire'
        ? s.fuel > 0
          ? '#FB923C'
          : '#64748B'
        : s.type === 'signal_beacon'
          ? '#FACC15'
          : '#38BDF8';
    ctx.fillRect(s.x * scale - 2, s.y * scale - 2, 4, 4);
  }

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(world.player.x * scale, world.player.y * scale, 3.2, 0, Math.PI * 2);
  ctx.fill();
}
