#!/usr/bin/env node
/*
 * Replace browser-facing vertical animation sheets with their first genuine
 * frame. Frame counts come from the pinned C# source (RegisterItemAnimation and
 * Main.npcFrameCount), never from filename/aspect-ratio guesses.
 *
 * Usage:
 *   node scripts/normalize-sprite-frames.mjs [item-dir] [npc-dir]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(import.meta.dirname, "sprite-frames.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const itemDir = path.resolve(process.argv[2] || path.join(repoRoot, "calamity-codex/assets/item-sprites"));
const skipNpcs = process.argv[3] === "--skip-npcs";
const npcDir = skipNpcs ? "" : path.resolve(process.argv[3] || path.join(repoRoot, "calamity-codex/assets/npc-sprites"));

const dimensions = (file) => execFileSync("identify", ["-format", "%w %h", file], { encoding: "utf8" })
  .trim().split(/\s+/).map(Number);

function normalizeGroup(records, directory, suffix = "") {
  let cropped = 0;
  let already = 0;
  for (const [name, record] of Object.entries(records)) {
    const file = path.join(directory, `${name}${suffix}`);
    if (!fs.existsSync(file)) throw new Error(`Animated sprite is missing: ${file}`);
    const [width, height] = dimensions(file);
    if (width !== record.width) throw new Error(`Unexpected sprite width for ${file}: ${width}/${record.width}`);
    if (height === record.frameHeight) {
      already += 1;
      continue;
    }
    if (height !== record.sourceHeight) {
      throw new Error(`Unexpected sprite height for ${file}: ${height}; expected source ${record.sourceHeight} or frame ${record.frameHeight}`);
    }
    const temporary = `${file}.frame.png`;
    execFileSync("convert", [
      file,
      "-crop", `${record.width}x${record.frameHeight}+0+0`,
      "+repage",
      "-define", "png:exclude-chunks=date,time",
      temporary
    ]);
    fs.renameSync(temporary, file);
    cropped += 1;
  }
  return { cropped, already };
}

const items = normalizeGroup(manifest.items, itemDir, ".png");
const npcs = skipNpcs ? { cropped: 0, already: 0 } : normalizeGroup(manifest.npcs, npcDir, "");
console.log(`Sprite frames: items ${items.cropped} cropped/${items.already} ready; NPCs ${npcs.cropped} cropped/${npcs.already} ready${skipNpcs ? " (skipped)" : ""}.`);
