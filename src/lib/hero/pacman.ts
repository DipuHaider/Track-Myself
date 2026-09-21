export type HeroNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stage: number;
  phase: number;
  wobble: number;
  scale: number;
  pulse: number;
};

export type Pac = {
  x: number;
  y: number;
  heading: number;
  radius: number;
  speed: number;
  turn: number;
  chompRate: number;
  wander: number;
  held: boolean;
  target: HeroNode | null;
  cellX: number;
  cellY: number;
  hasCell: boolean;
  nextEatAt: number;
  nextCellAt: number;
  raging: boolean;
  rageMix: number;
  rageStart: number;
  rageEndedAt: number;
  energy: number;
  mouth: number;
  tick: number;
  trail: { x: number; y: number; born: number }[];
};

export type NeonRing = {
  x: number;
  y: number;
  born: number;
  life: number;
  from: number;
  to: number;
  width: number;
  glow: string;
  core: string;
};

export type Palette = {
  glow: string;
  mid: string;
  core: string;
  crest: string;
};

export const PAC_PALETTES: { base: Palette; rage: Palette } = {
  base: { glow: "#ffb020", mid: "#ffd84d", core: "#fff8d6", crest: "#ffd84d" },
  rage: { glow: "#ff2d55", mid: "#ff6b7a", core: "#ffe4e8", crest: "#ffb347" },
};

export const NEON = {
  blend: "lighter" as GlobalCompositeOperation,
  fill: 0.26,
  trail: 0.55,
};

export function setNeonBlend(dark: boolean) {
  NEON.blend = dark ? "lighter" : "source-over";
  NEON.fill = dark ? 0.26 : 0.92;
  NEON.trail = dark ? 0.55 : 0.32;
}

export function setPacPalettes(base: Palette, rage: Palette) {
  PAC_PALETTES.base = base;
  PAC_PALETTES.rage = rage;
}

export const RAGE_ENTER = 96;
export const RAGE_EXIT = 72;
export const RAGE_MAX_MS = 9000;
export const RAGE_COOLDOWN_MS = 3000;
export const RAGE_MORPH_MS = 340;

export const BASE_RADIUS = 27;
export const RAGE_RADIUS = 41;
export const BASE_SPEED = 2.1;
export const RAGE_SPEED = 4.3;
export const BASE_TURN = 0.075;
export const RAGE_TURN = 0.13;
export const BASE_CHOMP = 0.014;
export const RAGE_CHOMP = 0.027;
export const RAGE_EAT_MS = 95;
export const RESPAWN_MS = 1100;

export const MOUTH_MAX = 0.62;
export const MOUTH_MIN = 0.06;
export const EAT_FACTOR = 1.05;
export const GRAB_FACTOR = 1.45;
export const RETARGET_FRAMES = 6;
export const CELL_HOLD_MS = 700;
export const CHASE_FACTOR = 3.4;
export const TRAIL_MS = 320;
export const TRAIL_MAX = 10;

export const EMA_ALPHA = 0.06;
export const LOAD_WARN = 1.18;
export const LOAD_HOT = 1.45;

export const GRID_COLS = 5;
export const GRID_ROWS = 3;

export type Cell = { x: number; y: number; count: number };

export function createLoadTracker() {
  let ema = 16.7;
  let floor = 16.7;

  return {
    sample(dt: number) {
      if (dt <= 0 || dt > 200) return;
      ema += (dt - ema) * EMA_ALPHA;
      if (dt < floor) floor += (dt - floor) * 0.25;
      else floor = Math.min(20, floor + 0.004);
      floor = Math.max(6, floor);
    },
    load() {
      return ema / Math.max(6, floor);
    },
  };
}

export function eatIntervalMs(n: number, load: number) {
  const base =
    n >= 150 ? 70 : n >= 110 ? 130 : n >= RAGE_ENTER ? 220 : n >= 70 ? 420 : 900;
  return load > LOAD_HOT ? base * 0.6 : base;
}

export function shouldEnterRage(n: number, load: number, sinceLastRage: number) {
  if (sinceLastRage < RAGE_COOLDOWN_MS) return false;
  return n >= RAGE_ENTER || (n > RAGE_EXIT && load > LOAD_WARN);
}

export function shouldExitRage(n: number, load: number, elapsed: number) {
  if (elapsed >= RAGE_MAX_MS) return true;
  return n <= RAGE_EXIT && load < LOAD_WARN;
}

export function nearestNode(nodes: readonly HeroNode[], x: number, y: number, maxDist = Infinity) {
  let best: HeroNode | null = null;
  let bestSq = maxDist === Infinity ? Infinity : maxDist * maxDist;
  for (const node of nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const dsq = dx * dx + dy * dy;
    if (dsq < bestSq) {
      bestSq = dsq;
      best = node;
    }
  }
  return best;
}

export function densestCell(nodes: readonly HeroNode[], width: number, height: number): Cell | null {
  const cells: Cell[] = [];
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) cells.push({ x: 0, y: 0, count: 0 });

  for (const node of nodes) {
    const cx = Math.min(GRID_COLS - 1, Math.max(0, Math.floor((node.x / width) * GRID_COLS)));
    const cy = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((node.y / height) * GRID_ROWS)));
    const cell = cells[cy * GRID_COLS + cx];
    cell.x += node.x;
    cell.y += node.y;
    cell.count++;
  }

  let best: Cell | null = null;
  for (const cell of cells) {
    if (!cell.count) continue;
    if (best && cell.count <= best.count) continue;
    cell.x /= cell.count;
    cell.y /= cell.count;
    best = cell;
  }

  return best;
}

export function makePac(x: number, y: number, heading: number): Pac {
  return {
    x, y, heading,
    radius: BASE_RADIUS,
    speed: BASE_SPEED,
    turn: BASE_TURN,
    chompRate: BASE_CHOMP,
    wander: Math.random() * Math.PI * 2,
    held: false,
    target: null,
    cellX: 0,
    cellY: 0,
    hasCell: false,
    nextEatAt: 0,
    nextCellAt: 0,
    raging: false,
    rageMix: 0,
    rageStart: 0,
    rageEndedAt: -RAGE_COOLDOWN_MS,
    energy: 1,
    mouth: MOUTH_MAX * 0.5,
    tick: 0,
    trail: [],
  };
}

export function applyRageMix(pac: Pac) {
  const t = pac.rageMix;
  pac.radius = BASE_RADIUS + (RAGE_RADIUS - BASE_RADIUS) * t;
  pac.speed = BASE_SPEED + (RAGE_SPEED - BASE_SPEED) * t;
  pac.turn = BASE_TURN + (RAGE_TURN - BASE_TURN) * t;
  pac.chompRate = BASE_CHOMP + (RAGE_CHOMP - BASE_CHOMP) * t;
}

function hexToRgb(hex: string) {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const v = parseInt(full, 16);
  if (Number.isNaN(v)) return [255, 255, 255];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mixChannel(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)}, ${Math.round(ca[1] + (cb[1] - ca[1]) * t)}, ${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
}

export function pacPalette(t: number): Palette {
  const { base, rage } = PAC_PALETTES;
  if (t <= 0) return base;
  if (t >= 1) return rage;
  return {
    glow: mixChannel(base.glow, rage.glow, t),
    mid: mixChannel(base.mid, rage.mid, t),
    core: mixChannel(base.core, rage.core, t),
    crest: mixChannel(base.crest, rage.crest, t),
  };
}

function pacPath(pac: Pac, radius: number) {
  const path = new Path2D();
  path.moveTo(pac.x, pac.y);
  path.arc(pac.x, pac.y, radius, pac.heading + pac.mouth, pac.heading - pac.mouth);
  path.closePath();
  return path;
}

export function drawNeonPac(ctx: CanvasRenderingContext2D, pac: Pac) {
  const radius = pac.radius;
  if (radius <= 0.5) return;

  const palette = pacPalette(pac.rageMix);
  const path = pacPath(pac, radius);
  const bloom = pac.energy * (pac.held ? 1.35 : 1) * (1 + pac.rageMix * 0.35);

  ctx.save();
  ctx.globalCompositeOperation = NEON.blend;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.globalAlpha = NEON.fill;
  ctx.fillStyle = palette.mid;
  ctx.fill(path);

  ctx.globalAlpha = 1;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 17 * bloom;
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = radius * 0.17;
  ctx.stroke(path);

  ctx.shadowBlur = 7 * bloom;
  ctx.strokeStyle = palette.mid;
  ctx.lineWidth = radius * 0.09;
  ctx.stroke(path);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.core;
  ctx.lineWidth = Math.max(1.1, radius * 0.05);
  ctx.stroke(path);

  const up = pac.heading - Math.PI / 2;
  const ex = pac.x + Math.cos(pac.heading) * radius * 0.12 + Math.cos(up) * radius * 0.44;
  const ey = pac.y + Math.sin(pac.heading) * radius * 0.12 + Math.sin(up) * radius * 0.44;

  ctx.shadowColor = palette.core;
  ctx.shadowBlur = 9 * bloom;
  ctx.fillStyle = palette.core;
  ctx.beginPath();
  ctx.arc(ex, ey, Math.max(1.1, radius * 0.1), 0, Math.PI * 2);
  ctx.fill();

  if (pac.rageMix > 0.02) {
    const sweep = 0.95 * pac.rageMix;
    const crestR = radius * 1.26;

    ctx.globalAlpha = pac.rageMix;
    ctx.shadowColor = palette.crest;
    ctx.shadowBlur = 11 * bloom;
    ctx.strokeStyle = palette.crest;
    ctx.lineWidth = radius * 0.2;
    ctx.beginPath();
    ctx.arc(pac.x, pac.y, crestR, up - sweep, up + sweep);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.core;
    ctx.lineWidth = Math.max(0.8, radius * 0.06);
    ctx.beginPath();
    ctx.arc(pac.x, pac.y, crestR, up - sweep, up + sweep);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawNeonTrail(ctx: CanvasRenderingContext2D, pac: Pac, now: number) {
  if (!pac.trail.length || pac.rageMix <= 0.05) return;

  const palette = pacPalette(pac.rageMix);

  ctx.save();
  ctx.globalCompositeOperation = NEON.blend;
  ctx.shadowColor = palette.glow;

  for (const dot of pac.trail) {
    const t = (now - dot.born) / TRAIL_MS;
    if (t >= 1) continue;
    const fade = (1 - t) * (1 - t);
    ctx.globalAlpha = fade * NEON.trail * pac.rageMix;
    ctx.shadowBlur = 10 * fade;
    ctx.fillStyle = palette.mid;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, pac.radius * 0.3 * fade, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawNeonRing(ctx: CanvasRenderingContext2D, ring: NeonRing, now: number) {
  const t = (now - ring.born) / ring.life;
  if (t >= 1) return;

  const radius = ring.from + (ring.to - ring.from) * t;
  const fade = (1 - t) * (1 - t);

  ctx.save();
  ctx.globalCompositeOperation = NEON.blend;
  ctx.globalAlpha = fade;
  ctx.shadowColor = ring.glow;
  ctx.shadowBlur = 18 * fade;
  ctx.strokeStyle = ring.glow;
  ctx.lineWidth = ring.width;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = ring.core;
  ctx.lineWidth = Math.max(0.6, ring.width * 0.32);
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
