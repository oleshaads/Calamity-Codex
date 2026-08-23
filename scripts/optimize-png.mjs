#!/usr/bin/env node
/**
 * Лосслесс-сжатие всех PNG сайта официальным кодеком oxipng (WASM-сборка
 * Squoosh). Пиксели не меняются вообще — уменьшается только размер файла
 * (перепаковка фильтров и deflate-потока). Проверка: `convert file txt:- | md5`
 * до и после совпадает.
 *
 * Запуск: node scripts/optimize-png.mjs [уровень=4]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "calamity-codex", "assets");
const level = Number(process.argv[2] || 4);

const { init, default: optimise } = await import("@jsquash/oxipng/optimise.js");
const wasmPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm");
await init(await WebAssembly.compile(fs.readFileSync(wasmPath)));

const files = fs.readdirSync(root, { recursive: true })
  .map((entry) => String(entry))
  .filter((entry) => entry.toLowerCase().endsWith(".png"))
  .map((entry) => path.join(root, entry));

let before = 0;
let after = 0;
let changed = 0;
let processed = 0;
for (const file of files) {
  const source = fs.readFileSync(file);
  before += source.length;
  let output = source;
  try {
    const optimised = Buffer.from(await optimise(source, { level }));
    if (optimised.length < source.length) {
      fs.writeFileSync(file, optimised);
      output = optimised;
      changed += 1;
    }
  } catch {
    // Нестандартный PNG остаётся как есть.
  }
  after += output.length;
  processed += 1;
  if (processed % 1000 === 0) console.log(`${processed}/${files.length}…`);
}
const mb = (n) => (n / 1048576).toFixed(2);
console.log(`PNG: ${files.length} файлов, сжато ${changed}; ${mb(before)} МБ → ${mb(after)} МБ (−${(100 * (1 - after / before)).toFixed(1)}%)`);
