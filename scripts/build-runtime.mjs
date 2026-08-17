#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { minify } from "terser";
import CleanCSS from "clean-css";

const root = path.resolve(process.argv[2] || "calamity-codex");
const jsFiles = [
  "data.js",
  "extra.js",
  "lexicon.js",
  "plain.js",
  "plain-late.js",
  "polish.js",
  "sprites.js",
  "catalog.js",
  "vanilla-tree.js",
  "vanilla-ru.js",
  "npc-sources.js",
  "npc-ru.js",
  "npc-art.js",
  "ru-names.js",
  "app.js"
];

const source = jsFiles
  .map((name) => fs.readFileSync(path.join(root, "js", name), "utf8"))
  .join(";\n");
const jsResult = await minify(source, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false }
});
if (!jsResult.code) throw new Error("Terser returned an empty runtime bundle");

const cssSource = fs.readFileSync(path.join(root, "css", "modern.css"), "utf8");
const cssResult = new CleanCSS({ level: 2 }).minify(cssSource);
if (cssResult.errors.length) throw new Error(cssResult.errors.join("\n"));
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

const outputs = [
  [path.join(root, "js", "codex.min.js"), `/*! Calamity Codex runtime; source-sha256:${digest(source)} */\n${jsResult.code}\n`],
  [path.join(root, "css", "modern.min.css"), `/*! Calamity Codex styles; source-sha256:${digest(cssSource)} */\n${cssResult.styles}\n`]
];
for (const [output, content] of outputs) {
  const temporary = `${output}.tmp`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, output);
  const raw = Buffer.byteLength(content);
  const gzip = zlib.gzipSync(content, { level: 9 }).length;
  console.log(`${path.relative(process.cwd(), output)}: ${(raw / 1024).toFixed(1)} KiB raw, ${(gzip / 1024).toFixed(1)} KiB gzip`);
}
