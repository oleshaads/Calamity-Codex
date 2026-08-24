#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const manifestPath = path.join(root, "scripts/sprite-frames.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function pngDimensions(file) {
  const png = fs.readFileSync(file);
  check(png.length >= 24 && png.subarray(1, 4).toString() === "PNG", `Not a PNG: ${file}`);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function auditGroup(records, directory, suffix = "") {
  const errors = [];
  for (const [name, record] of Object.entries(records)) {
    const file = path.join(directory, `${name}${suffix}`);
    if (!fs.existsSync(file)) {
      errors.push(`${name}: missing`);
      continue;
    }
    const [width, height] = pngDimensions(file);
    if (width !== record.width || height !== record.frameHeight) {
      errors.push(`${name}: ${width}x${height}, expected first frame ${record.width}x${record.frameHeight} from ${record.frames} frames`);
    }
    if (record.frames < 2 || record.sourceHeight <= record.frameHeight) errors.push(`${name}: invalid source frame metadata`);
  }
  check(!errors.length, `Animation sheets are not normalized:\n${errors.join("\n")}`);
}

check(manifest.source.includes("1a8cebd27ec5615316b78f71973446b5528d2b78"), "Frame manifest is not pinned to the catalog source revision");
check(Object.keys(manifest.items).length === 101, `Expected 101 animated item textures, got ${Object.keys(manifest.items).length}`);
check(Object.keys(manifest.npcs).length === 75, `Expected 75 animated NPC textures, got ${Object.keys(manifest.npcs).length}`);
auditGroup(manifest.items, path.join(root, "calamity-codex/assets/item-sprites"), ".png");
auditGroup(manifest.npcs, path.join(root, "calamity-codex/assets/npc-sprites"));

const expected = {
  Baguette: [52, 40],
  BaconOil: [12, 56],
  Barberry: [26, 34],
  Murasama: [90, 134],
  TheSponge: [44, 56]
};
for (const [name, size] of Object.entries(expected)) {
  const actual = pngDimensions(path.join(root, `calamity-codex/assets/item-sprites/${name}.png`));
  check(actual[0] === size[0] && actual[1] === size[1], `${name} regression: ${actual.join("x")}/${size.join("x")}`);
}
for (const [name, size] of Object.entries({ "mauler.png": [204, 106], "nuclear-terror.png": [211, 138], "the-lorde.png": [480, 288] })) {
  const actual = pngDimensions(path.join(root, `calamity-codex/assets/npc-sprites/${name}`));
  check(actual[0] === size[0] && actual[1] === size[1], `${name} regression: ${actual.join("x")}/${size.join("x")}`);
}

const builder = fs.readFileSync(path.join(root, "scripts/build-item-catalog.mjs"), "utf8");
check(builder.includes("normalize-sprite-frames.mjs") && builder.includes("--skip-npcs"), "Catalog rebuild would restore full animation sheets");

const releaseVersion = "20260819-core112";
const appSource = fs.readFileSync(path.join(root, "calamity-codex/js/app.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "calamity-codex/sw.js"), "utf8");
check(appSource.includes(`ASSET_VERSION = "${releaseVersion}"`) && appSource.includes("function releaseAsset") && appSource.includes("function versionLocalImages"), "Local sprite URLs are not tied to the current release");
check(appSource.includes("releaseAsset(`assets/item-sprites/") && appSource.includes("releaseAsset(src)") && appSource.includes("releaseAsset(localArt)"), "Item, boss or NPC cards can still request stale unversioned sprite URLs");
check(serviceWorker.includes(`VERSION = "${releaseVersion}"`) && serviceWorker.includes("currentReleaseAssetRequest(request, url)"), "Service worker does not replace stale sprite cache keys with the current release");
console.log("PASS: 101 item and 75 NPC animation sheets render as one genuine, cache-safe frame without duplicate sprites");
