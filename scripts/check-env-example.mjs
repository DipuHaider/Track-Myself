/**
 * Fails if the code reads an environment variable that .env.example does not document.
 * A missing entry here is how a deploy ends up silently misconfigured — NEXT_PUBLIC_SITE_URL
 * was undocumented for weeks and produced wrong canonical URLs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const SCAN_FILES = ["next.config.ts"];

/* Set by the runtime or written (not read) by us — never expected in .env.example. */
const IGNORED = new Set([
  "NODE_ENV",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_GIT_COMMIT_SHA",
  "CI",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))),
  ...SCAN_FILES.map((f) => path.join(ROOT, f)),
];

const used = new Map();
for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    const name = m[1];
    if (IGNORED.has(name)) continue;
    if (!used.has(name)) used.set(name, path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

const example = readFileSync(path.join(ROOT, ".env.example"), "utf8");
const documented = new Set(
  [...example.matchAll(/^\s*([A-Z0-9_]+)\s*=/gm)].map((m) => m[1]),
);

const missing = [...used.entries()].filter(([name]) => !documented.has(name));
const unused = [...documented].filter((name) => !used.has(name) && !IGNORED.has(name));

if (missing.length) {
  console.error("Environment variables read by the code but missing from .env.example:\n");
  for (const [name, where] of missing) console.error(`  ${name.padEnd(26)} first read in ${where}`);
  console.error("\nAdd them to .env.example (with a comment saying what breaks without them).");
  process.exit(1);
}

if (unused.length) {
  console.warn(`Documented in .env.example but never read: ${unused.join(", ")}`);
}

console.log(`check:env — ${used.size} variable(s) read, all documented in .env.example`);
