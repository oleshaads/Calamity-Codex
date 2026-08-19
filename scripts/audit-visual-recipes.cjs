#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
check(htmlSource.includes('id="recipe-modal"') && htmlSource.includes('aria-labelledby="recipe-dialog-title recipe-result-name"') && htmlSource.includes('aria-describedby="recipe-dialog-help"'), "Visual recipe dialog lacks accessible semantics");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(appSource.includes("function openRecipeModal") && appSource.includes("function renderVisualRecipe") && appSource.includes("function recipeChecklistState") && appSource.includes("toggleRecipeChecklistItem") && appSource.includes("recipeCraftQuantity") && appSource.includes("multipliedIngredientCount") && appSource.includes("craftTreeMaterialSummary(materialRoot, quantity)") && appSource.includes("craftTreeStationSummary") && appSource.includes('closest?.("[data-recipe]")'), "Visual recipe controls, quantity recalculation, full material rollup or persistent ingredient checklist are not wired globally");
check(appSource.includes("recipe-ingredient-grid") && appSource.includes("craftStationSprite(recipe.station)") && appSource.includes("recipe-base-grid") && appSource.includes("recipe-station-chain"), "Visual recipe does not render ingredient, full-branch resource and station imagery");
for (const token of ["DraedonsForge.png", "VoidCondenser.png", "ancient-manipulator.png", "tinkerers-workshop.png", "mythril-anvil.png"]) {
  check(appSource.includes(token), `Craft station imagery is incomplete: ${token}`);
}
const css = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(css.includes("отдельный визуальный рецепт") && css.includes(".recipe-equation") && css.includes(".recipe-ingredient-art") && css.includes(".recipe-result-art") && css.includes(".recipe-station") && css.includes(".obtain-btn") && css.includes(".recipe-checklist") && css.includes(".recipe-ingredient.collected") && css.includes(".recipe-quantity") && css.includes(".recipe-material-plan") && css.includes(".recipe-base-material.collected") && css.includes(".recipe-station-chain"), "Visual recipe, quantity controls, full material estimate, obtaining actions or persistent checklist have incomplete styling");

// Exhaustive source-level audit: every one of the 2535 catalog cards must get
// exactly the appropriate primary action. Reversible wall/platform recipes are
// kept for this standalone view even though the full dependency graph prunes
// them to remain acyclic.
const sourceHtml = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const sourceDom = new JSDOM(sourceHtml, { url: "http://localhost/#/", runScripts: "outside-only", pretendToBeVisual: true });
const sourceWindow = sourceDom.window;
sourceWindow.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
sourceWindow.scrollTo = () => {};
sourceWindow.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
for (const name of [
  "data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "bosses.js", "sprites.js",
  "catalog.js", "boss-relations.js", "useful.js", "vanilla-tree.js", "vanilla-meta.js", "vanilla-ru.js", "npc-sources.js", "npc-ru.js", "npc-art.js", "ru-names.js"
]) sourceWindow.eval(`${fs.readFileSync(path.join(root, "js", name), "utf8")}\n//# sourceURL=${name}`);
let sourceApp = appSource.replace(/\}\)\(\);\s*$/, "window.__VISUAL_RECIPE_AUDIT={indexedItems,indexedItemCard,itemCard,craftCard,usefulEntries,usefulCard,visualRecipeFor,ingredientInfo,craftTreeMaterialSummary};})();");
check(sourceApp !== appSource, "Could not instrument app source for exhaustive recipe audit");
sourceWindow.eval(`${sourceApp}\n//# sourceURL=app.js`);
const sourceApi = sourceWindow.__VISUAL_RECIPE_AUDIT;
const calamityCatalog = sourceWindow.CALAMITY_ITEM_INDEX;
check(calamityCatalog.coverage?.multiOutputRecipes === 283 && calamityCatalog.coverage?.maxResultQuantity === 999 && calamityCatalog.recipeYields?.length === 283, "Calamity catalog does not preserve all official result batch sizes");
check(sourceApi.visualRecipeFor("catalog:AlgalPrismTorch")?.yield === 3, "Visual recipe decoder does not expose Calamity result quantity");
const vanillaTree = sourceWindow.CALAMITY_VANILLA_TREE_INDEX;
check(vanillaTree.coverage?.multiOutputRecipes === 454 && vanillaTree.coverage?.maxResultQuantity === 333, "Vanilla recipe index does not preserve all official result batch sizes");
check(vanillaTree.recipes.find((row) => Number(row[0]) === 8)?.[3] === 3, "Torch recipe lost its three-item output quantity");
check(sourceApi.visualRecipeFor("vanilla:8")?.yield === 3, "Visual recipe decoder does not expose vanilla result quantity");
const blueTorchMaterials = sourceApi.craftTreeMaterialSummary("vanilla:427", 1);
const blueTorchByName = new Map(blueTorchMaterials.map((item) => [item.info.en || item.info.name, item.count]));
check(blueTorchByName.get("Gel") === 4 && blueTorchByName.get("Wood") === 4 && blueTorchByName.get("Sapphire") === 1, `Batched material estimate is wrong for 10 Blue Torches: ${JSON.stringify([...blueTorchByName])}`);
const allCatalogItems = sourceApi.indexedItems();
const craftableCatalogItems = allCatalogItems.filter((item) => /^Скрафтить/i.test(item.obtain || ""));
const nonCraftCatalogItems = allCatalogItems.filter((item) => !/^Скрафтить/i.test(item.obtain || ""));
check(craftableCatalogItems.length === 1689 && nonCraftCatalogItems.length === 846, `Unexpected catalog craft split: ${craftableCatalogItems.length}/${nonCraftCatalogItems.length}`);
check(!craftableCatalogItems.some((item) => /\+\s*ещё\s+\d+/i.test(item.obtain || "")), "A catalog recipe still replaces named ingredients with '+ ещё N'");
const expandedRecipeExpectations = {
  AngelTreads: 6, AngelicAlliance: 7, Apotheosis: 7, TrueBiomeBlade: 6, CosmicWorm: 3,
  DiamondOfTheDeep: 7, DraedonsForge: 7, DragonPow: 8, EnchantedButterfly: 10,
  GemTechBodyArmor: 7, GemTechHeadgear: 7, GemTechSchynbaulds: 7, HeartoftheElements: 6,
  KelvinCatalyst: 6, LightGodsBrilliance: 7, MiracleMatter: 10, MOAB: 6, NanoblackReaper: 6,
  RainbowPartyCannon: 6, Roxcalibur: 6, SHPC: 6, TacticiansTrumpCard: 7, ThaumaticChair: 20,
  TheAmalgam: 7, TheCamper: 8, TheTransformer: 7, Ultima: 6, ValkyrieRay: 6
};
for (const [id, count] of Object.entries(expandedRecipeExpectations)) {
  const recipe = sourceApi.visualRecipeFor(`catalog:${id}`);
  check(recipe?.ings?.length === count, `${id} must expose all ${count} named ingredients, got ${recipe?.ings?.length || 0}`);
  check(recipe.ings.every((ingredient) => !/^ещё\b/i.test(String(ingredient.name || ""))), `${id} still contains a synthetic unnamed ingredient`);
  for (const ingredient of recipe.ings) {
    const info = sourceApi.ingredientInfo(ingredient.key || ingredient.name);
    check(/[А-Яа-яЁё]/.test(info.ru || "") && !/Кхаир|Соулоф|Фрагмент (?:Солар|Небула|Стардуст)|Фоод|Форге|Мйтхрил|Стоне Блок/i.test(info.ru || ""), `${id} has an unreadable ingredient translation: ${ingredient.name} -> ${info.ru}`);
    if (/^(?:Any\b|Hardmode Forge$)/i.test(String(ingredient.name || ""))) check(info.artNote, `${ingredient.name} uses representative group art without an honest label`);
  }
}
const catalogBuilder = fs.readFileSync(path.resolve(root, "../scripts/build-item-catalog.mjs"), "utf8");
check(!catalogBuilder.includes("recipe.ingredients.slice(0, 5)") && catalogBuilder.includes("semicolon as optional") && catalogBuilder.includes('const parts = recipe.ingredients.join(" + ")') && catalogBuilder.includes("resultQuantity") && catalogBuilder.includes("recipeYields"), "Catalog rebuild would truncate long recipes, flatten alternatives or lose Calamity result batches again");
const vanillaBuilder = fs.readFileSync(path.resolve(root, "../scripts/build-vanilla-tree.mjs"), "utf8");
check(vanillaBuilder.includes('recipe["Result Quantity"]') && vanillaBuilder.includes("multiOutputRecipes") && vanillaBuilder.includes("maxResultQuantity"), "Vanilla tree rebuild would lose result batch sizes");
const missingCatalogRecipes = craftableCatalogItems.filter((item) => {
  if (!sourceApi.visualRecipeFor(`catalog:${item.id}`)) return true;
  const html = sourceApi.indexedItemCard(item);
  return !html.includes("data-recipe=") || !html.includes("data-add-craft-plan=");
});
check(!missingCatalogRecipes.length, `Craftable catalog items without recipe/add-to-plan buttons (${missingCatalogRecipes.length}): ${missingCatalogRecipes.slice(0, 20).map((item) => item.name).join(", ")}`);
const missingCatalogSources = nonCraftCatalogItems.filter((item) => {
  const html = sourceApi.indexedItemCard(item);
  return sourceApi.visualRecipeFor(`catalog:${item.id}`) ? !html.includes("data-recipe=") : !/obtain-btn[\s\S]*data-item-details=/.test(html);
});
check(!missingCatalogSources.length, `Catalog items without verifiable recipe/obtaining actions: ${missingCatalogSources.slice(0, 20).map((item) => item.name).join(", ")}`);
const missingGuideActions = (sourceWindow.CODEX.items || []).filter((item) => {
  const html = sourceApi.itemCard(item, "all", "all");
  return sourceApi.visualRecipeFor(item.name)
    ? !html.includes("data-recipe=") || !html.includes("data-add-craft-plan=")
    : !/obtain-btn[\s\S]*data-item-details=/.test(html);
});
check(!missingGuideActions.length, `Guide items without recipe/add-to-plan/obtaining actions: ${missingGuideActions.slice(0, 20).map((item) => item.name).join(", ")}`);
const missingUsefulActions = sourceApi.usefulEntries().filter((item) => {
  const html = sourceApi.usefulCard(item);
  return sourceApi.visualRecipeFor(item.ref)
    ? !html.includes("data-recipe=") || !html.includes("data-add-craft-plan=")
    : !/obtain-btn[\s\S]*data-item-details=/.test(html);
});
check(!missingUsefulActions.length, `Useful items without recipe/add-to-plan/obtaining actions: ${missingUsefulActions.map((item) => item.title).join(", ")}`);
const missingCraftPlanActions = (sourceWindow.CODEX.crafts || []).filter((item) => {
  const name = item.name || item.t || "";
  return sourceApi.visualRecipeFor(name) && !sourceApi.craftCard(item).includes("data-add-craft-plan=");
});
check(!missingCraftPlanActions.length, `Craft recommendation cards without direct plan buttons: ${missingCraftPlanActions.map((item) => item.name || item.t).join(", ")}`);
sourceDom.window.close();

const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/items?s=Desert%20Medallion",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {},
  set fillStyle(value) {}
});
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Direct craftable-item route did not request lazy data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(100);
  const document = window.document;
  let card = [...document.querySelectorAll(".catalog-item-card")].find((entry) => entry.textContent.includes("Desert Medallion"));
  check(card, "Craftable catalog card did not render");
  check(!card.querySelector(".recipe-fact"), "Recipe is still mixed into the catalog facts");
  const recipeButton = card.querySelector("[data-recipe]");
  check(recipeButton && card.querySelector("[data-add-craft-plan]") && card.querySelector(".tree-primary-btn")?.getAttribute("href")?.includes("#/crafts?item="), "Catalog card does not prioritize a direct full-page tree before recipe and plan actions");
  recipeButton.focus();
  recipeButton.click();
  await settle(60);

  const modal = document.getElementById("recipe-modal");
  const panel = modal.querySelector(".recipe-panel");
  check(!modal.hidden && document.body.classList.contains("recipe-open"), "Visual recipe modal did not open");
  check(document.getElementById("recipe-result-name")?.textContent, "Visual recipe has no result title");
  check(document.activeElement === document.getElementById("recipe-close"), "Visual recipe did not focus its close control");
  check(document.querySelector(".shell")?.hasAttribute("inert") && document.querySelector(".mobile-tabs")?.hasAttribute("inert"), "Visual recipe did not make the background inert");
  let ingredients = [...modal.querySelectorAll(".recipe-ingredient")];
  check(ingredients.length >= 3, `Visual recipe rendered too few ingredients: ${ingredients.length}`);
  check(ingredients.every((entry) => entry.querySelector(".recipe-ingredient-art img") && /^assets\//.test(entry.querySelector("img").getAttribute("src")) && /^×\d/.test(entry.querySelector(".recipe-ingredient-count")?.textContent || "")), "Visual recipe has an ingredient without local art or quantity");
  check(modal.querySelector(".recipe-result-art img") && /^assets\//.test(modal.querySelector(".recipe-result-art img").getAttribute("src")), "Visual recipe result lacks genuine local art");
  check(modal.querySelector(".recipe-station img") && /^assets\//.test(modal.querySelector(".recipe-station img").getAttribute("src")), "Visual recipe station lacks genuine local art");
  check(modal.querySelector(".recipe-station b")?.textContent.trim(), "Visual recipe station has no readable label");
  let baseMaterials = [...modal.querySelectorAll("[data-recipe-material-toggle]")];
  check(modal.querySelector(".recipe-material-plan") && baseMaterials.length >= 3, "Visual recipe does not expose a full base-resource estimate");
  check(baseMaterials.every((entry) => entry.querySelector(".recipe-base-material-art img") && /^assets\//.test(entry.querySelector("img").getAttribute("src")) && /^×\d/.test(entry.querySelector("em")?.textContent || "")), "A base resource lacks genuine local art or a total quantity");
  check(modal.querySelectorAll(".recipe-chain-station img").length >= 1 && [...modal.querySelectorAll(".recipe-chain-station b")].every((entry) => entry.textContent.trim()), "Full recipe branch does not show its required stations with local art");
  check((modal.querySelector("[data-copy-recipe-materials]")?.dataset.copyRecipeMaterials || "").includes("полная смета"), "Base-resource estimate cannot be copied");
  const initialBaseCount = Number((baseMaterials[0].querySelector("em")?.textContent || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  const initialIngredientCount = Number((ingredients[0].querySelector(".recipe-ingredient-count")?.textContent || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  modal.querySelector('[data-recipe-quantity="1"]').click();
  await settle(50);
  check(modal.querySelector("[data-recipe-quantity-input]")?.value === "2", "Recipe quantity stepper did not advance to two crafts");
  ingredients = [...modal.querySelectorAll(".recipe-ingredient")];
  const doubledIngredientCount = Number((ingredients[0].querySelector(".recipe-ingredient-count")?.textContent || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  check(doubledIngredientCount === initialIngredientCount * 2, `Ingredient quantity was not recalculated: ${initialIngredientCount} -> ${doubledIngredientCount}`);
  baseMaterials = [...modal.querySelectorAll("[data-recipe-material-toggle]")];
  const doubledBaseCount = Number((baseMaterials[0].querySelector("em")?.textContent || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  check(doubledBaseCount === initialBaseCount * 2, `Full base-resource estimate was not recalculated: ${initialBaseCount} -> ${doubledBaseCount}`);
  check((modal.querySelector("[data-copy-recipe-materials]")?.dataset.copyRecipeMaterials || "").includes(`${doubledBaseCount} ×`), "Copied full resource estimate did not adopt the selected craft quantity");
  const savedQuantities = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").recipeQuantities || {};
  check(Object.values(savedQuantities).includes(2), "Recipe craft quantity was not persisted in the hero profile");
  check((modal.querySelector("[data-copy-recipe-list]")?.dataset.copyRecipeList || "").includes(`${doubledIngredientCount} ×`), "Copied ingredient list did not adopt the selected craft quantity");
  modal.querySelector('[data-recipe-quantity="-1"]').click();
  await settle(50);
  ingredients = [...modal.querySelectorAll(".recipe-ingredient")];
  check(modal.querySelector("[data-recipe-quantity-input]")?.value === "1", "Recipe quantity stepper did not return to one craft");
  check(modal.querySelector(".recipe-checklist output")?.textContent.includes(`0 из ${ingredients.length}`), "Fresh visual recipe checklist does not start empty");
  const firstIngredientKey = ingredients[0].dataset.materialKey;
  ingredients[0].click();
  await settle(50);
  const savedChecklist = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").recipeIngredients || {};
  check(Object.values(savedChecklist).some((values) => Array.isArray(values) && values.includes(firstIngredientKey)), "Collected recipe ingredient was not persisted in the hero profile");
  const updatedIngredient = [...modal.querySelectorAll("[data-recipe-check]")].find((entry) => entry.dataset.materialKey === firstIngredientKey);
  check(updatedIngredient?.classList.contains("collected") && updatedIngredient.getAttribute("aria-pressed") === "true", "Collected recipe ingredient has no visible or announced state");
  check(modal.querySelector(".recipe-checklist output")?.textContent.includes(`1 из ${ingredients.length}`), "Recipe checklist progress did not advance");
  modal.querySelector("[data-reset-recipe-list]").click();
  await settle(50);
  check(modal.querySelector(".recipe-checklist output")?.textContent.includes(`0 из ${ingredients.length}`), "Recipe checklist reset did not clear progress");

  baseMaterials = [...modal.querySelectorAll("[data-recipe-material-toggle]")];
  const firstBaseKey = baseMaterials[0].dataset.materialKey;
  baseMaterials[0].click();
  await settle(50);
  const savedBaseMaterials = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").craftMaterials || {};
  check(Object.values(savedBaseMaterials).some((values) => Array.isArray(values) && values.includes(firstBaseKey)), "Collected base resource was not persisted in the hero profile");
  const updatedBaseMaterial = [...modal.querySelectorAll("[data-recipe-material-toggle]")].find((entry) => entry.dataset.materialKey === firstBaseKey);
  check(updatedBaseMaterial?.classList.contains("collected") && updatedBaseMaterial.getAttribute("aria-pressed") === "true", "Collected base resource has no visible or announced state");
  check(modal.querySelector(".recipe-material-plan > output")?.textContent.includes("1 из"), "Base-resource progress did not advance");
  modal.querySelector("[data-reset-recipe-materials]").click();
  await settle(50);
  check(modal.querySelector(".recipe-material-plan > output")?.textContent.includes("0 из"), "Base-resource reset did not clear progress");

  const focusable = [...panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
  focusable.at(-1).focus();
  focusable.at(-1).dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  check(document.activeElement === focusable[0], "Tab does not wrap inside the visual recipe dialog");
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle(50);
  check(modal.hidden && !document.body.classList.contains("recipe-open"), "Escape did not close the visual recipe");
  check(document.activeElement === recipeButton, "Closing visual recipe did not restore focus to its button");

  const torchTrigger = document.createElement("button");
  torchTrigger.type = "button";
  torchTrigger.dataset.recipe = "vanilla:8";
  torchTrigger.textContent = "Torch recipe test";
  document.getElementById("app").appendChild(torchTrigger);
  torchTrigger.click();
  await settle(60);
  check(!modal.hidden && modal.querySelector(".recipe-result-side em")?.textContent.includes("1 крафт → 3 шт."), "Visual recipe does not show the real output batch for Torch");
  check((modal.querySelector("[data-copy-recipe-list]")?.dataset.copyRecipeList || "").includes("1 крафт → 3 шт."), "Copied recipe does not include its output batch size");
  modal.querySelector("[data-recipe-close]").click();
  await settle(40);
  torchTrigger.remove();

  window.location.hash = "#/items?mode=guide&s=Desert%20Medallion";
  await settle(90);
  card = [...document.querySelectorAll(".card")].find((entry) => entry.textContent.includes("Пустынный медальон"));
  check(card && card.querySelector("[data-recipe]") && card.querySelector("[data-add-craft-plan]") && !card.querySelector(".recipe-fact"), "Guide card does not use separate recipe and direct plan buttons");

  window.location.hash = "#/useful?type=craft";
  await settle(100);
  const usefulCards = [...document.querySelectorAll(".useful-card")];
  const usefulRecipeCards = usefulCards.filter((entry) => entry.querySelector("[data-recipe]"));
  check(usefulRecipeCards.length >= 7, "Useful crafting category exposes too few separate recipe buttons");
  check(usefulRecipeCards.every((entry) => entry.querySelector("[data-add-craft-plan]") && !entry.querySelector(".recipe-fact")), "Useful card lacks a direct plan button or still mixes recipe content with general information");
  check(usefulCards.every((entry) => entry.querySelector("[data-recipe], .obtain-btn")), "A useful item has neither a recipe nor an obtaining button");
  check(errors.length === 0, `Visual recipe flow emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: all 1689 craftable items have visual recipes, exact batch yields, quantity-aware base-resource estimates and two saved checklists; every other item has an obtaining action");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
