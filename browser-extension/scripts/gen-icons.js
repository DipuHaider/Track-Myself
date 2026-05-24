/**
 * Generates solid-color PNG icons for the Chrome extension without any native dependencies.
 * Produces icon16.png, icon48.png, icon128.png in the icons/ directory.
 * Run: node scripts/gen-icons.js
 */
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Brand colours: indigo gradient approximated as solid #4f46e5 (R79 G70 B229)
const BG  = [0x4f, 0x46, 0xe5]; // indigo background
const FG  = [0xff, 0xff, 0xff]; // white for the icon marks

function makePng(size) {
  // Build raw image: each row = filter-byte(0) + size*3 bytes (RGB)
  const rowSize = 1 + size * 3;
  const raw     = Buffer.alloc(rowSize * size, 0);

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter type none
    for (let x = 0; x < size; x++) {
      const off = y * rowSize + 1 + x * 3;
      // rounded-rect: corners outside radius get BG colour (they look close enough at small sizes)
      raw[off]     = BG[0];
      raw[off + 1] = BG[1];
      raw[off + 2] = BG[2];
    }
  }

  // Draw a simple "TM" cross (white plus sign) in the centre as a visual hint
  const mid  = Math.floor(size / 2);
  const arm  = Math.max(1, Math.floor(size * 0.28));
  const thick = Math.max(1, Math.floor(size * 0.08));

  for (let i = -arm; i <= arm; i++) {
    for (let t = -thick; t <= thick; t++) {
      // horizontal bar
      setPixel(raw, rowSize, size, mid + i, mid + t, FG);
      // vertical bar
      setPixel(raw, rowSize, size, mid + t, mid + i, FG);
    }
  }

  const compressed = deflateSync(raw);

  // PNG helpers
  function u32be(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
  }
  function chunk(type, data) {
    const len  = Buffer.byteLength(data) === 0 ? Buffer.alloc(0) : Buffer.from(data);
    const typeB = Buffer.from(type, "ascii");
    const crc  = crc32(Buffer.concat([typeB, len]));
    return Buffer.concat([u32be(len.length), typeB, len, u32be(crc)]);
  }

  const ihdr = Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit, RGB, no filter, no interlace
  ]);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
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
