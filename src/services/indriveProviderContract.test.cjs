const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");

test("mobile keeps provider calls behind the existing API client", () => {
  const maps = fs.readFileSync(path.join(root, "src/services/maps.service.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "src/screens/HomeScreen.js"), "utf8");
  assert.match(maps, /\/providers\/indrive\/suggestions/);
  assert.match(maps, /\/providers\/indrive\/route/);
  assert.match(maps, /\/providers\/indrive\/fares/);
  assert.match(home, /autocompletePlaces/);
  assert.doesNotMatch(home, /getIndriveSuggestions/);
  assert.doesNotMatch(home, /indrive-mock/);
  assert.match(home, /controller\.signal/);
});

test("mobile sends latitude and longitude when available", () => {
  const maps = fs.readFileSync(path.join(root, "src/services/maps.service.js"), "utf8");
  assert.match(maps, /params\.latitude = coordinates\.lat/);
  assert.match(maps, /params\.longitude = coordinates\.lng/);
});
