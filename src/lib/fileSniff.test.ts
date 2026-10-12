import { describe, expect, it } from "vitest";
import { declaredMatchesBytes, sniffMime } from "@/lib/fileSniff";

describe("sniffMime", () => {
  it("recognises the accepted formats by signature", () => {
    expect(sniffMime(Buffer.from("%PDF-1.7 rest"))).toBe("application/pdf");
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]))).toBe("image/webp");
    expect(sniffMime(Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from("....[Content_Types].xml")]))).toContain("wordprocessingml");
    expect(sniffMime(Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from("....something-else")]))).toBeNull();
    expect(sniffMime(Buffer.from("<html>"))).toBeNull();
  });

  it("refuses a renamed file", () => {
    expect(declaredMatchesBytes("image/png", Buffer.from("%PDF-1.4"))).toBe(false);
    expect(declaredMatchesBytes("application/pdf", Buffer.from("%PDF-1.4"))).toBe(true);
  });
});
