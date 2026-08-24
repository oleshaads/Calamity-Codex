#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { minify } from "terser";
import CleanCSS from "clean-css";

const root = path.resolve(process.argv[2] || "calamity-codex");
const coreFiles = [
  "data.js",
  "extra.js",
  "lexicon.js",
  "plain.js",
  "plain-late.js",
  "polish.js",
  "bosses.js",
  "sprites.js",
  "app.js"
];
const catalogFiles = [
  "catalog.js",
  "boss-relations.js",
  "useful.js",
  "vanilla-tree.js",
  "vanilla-meta.js",
  "vanilla-ru.js",
  "npc-sources.js",
  "npc-ru.js",
  "npc-art.js",
  "ru-names.js",
  "mobs.js", "mob-guide.js", "vanilla-drops.js"
];
const readSources = (files) => files
  .map((name) => fs.readFileSync(path.join(root, "js", name), "utf8"))
  .join(";\n");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function buildJavaScript(files, label) {
  const source = readSources(files);
  const result = await minify(source, {
    compress: { passes: 3, ecma: 2020 },
    mangle: true,
    format: { comments: false, ecma: 2020 }
  });
  if (!result.code) throw new Error(`Terser returned an empty ${label} bundle`);
  return `/*! Calamity Codex ${label}; source-sha256:${digest(source)} */\n${result.code}\n`;
}

const [coreBundle, catalogBundle] = await Promise.all([
  buildJavaScript(coreFiles, "core runtime"),
  buildJavaScript(catalogFiles, "lazy catalog data")
]);
const cssSource = fs.readFileSync(path.join(root, "css", "modern.css"), "utf8");
const cssResult = new CleanCSS({ level: 2 }).minify(cssSource);
if (cssResult.errors.length) throw new Error(cssResult.errors.join("\n"));

// Манифест всей игровой графики: страница прогревает по нему кэш
// сервис-воркера в фоне, после чего каждый спрайт открывается мгновенно
// и офлайн. «core» — лёгкие витринные наборы, «heavy» — полные каталоги.
const ART_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".gif"]);
const listArt = (dir) => {
  const absolute = path.join(root, "assets", dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { recursive: true })
    .map((entry) => String(entry).replace(/\\/g, "/"))
    .filter((entry) => ART_EXTENSIONS.has(path.extname(entry).toLowerCase()))
    .map((entry) => `assets/${dir}/${entry}`)
    .sort();
};
const rootArt = fs.readdirSync(path.join(root, "assets"))
  .filter((entry) => ART_EXTENSIONS.has(path.extname(entry).toLowerCase()))
  .map((entry) => `assets/${entry}`)
  .sort();
const spriteManifest = {
  core: [...rootArt, ...["sprites", "boss-sprites", "npc-sprites", "mob-sprites", "headers", "lex", "vanilla-extra"].flatMap(listArt)],
  heavy: [...["item-sprites", "biomes", "themes", "vanilla-sprites"].flatMap(listArt)]
};
fs.writeFileSync(path.join(root, "assets", "sprite-manifest.json"), JSON.stringify(spriteManifest));
console.log(`assets/sprite-manifest.json: ${spriteManifest.core.length} core + ${spriteManifest.heavy.length} heavy art files`);

const outputs = [
  [path.join(root, "js", "codex.min.js"), coreBundle],
  [path.join(root, "js", "codex-data.min.js"), catalogBundle],
  [path.join(root, "css", "modern.min.css"), `/*! Calamity Codex styles; source-sha256:${digest(cssSource)} */\n${cssResult.styles}\n`]
];
for (const [output, content] of outputs) {
  const temporary = `${output}.tmp`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, output);

  // The local production server can serve this deterministic sidecar directly
  // when the browser advertises Brotli support. Generic static hosts may ignore
  // it and continue to serve the original file normally.
  const brotli = zlib.brotliCompressSync(Buffer.from(content), {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11
    }
  });
  const brotliOutput = `${output}.br`;
  const brotliTemporary = `${brotliOutput}.tmp`;
  fs.writeFileSync(brotliTemporary, brotli);
  fs.renameSync(brotliTemporary, brotliOutput);

  const raw = Buffer.byteLength(content);
  const gzip = zlib.gzipSync(content, { level: 9 }).length;
  console.log(`${path.relative(process.cwd(), output)}: ${(raw / 1024).toFixed(1)} KiB raw, ${(gzip / 1024).toFixed(1)} KiB gzip, ${(brotli.length / 1024).toFixed(1)} KiB br`);
}
