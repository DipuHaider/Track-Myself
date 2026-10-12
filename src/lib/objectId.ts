import mongoose from "mongoose";

const HEX_24 = /^[a-f0-9]{24}$/i;

export function parseObjectId(raw: unknown): mongoose.Types.ObjectId | null {
  if (typeof raw !== "string" || !HEX_24.test(raw) || !mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

export function isObjectIdString(raw: unknown): raw is string {
  return parseObjectId(raw) !== null;
}
