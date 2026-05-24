import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const watch = process.argv.includes("--watch");

const shared = {
  bundle:   true,
  platform: "browser",
  target:   "chrome110",
  loader:   { ".css": "text" },
};

const ctx = await esbuild.context({
  ...shared,
  entryPoints: {
    "dist/content":    "src/content.ts",
    "dist/background": "src/background.ts",
  },
  outdir:  ".",
  format:  "iife",
  minify:  !watch,
});

if (watch) {
  await ctx.watch();
  console.log("[esbuild] watching for changes…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("[esbuild] build complete");
}
