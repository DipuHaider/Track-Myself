import type { HeroNode } from "@/lib/hero/heroField";

export const EAT_FLOOR = 46;
export const RAGE_ENTER = 96;
export const RAGE_EXIT = 72;
export const RAGE_TIER = 16;
export const MAX_CLONES = 6;

export const CLONE_TTL_MS = 10000;
export const CLONE_SPAWN_GAP_MS = 420;
export const SPAWN_MS = 260;
export const BURST_MS = 420;

export const BASE_RADIUS = 26;
export const CLONE_RADIUS = 20;
export const BASE_SPEED = 2.1;
export const CLONE_SPEED = 3.3;
export const BASE_TURN = 0.075;
export const CLONE_TURN = 0.11;
export const CHOMP_MAX = 0.5;
export const EAT_FACTOR = 0.95;
export const CLONE_EAT_MS = 260;
export const RETARGET_FRAMES = 6;
export const CLONE_SEEK_RADIUS = 170;
export const TRAIL_FRAMES = 7;

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
  if (n <= EAT_FLOOR) return Infinity;
  const base =
    n >= 150 ? 70 : n >= 110 ? 130 : n >= RAGE_ENTER ? 220 : n >= 70 ? 420 : 900;
  return load > LOAD_HOT ? base * 0.6 : base;
}

export function nextRage(rage: boolean, n: number, load: number) {
  if (!rage && (n >= RAGE_ENTER || (n > RAGE_EXIT && load > 1.25))) return true;
  if (rage && n <= RAGE_EXIT) return false;
  return rage;
}

export function wantClones(rage: boolean, n: number, load: number) {
  if (!rage) return 0;
  const tier =
    n >= RAGE_ENTER ? Math.min(MAX_CLONES, 1 + Math.floor((n - RAGE_ENTER) / RAGE_TIER)) : 0;
  const boost =
    n > RAGE_EXIT ? (load > LOAD_HOT ? MAX_CLONES : load > LOAD_WARN ? 2 : 0) : 0;
  return Math.max(tier, boost);
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

export function densestCells(nodes: readonly HeroNode[], width: number, height: number): Cell[] {
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

  const filled: Cell[] = [];
  for (const cell of cells) {
    if (!cell.count) continue;
    cell.x /= cell.count;
    cell.y /= cell.count;
    filled.push(cell);
  }

  return filled.sort((a, b) => b.count - a.count);
}
