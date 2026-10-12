const PDF = Buffer.from("%PDF");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF = Buffer.from("RIFF");
const WEBP = Buffer.from("WEBP");
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function startsWith(buf: Buffer, sig: Buffer, offset = 0) {
  return buf.length >= offset + sig.length && buf.subarray(offset, offset + sig.length).equals(sig);
}

/* Content type from the bytes, never from the client. A zip container is only
   called docx when it carries the Word part table in its first entries; other
   zips are rejected rather than guessed. */
export function sniffMime(buf: Buffer): string | null {
  if (startsWith(buf, PDF)) return "application/pdf";
  if (startsWith(buf, PNG)) return "image/png";
  if (startsWith(buf, JPEG)) return "image/jpeg";
  if (startsWith(buf, RIFF) && startsWith(buf, WEBP, 8)) return "image/webp";
  if (startsWith(buf, OLE)) return "application/msword";
  if (startsWith(buf, ZIP)) {
    const head = buf.subarray(0, Math.min(buf.length, 4096)).toString("latin1");
    return head.includes("[Content_Types].xml") || head.includes("word/") ? DOCX_MIME : null;
  }
  return null;
}

export function declaredMatchesBytes(declared: string, buf: Buffer): boolean {
  const actual = sniffMime(buf);
  if (!actual) return false;
  if (declared === "image/jpg") return actual === "image/jpeg";
  return actual === declared;
}
