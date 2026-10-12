import { describe, expect, it } from "vitest";
import { isObjectIdString, parseObjectId } from "@/lib/objectId";

describe("parseObjectId", () => {
  it("accepts only 24-hex strings", () => {
    expect(parseObjectId("507f1f77bcf86cd799439011")?.toHexString()).toBe("507f1f77bcf86cd799439011");
    expect(parseObjectId("abc")).toBeNull();
    expect(parseObjectId("twelvecharss")).toBeNull();
    expect(parseObjectId(123)).toBeNull();
    expect(parseObjectId(null)).toBeNull();
    expect(isObjectIdString("507f1f77bcf86cd799439011")).toBe(true);
  });
});
