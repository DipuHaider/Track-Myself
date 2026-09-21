import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export type SealedSecret = { ciphertext: string; iv: string; tag: string };

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const SALT = "trackmyself.ai-key.v1";

/* Deliberately not NEXTAUTH_SECRET: rotating session signing should not render
   every stored key undecryptable, and vice versa. */
function key(): Buffer {
  const secret = process.env.AI_KEY_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AI_KEY_SECRET is not set, or is shorter than 16 characters.");
  }
  return scryptSync(secret, SALT, 32);
}

export function secretBoxReady(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): SealedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(sealed: SealedSecret): string {
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function last4(plain: string): string {
  return plain.slice(-4);
}
