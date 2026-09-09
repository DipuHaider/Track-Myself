/**
 * Rasterises the TrackMyself bolt into icon16/48/128.png with no native dependencies.
 * The shape here must stay in sync with icons/icon.svg and public/favicon.svg.
 * Run: node scripts/gen-icons.js
 */
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Brand: bolt on a dark plate, matching icons/icon.svg
const PLATE = [0x10, 0x15, 0x28];
const BOLT  = [0x6d, 0x8c, 0xff];

// Bolt outline in a 128x128 box — same geometry as icon.svg
const BOLT_PATH = [
  [72, 20], [38, 70], [60, 70], [56, 108], [90, 60], [68, 60],
];
const PLATE_RADIUS = 28; // of 128

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundedRect(px, py, side, radius) {
  if (px < 0 || py < 0 || px > side || py > side) return false;
  const cx = Math.min(Math.max(px, radius), side - radius);
  const cy = Math.min(Math.max(py, radius), side - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function makePng(size) {
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(rowSize * size, 0);
  const scale = size / 128;
  const poly = BOLT_PATH.map(([x, y]) => [x * scale, y * scale]);
  const radius = PLATE_RADIUS * scale;

  // stroke width from the SVG (8 units), so small icons keep a readable bolt
  const halfStroke = (8 * scale) / 2;

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let rgb = PLATE;

      if (!inRoundedRect(px, py, size, radius)) {
        // outside the plate — PNG here is opaque RGB, so match the plate to avoid a halo
        rgb = PLATE;
      } else if (inPolygon(px, py, poly) || nearEdge(px, py, poly, halfStroke)) {
        rgb = BOLT;
      }

      setPixel(raw, rowSize, size, x, y, rgb);
    }
  }

  const compressed = deflateSync(raw);

  function u32be(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
  }
  function chunk(type, data) {
    const len = Buffer.byteLength(data) === 0 ? Buffer.alloc(0) : Buffer.from(data);
    const typeB = Buffer.from(type, "ascii");
    const crc = crc32(Buffer.concat([typeB, len]));
    return Buffer.concat([u32be(len.length), typeB, len, u32be(crc)]);
  }

  const ihdr = Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0]),
  ]);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// distance from the point to any polygon edge, for the rounded stroke
function nearEdge(px, py, poly, half) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j];
    const [x2, y2] = poly[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const ex = x1 + t * dx - px;
    const ey = y1 + t * dy - py;
    if (ex * ex + ey * ey <= half * half) return true;
  }
  return false;
}

function setPixel(raw, rowSize, size, x, y, rgb) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const off = y * rowSize + 1 + x * 3;
  raw[off]     = rgb[0];
  raw[off + 1] = rgb[1];
  raw[off + 2] = rgb[2];
}

// Simple CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

for (const size of [16, 48, 128]) {
  const png = makePng(size);
  const out = resolve(__dirname, `../icons/icon${size}.png`);
  writeFileSync(out, png);
  console.log(`icons/icon${size}.png (${png.length} bytes)`);
}
