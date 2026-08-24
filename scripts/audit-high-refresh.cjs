#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;

let nextFrameId = 1;
let frameQueue = new Map();
window.requestAnimationFrame = (callback) => {
  const id = nextFrameId++;
  frameQueue.set(id, callback);
  return id;
};
window.cancelAnimationFrame = (id) => frameQueue.delete(id);
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
let canvasFrames = 0;
let particleDraws = 0;
window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() { canvasFrames += 1; },
  beginPath() {},
  arc() { particleDraws += 1; },
  fill() {}, fillRect() { particleDraws += 1; }, save() {}, translate() {}, rotate() {}, restore() {},
  set fillStyle(value) {}
});

window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const frameDuration = 1000 / 180;
for (let frame = 1; frame <= 72; frame += 1) {
  const callbacks = [...frameQueue.values()];
  frameQueue = new Map();
  const timestamp = frame * frameDuration;
  callbacks.forEach((callback) => callback(timestamp));
}

check(window.document.documentElement.dataset.refreshRate === "180", `Refresh detector reported ${window.document.documentElement.dataset.refreshRate || "nothing"} for a 180 Hz schedule`);
check(canvasFrames >= 68, `Particle canvas rendered only ${canvasFrames}/72 high-refresh frames`);
check(particleDraws >= canvasFrames * 16, "Adaptive particle quality fell below its protected minimum");
check(errors.length === 0, `High-refresh runtime emitted errors: ${errors.join("\n")}`);
console.log(`PASS: simulated 180 Hz schedule rendered ${canvasFrames} canvas frames and was classified as 180 Hz`);
dom.window.close();
