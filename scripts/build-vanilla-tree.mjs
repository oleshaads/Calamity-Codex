#!/usr/bin/env node
/**
 * Build the compact offline vanilla Terraria tree index used by the craft graph.
 *
 * Usage:
 *   node scripts/build-vanilla-tree.mjs items.json recipes.json crafting_stations.json output.js [sprite-directory]
 *
 * The checked-in output was built from:
 *   natan-dot-com/Terraria-Dataset
 *   commit 51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e
 */
import fs from "node:fs";
import path from "node:path";

const [itemsPath, recipesPath, stationsPath, outputPath, spriteDirectory = ""] = process.argv.slice(2);
if (!itemsPath || !recipesPath || !stationsPath || !outputPath) {
  console.error("Usage: node scripts/build-vanilla-tree.mjs items.json recipes.json crafting_stations.json output.js [sprite-directory]");
  process.exit(1);
}
const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
const items = read(itemsPath);
const recipes = read(recipesPath);
const stations = read(stationsPath);
const spriteRoot = spriteDirectory ? path.resolve(spriteDirectory) : "";
const itemRows = items.map((item) => {
  const id = Number(item.ID);
  const hasSprite = Boolean(spriteRoot && fs.existsSync(path.join(spriteRoot, `${id}.png`)));
  return { id, name: item.Name, type: item.Type || "Item", hasSprite };
});
if (!itemRows.every((item, index) => item.id === index + 1)) {
  throw new Error("Compact vanilla index requires sequential item IDs starting at 1");
}
const itemIds = new Set(itemRows.map((item) => String(item.id)));
const recipeRows = recipes.map((recipe) => [
  Number(recipe["Result ID"]),
  Number(recipe["Table ID"]),
  (recipe.Recipe || []).map((ingredient) => {
    // The source uses -1 for the Enchanted Sword alternate slot in Zenith.
    const id = Number(ingredient["Ingredient ID"]);
    return [id === -1 ? 989 : id, Number(ingredient.Quantity || 1)];
  })
]);
for (const [, , ingredients] of recipeRows) {
  for (const [id] of ingredients) {
    if (!itemIds.has(String(id))) throw new Error(`Unknown vanilla ingredient id: ${id}`);
  }
}
const typeNames = [...new Set(itemRows.map((item) => item.type))];
const typeIds = new Map(typeNames.map((name, id) => [name, id]));
const compactItems = itemRows.map((item) => [item.name, typeIds.get(item.type)]);
const stationRows = stations.map((station) => [Number(station["Table ID"]), station.Name]);
const missingSpriteIds = itemRows.filter((item) => !item.hasSprite).map((item) => item.id);
const output = `/* Compact vanilla Terraria item/recipe index. Source and revision are documented in assets/PROVENANCE.md. */\nwindow.CALAMITY_VANILLA_TREE_INDEX=${JSON.stringify({
  format: 2,
  firstItemId: 1,
  source: "natan-dot-com/Terraria-Dataset",
  commit: "51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e",
  sourceDate: "2022-01-31",
  types: typeNames,
  items: compactItems,
  recipes: recipeRows,
  stations: stationRows,
  coverage: {
    items: itemRows.length,
    recipes: recipeRows.length,
    sprites: itemRows.length - missingSpriteIds.length,
    missingSpriteIds,
    normalizedNegativeIngredientIds: 1
  }
})};\n`;
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), output);
console.log(`Wrote ${itemRows.length} compact vanilla items, ${recipeRows.length} recipes and ${stationRows.length} stations to ${outputPath}`);
