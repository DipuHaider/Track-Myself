import { tokenKey } from "./normalise";

export type DiffOp = { type: "equal" | "insert" | "delete"; text: string };

/* An LCS table is quadratic. Sections are small, but a pathological block must
   degrade to "this changed wholesale" rather than stall the request. */
const MAX_CELLS = 1_500_000;

function tokenize(s: string): string[] {
  return s ? s.split(/(\s+)/).filter((t) => t !== "") : [];
}

function keyOf(t: string): string {
  if (/^\s+$/.test(t)) return " ";
  return tokenKey(t) || t.trim().toLowerCase();
}

function merge(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else out.push({ ...op });
  }
  return out.filter((o) => o.text !== "");
}

export function diffWords(a: string, b: string): { ops: DiffOp[]; degraded: boolean } {
  const at = tokenize(a);
  const bt = tokenize(b);
  if (!at.length && !bt.length) return { ops: [], degraded: false };
  if (!at.length) return { ops: [{ type: "insert", text: b }], degraded: false };
  if (!bt.length) return { ops: [{ type: "delete", text: a }], degraded: false };

  const ka = at.map(keyOf);
  const kb = bt.map(keyOf);

  /* Most edits touch one sentence, so shaving the shared head and tail keeps the
     table tiny in the common case. */
  let head = 0;
  while (head < ka.length && head < kb.length && ka[head] === kb[head]) head++;
  let tail = 0;
  while (
    tail < ka.length - head &&
    tail < kb.length - head &&
    ka[ka.length - 1 - tail] === kb[kb.length - 1 - tail]
  ) tail++;

  const prefix = at.slice(0, head).join("");
  const suffix = at.slice(at.length - tail).join("");
  const midA = at.slice(head, at.length - tail);
  const midB = bt.slice(head, bt.length - tail);
  const mka = ka.slice(head, ka.length - tail);
  const mkb = kb.slice(head, kb.length - tail);

  const n = midA.length;
  const m = midB.length;

  const wrap = (ops: DiffOp[]): DiffOp[] =>
    merge([
      ...(prefix ? [{ type: "equal" as const, text: prefix }] : []),
      ...ops,
      ...(suffix ? [{ type: "equal" as const, text: suffix }] : []),
    ]);

  if (!n && !m) return { ops: wrap([]), degraded: false };
  if ((n + 1) * (m + 1) > MAX_CELLS) {
    return {
      ops: wrap([
        ...(n ? [{ type: "delete" as const, text: midA.join("") }] : []),
        ...(m ? [{ type: "insert" as const, text: midB.join("") }] : []),
      ]),
      degraded: true,
    };
  }

  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = mka[i] === mkb[j]
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (mka[i] === mkb[j]) {
      ops.push({ type: "equal", text: midA[i] });
      i++; j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      ops.push({ type: "delete", text: midA[i] });
      i++;
    } else {
      ops.push({ type: "insert", text: midB[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "delete", text: midA[i++] });
  while (j < m) ops.push({ type: "insert", text: midB[j++] });

  return { ops: wrap(ops), degraded: false };
}

export function hasRealChange(ops: DiffOp[]): boolean {
  return ops.some((o) => o.type !== "equal" && o.text.trim() !== "");
}

export function countWords(ops: DiffOp[], type: DiffOp["type"]): number {
  return ops
    .filter((o) => o.type === type)
    .reduce((n, o) => n + o.text.split(/\s+/).filter(Boolean).length, 0);
}
