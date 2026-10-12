import { describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, last4, secretBoxReady } from "@/lib/crypto/secretBox";

describe("secretBox", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptSecret("sk-ant-example-key-1234");
    const b = encryptSecret("sk-ant-example-key-1234");
    expect(a.iv).not.toBe(b.iv);
    expect(decryptSecret(a)).toBe("sk-ant-example-key-1234");
    expect(last4("sk-ant-example-key-1234")).toBe("1234");
  });

  it("rejects a tampered ciphertext", () => {
    const sealed = encryptSecret("secret");
    const bytes = Buffer.from(sealed.ciphertext, "base64");
    bytes[0] ^= 0xff;
    expect(() => decryptSecret({ ...sealed, ciphertext: bytes.toString("base64") })).toThrow();
  });

  it("reports readiness from the env", () => {
    expect(secretBoxReady()).toBe(true);
    vi.stubEnv("AI_KEY_SECRET", "short");
    expect(secretBoxReady()).toBe(false);
  });
});
