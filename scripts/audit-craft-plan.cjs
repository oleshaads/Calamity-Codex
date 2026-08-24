#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(htmlSource.includes('id="recipe-plan"') && htmlSource.includes('id="recipe-plan-open"') && htmlSource.includes("data-craft-plan-count"), "Visual recipe or navigation does not expose the shared craft plan");
for (const token of [
  "function craftPlanMaterialSummary", "function craftPlanEntries", "function setCraftPlanEntry",
  "function craftPlanHTML", "function bindCraftPlan", "function craftPlanActionButton", "function addCraftPlanEntry", "craftPlanMaterials", "CRAFT_PLAN_LIMIT = 24"
]) check(appSource.includes(token), `Shared craft planner is incomplete: ${token}`);
check(appSource.includes('params.plan === "1"') && appSource.includes('data-add-craft-plan="'), "Craft planner has no direct URL or tree-inspector action");
for (const token of [".craft-plan-target", ".craft-plan-material.collected", ".craft-plan-quantity", ".craft-plan-station", ".craft-plan-empty", ".craft-plan-card-add"]) {
  check(cssSource.includes(token), `Craft planner styling is incomplete: ${token}`);
}

const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/items?s=Air%20Spinner",
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
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
let copiedText = "";
Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { copiedText = String(value); } } });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Direct craftable-item route did not request lazy catalog data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(120);
  const document = window.document;
  const airSpinner = [...document.querySelectorAll(".catalog-item-card")].find((card) => card.textContent.includes("Air Spinner"));
  const directAdd = airSpinner?.querySelector("[data-add-craft-plan]");
  check(airSpinner && directAdd && airSpinner.querySelector("[data-recipe]") && airSpinner.querySelector(".tree-primary-btn")?.getAttribute("href")?.includes("catalog%3AAirSpinner"), "Air Spinner card does not show prioritized Full tree plus separate Recipe and Add to plan controls");
  directAdd.click();
  await settle(45);
  const directSaved = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").craftPlan || [];
  check(directSaved.some(([ref, quantity]) => ref === "catalog:AirSpinner" && quantity === 1), "Direct card button did not save Air Spinner to the craft plan");
  check(directAdd.classList.contains("saved") && directAdd.getAttribute("aria-pressed") === "true" && directAdd.textContent.includes("В плане"), "Direct card button did not switch to its visible saved state");
  check(document.getElementById("recipe-modal").hidden, "Direct Add to plan button unnecessarily opened the recipe modal");

  window.location.hash = "#/crafts?plan=1";
  await settle(110);
  check(document.querySelectorAll(".craft-plan-target").length === 1 && document.querySelector(".craft-plan-target")?.textContent.includes("Аир Спиннер"), "Directly added Air Spinner did not appear in the shared plan");
  check(document.activeElement === document.getElementById("craft-plan"), "Direct craft-plan link does not focus its destination");
  document.querySelector("[data-plan-clear]").click();
  await settle(55);
  check(document.querySelector(".craft-plan-empty") && document.querySelectorAll(".craft-plan-target").length === 0, "Fresh shared craft plan could not be restored after direct-card regression check");

  const addRecipe = async (ref, expectedTitle) => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.dataset.recipe = ref;
    trigger.textContent = `Add ${ref}`;
    document.body.appendChild(trigger);
    trigger.click();
    await settle(55);
    const modal = document.getElementById("recipe-modal");
    check(!modal.hidden && document.getElementById("recipe-result-name")?.textContent === expectedTitle, `Could not open planned recipe ${ref}`);
    document.getElementById("recipe-plan").click();
    await settle(55);
    document.getElementById("recipe-close").click();
    await settle(35);
    trigger.remove();
  };

  await addRecipe("vanilla:427", "Синий факел");
  await addRecipe("vanilla:428", "Красный факел");
  check(document.querySelectorAll(".craft-plan-target").length === 2, "Two recipes were not combined in the shared plan");
  check([...document.querySelectorAll("[data-craft-plan-count]")].every((node) => node.textContent === "2"), "Shared plan count badge is stale");
  const savedPlan = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").craftPlan || [];
  check(savedPlan.some(([ref, quantity]) => ref === "vanilla:427" && quantity === 1) && savedPlan.some(([ref]) => ref === "vanilla:428"), "Shared plan targets were not persisted");
  check([...document.querySelectorAll(".craft-plan-target-art img")].every((image) => /^assets\//.test(image.getAttribute("src") || "")), "A planned result does not use genuine local art");

  const materialByEnglish = (name) => [...document.querySelectorAll(".craft-plan-material")]
    .find((card) => card.querySelector("small")?.textContent.includes(name));
  const materialCount = (card) => Number((card?.querySelector("em")?.textContent || "").replace(/[^0-9.,]/g, "").replace(",", "."));
  let gel = materialByEnglish("Gel");
  let wood = materialByEnglish("Wood");
  check(materialCount(gel) === 7 && materialCount(wood) === 7, `Shared Torch batches were not merged exactly: Gel ${materialCount(gel)}, Wood ${materialCount(wood)}`);

  let blueTarget = [...document.querySelectorAll(".craft-plan-target")].find((card) => card.dataset.planRef === "vanilla:427");
  blueTarget.querySelector('[data-plan-quantity="1"]').click();
  await settle(55);
  blueTarget = [...document.querySelectorAll(".craft-plan-target")].find((card) => card.dataset.planRef === "vanilla:427");
  check(blueTarget.querySelector("[data-plan-quantity-input]")?.value === "2" && blueTarget.textContent.includes("получится ×20"), "Plan target quantity or real result batch did not recalculate");
  gel = materialByEnglish("Gel");
  wood = materialByEnglish("Wood");
  check(materialCount(gel) === 10 && materialCount(wood) === 10, `Combined plan did not round 30 Torches to 10 shared batches: ${materialCount(gel)}/${materialCount(wood)}`);

  const gelKey = gel.dataset.planMaterial;
  gel.click();
  await settle(55);
  gel = [...document.querySelectorAll("[data-plan-material]")].find((card) => card.dataset.planMaterial === gelKey);
  const savedMaterials = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").craftPlanMaterials || [];
  check(gel.classList.contains("collected") && gel.getAttribute("aria-pressed") === "true" && savedMaterials.includes(gelKey), "Shared material checklist was not persisted or announced");
  check(document.querySelector(".craft-plan-resources output")?.textContent.includes("1 из"), "Shared material progress did not advance");

  document.querySelector("[data-plan-copy]").click();
  await settle(30);
  check(copiedText.includes("Общий план крафта") && copiedText.includes("Синий факел") && copiedText.includes("Красный факел") && copiedText.includes("10 × Гель"), "Copied shared plan is incomplete or ignores recalculated material totals");

  const redTarget = [...document.querySelectorAll(".craft-plan-target")].find((card) => card.dataset.planRef === "vanilla:428");
  redTarget.querySelector("[data-plan-remove]").click();
  await settle(55);
  check(document.querySelectorAll(".craft-plan-target").length === 1 && [...document.querySelectorAll("[data-craft-plan-count]")].every((node) => node.textContent === "1"), "Removing a target did not update the plan and its badge");
  document.querySelector("[data-plan-clear]").click();
  await settle(55);
  const cleared = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}");
  check(document.querySelector(".craft-plan-empty") && !cleared.craftPlan?.length && !cleared.craftPlanMaterials?.length, "Clearing the shared plan did not remove targets and checklist state");
  check(errors.length === 0, `Shared craft-plan flow emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: up to 24 saved craft targets share exact batch-aware resources, stations, copy output and one persistent checklist");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
