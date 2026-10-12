import dns from "node:dns";
import net from "node:net";

export type SafeUrlResult = { ok: true; url: string } | { ok: false; error: string };

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|intranet|home|lan|corp|localdomain)$/i;

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inCidr4(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/3",
];

export function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return PRIVATE_V4.some((c) => inCidr4(ip, c));
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    if (/^fe[89ab]/.test(lower)) return true;
    if (/^f[cd]/.test(lower)) return true;
    return false;
  }
  return true;
}

function allowlist(): string[] {
  return (process.env.AI_BASEURL_ALLOWLIST ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/* A base URL a user typed is a place our server will POST their key to. It
   must be a public https host: no credentials in the URL, no odd ports, no
   literal IPs, and nothing that resolves to a private, loopback, link-local or
   cloud-metadata address. Resolution is checked on every address the name
   maps to, because one public A record next to one private one is the trick. */
export async function assertSafeBaseUrl(raw: string): Promise<SafeUrlResult> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Base URL is not a valid URL." };
  }

  if (url.protocol !== "https:") return { ok: false, error: "Base URL must use https." };
  if (url.username || url.password) return { ok: false, error: "Base URL must not contain credentials." };
  if (url.port && url.port !== "443") return { ok: false, error: "Base URL must use the default https port." };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || net.isIP(host) || host.startsWith("[")) {
    return { ok: false, error: "Base URL must use a public host name, not an IP address." };
  }
  if (BLOCKED_HOSTS.test(host) || !host.includes(".")) {
    return { ok: false, error: "Base URL must be a public host name." };
  }

  const allowed = allowlist();
  if (allowed.length && !allowed.some((a) => host === a || host.endsWith(`.${a}`))) {
    return { ok: false, error: "That provider host is not on this deployment's allowlist." };
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: "Base URL host could not be resolved." };
  }
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    return { ok: false, error: "Base URL must resolve to a public address." };
  }

  const path = url.pathname.replace(/\/+$/, "");
  return { ok: true, url: `${url.origin}${path}` };
}
