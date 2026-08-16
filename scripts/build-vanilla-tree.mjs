#!/usr/bin/env node
/**
 * Build the offline vanilla Terraria tree index used by the craft graph.
 *
 * Usage:
 *   node scripts/build-vanilla-tree.mjs items.json recipes.json crafting_stations.json output.js
 *
 * The checked-in output was built from:
 *   natan-dot-com/Terraria-Dataset
 *   commit 51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e
 */
import fs from "node:fs";
import path from "node:path";

const [itemsPath, recipesPath, stationsPath, outputPath] = process.argv.slice(2);
if (!itemsPath || !recipesPath || !stationsPath || !outputPath) {
  console.error("Usage: node scripts/build-vanilla-tree.mjs items.json recipes.json crafting_stations.json output.js");
  process.exit(1);
}
const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
const items = read(itemsPath);
const recipes = read(recipesPath);
const stations = read(stationsPath);
const itemRows = items.map((item) => [Number(item.ID), item.Name, item.Type || "Item"]);
const itemIds = new Set(itemRows.map(([id]) => String(id)));
const recipeRows = recipes.map((recipe) => [
  Number(recipe["Result ID"]),
  Number(recipe["Result Quantity"] || 1),
  Number(recipe["Table ID"]),
  (recipe.Recipe || []).map((ingredient) => {
    // The source uses -1 for the Enchanted Sword alternate slot in Zenith.
    const id = Number(ingredient["Ingredient ID"]);
    return [id === -1 ? 989 : id, Number(ingredient.Quantity || 1)];
  })
]);
for (const [, , , ingredients] of recipeRows) {
  for (const [id] of ingredients) {
    if (!itemIds.has(String(id))) throw new Error(`Unknown vanilla ingredient id: ${id}`);
  }
}
const stationRows = stations.map((station) => [Number(station["Table ID"]), station.Name]);
const output = `/* Vanilla Terraria 1.4.4 item/recipe index. Source and revision are documented in assets/PROVENANCE.md. */\nwindow.CALAMITY_VANILLA_TREE_INDEX=${JSON.stringify({
  source: "natan-dot-com/Terraria-Dataset",
  commit: "51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e",
  sourceDate: "2022-01-31",
  items: itemRows,
  recipes: recipeRows,
  stations: stationRows,
  coverage: { items: itemRows.length, recipes: recipeRows.length, normalizedNegativeIngredientIds: 1 }
})};\n`;
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), output);
console.log(`Wrote ${itemRows.length} vanilla items, ${recipeRows.length} recipes and ${stationRows.length} stations to ${outputPath}`);
