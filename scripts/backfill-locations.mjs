/**
 * Splits the free-text `location` of older applications into `city` and `country`.
 *
 * Applications saved by the browser extension before the location fix carry only a
 * scraped `location` string, sometimes wrong ("[object Object]", the company name,
 * "Remote in London"). The app now edits and displays city + country, so these rows
 * show stale text until each one is opened and saved by hand.
 *
 * Only rows with no city and no country are touched; anything a user has entered is left alone.
 *
 *   node --env-file=.env --experimental-strip-types scripts/backfill-locations.mjs          dry run
 *   node --env-file=.env --experimental-strip-types scripts/backfill-locations.mjs --apply  write
 */
import mongoose from "mongoose";
import { splitLocation } from "../src/lib/applicationLocation.ts";

const APPLY = process.argv.includes("--apply");
const SAMPLE = 25;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with --env-file=.env (or export it).");
  process.exit(1);
}

const blank = (v) => !v || !String(v).trim();

function stripJunk(raw, companyName) {
  const parts = String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/\[object\s+\w+\]/i.test(p));
  const joined = parts.join(", ");
  if (companyName && joined.toLowerCase() === String(companyName).trim().toLowerCase()) return "";
  return joined;
}

await mongoose.connect(uri);
const apps = mongoose.connection.db.collection("applications");

const cursor = apps.find(
  {
    location: { $exists: true, $nin: [null, ""] },
    $and: [
      { $or: [{ city: { $exists: false } }, { city: null }, { city: "" }] },
      { $or: [{ country: { $exists: false } }, { country: null }, { country: "" }] },
    ],
  },
  { projection: { companyName: 1, location: 1, city: 1, country: 1 } },
);

const ops = [];
const stats = { scanned: 0, split: 0, cityOnly: 0, countryOnly: 0, cleared: 0, unchanged: 0 };
const samples = [];

for await (const app of cursor) {
  stats.scanned++;
  if (!blank(app.city) || !blank(app.country)) continue;

  const cleaned = stripJunk(app.location, app.companyName);
  const { city, country, label } = splitLocation(cleaned);

  const set = { location: label };
  if (city) set.city = city;
  if (country) set.country = country;

  if (set.location === app.location && !city && !country) {
    stats.unchanged++;
    continue;
  }

  if (!label) stats.cleared++;
  else if (city && country) stats.split++;
  else if (city) stats.cityOnly++;
  else stats.countryOnly++;

  if (samples.length < SAMPLE) samples.push({ before: app.location, ...set });
  ops.push({ updateOne: { filter: { _id: app._id }, update: { $set: set } } });
}

console.log(`Scanned ${stats.scanned} application(s) with a location but no city/country.`);
console.log(`  city + country : ${stats.split}`);
console.log(`  city only      : ${stats.cityOnly}`);
console.log(`  country only   : ${stats.countryOnly}`);
console.log(`  cleared (junk) : ${stats.cleared}`);
console.log(`  unchanged      : ${stats.unchanged}`);

if (samples.length) {
  console.log(`\nFirst ${samples.length} change(s):`);
  console.table(samples);
}

if (!ops.length) {
  console.log("\nNothing to update.");
} else if (!APPLY) {
  console.log(`\nDry run: ${ops.length} update(s) not written. Re-run with --apply to write them.`);
} else {
  const res = await apps.bulkWrite(ops, { ordered: false });
  console.log(`\nUpdated ${res.modifiedCount} application(s).`);
}

await mongoose.disconnect();
