export interface TexturePack {
  forestPattern: CanvasPattern | null;
  dirtPattern: CanvasPattern | null;
  waterPattern: CanvasPattern | null;
  stonePattern: CanvasPattern | null;
}

let cachedPack: TexturePack | null = null;

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function createForestGroundCanvas(): HTMLCanvasElement {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const rand = seededRand(40219);

  // Rich deep moss base
  ctx.fillStyle = '#1b2d21';
  ctx.fillRect(0, 0, size, size);

  // Organic mossy patches wrapped seamlessly across edges
  for (let i = 0; i < 42; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 18 + rand() * 34;
    const ry = 14 + rand() * 26;
    const rot = rand() * Math.PI;
    const tone = rand();
    ctx.fillStyle =
      tone < 0.35
        ? 'rgba(20, 36, 25, 0.45)'
        : tone < 0.72
          ? 'rgba(35, 61, 41, 0.42)'
          : 'rgba(46, 76, 48, 0.28)';

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Soil speckles & fallen pine needles
  for (let i = 0; i < 240; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.8 + rand() * 1.8;
    ctx.fillStyle =
      rand() < 0.5 ? 'rgba(12, 22, 16, 0.45)' : 'rgba(72, 107, 74, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny grass tufts & clover clusters
  for (let i = 0; i < 55; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() < 0.5 ? 'rgba(86, 133, 88, 0.35)' : 'rgba(58, 97, 65, 0.4)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y - 6);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y - 7);
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 5, y - 5);
    ctx.stroke();
  }

  // Occasional tiny pebbles
  for (let i = 0; i < 18; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.26)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.2, 1.5, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function createDirtCanvas(): HTMLCanvasElement {
  const size = 192;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const rand = seededRand(8831);
  ctx.fillStyle = '#3c3024';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 36; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 10 + rand() * 22;
    ctx.fillStyle =
      rand() < 0.5 ? 'rgba(46, 36, 27, 0.45)' : 'rgba(78, 63, 47, 0.35)';
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (let i = 0; i < 160; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle =
      rand() < 0.5 ? 'rgba(28, 22, 17, 0.4)' : 'rgba(120, 102, 82, 0.25)';
    ctx.fillRect(x, y, 2, 2);
  }

  return c;
}

function createWaterCanvas(): HTMLCanvasElement {
  const size = 160;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const rand = seededRand(1942);
  ctx.fillStyle = '#154659';
  ctx.fillRect(0, 0, size, size);

  // Subtle caustic waves
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 16 + rand() * 22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.5, y - 4, x + w, y);
    ctx.stroke();
  }

  return c;
}

function createStoneCanvas(): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const rand = seededRand(5510);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    const offset = (y / 32) % 2 === 0 ? 0 : 16;
    for (let x = offset; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 32);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle =
      rand() < 0.5 ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.18)';
    ctx.fillRect(rand() * size, rand() * size, 3, 2);
  }

  return c;
}

export function getTexturePack(ctx: CanvasRenderingContext2D): TexturePack {
  if (cachedPack) return cachedPack;

  cachedPack = {
    forestPattern: ctx.createPattern(createForestGroundCanvas(), 'repeat'),
    dirtPattern: ctx.createPattern(createDirtCanvas(), 'repeat'),
    waterPattern: ctx.createPattern(createWaterCanvas(), 'repeat'),
    stonePattern: ctx.createPattern(createStoneCanvas(), 'repeat'),
  };
  return cachedPack;
}
