import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newWebhookSecret, signBody } from "./webhooks";

describe("webhook signing", () => {
  it("is a hex HMAC-SHA256 that a receiver can recompute", () => {
    const secret = newWebhookSecret();
    const body = JSON.stringify({ event: "lead.ready", data: { id: "1" } });
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    expect(signBody(secret, body)).toBe(`sha256=${expected}`);
  });

  it("changes with the body and the secret", () => {
    expect(signBody("a", "x")).not.toBe(signBody("a", "y"));
    expect(signBody("a", "x")).not.toBe(signBody("b", "x"));
    expect(newWebhookSecret().startsWith("whsec_")).toBe(true);
  });
});
