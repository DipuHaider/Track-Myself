import { describe, expect, it } from "vitest";
import { registerSchema } from "@/schemas/authSchema";
import { forgotPasswordSchema, resetPasswordSchema } from "@/schemas/passwordResetSchema";
import { profileUpdateSchema } from "@/schemas/profileSchema";

describe("auth schemas", () => {
  it("accepts a valid registration and rejects short passwords", () => {
    expect(registerSchema.safeParse({ name: "Dipu", email: "a@b.co", password: "longenough" }).success).toBe(true);
    expect(registerSchema.safeParse({ name: "Dipu", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "D", email: "nope", password: "longenough" }).success).toBe(false);
  });

  it("validates reset tokens and emails", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.zz" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "short", password: "longenough" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t".repeat(64), password: "longenough" }).success).toBe(true);
  });

  it("trims and bounds profile fields", () => {
    const r = profileUpdateSchema.safeParse({ name: "  Dipu  ", bio: "hi" });
    expect(r.success && r.data.name).toBe("Dipu");
    expect(profileUpdateSchema.safeParse({ newPassword: "short" }).success).toBe(false);
  });
});
