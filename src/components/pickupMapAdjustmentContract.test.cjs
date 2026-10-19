const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const path = require("node:path");
const home = fs.readFileSync(path.join(__dirname, "../screens/HomeScreen.js"), "utf8");
const adjuster = fs.readFileSync(path.join(__dirname, "PickupMapAdjuster.native.js"), "utf8");

test("pickup adjustment has explicit cancel and confirm actions", () => {
  assert.match(home, /<PickupMapAdjuster/);
  assert.match(home, /onCancel=\{\(\) => setAdjustPickupVisible\(false\)\}/);
  assert.match(home, /onConfirm=\{handleConfirmAdjustedPickup\}/);
  assert.match(home, /applyPickup\(location\);/);
  assert.match(adjuster, />Cancel<\/Text>/);
  assert.match(adjuster, />Confirm pickup<\/Text>/);
  assert.match(adjuster, /onConfirm\(preview\)/);
});

test("map adjustment preserves the selected center coordinates", () => {
  assert.match(adjuster, /lat, lng, source: "map-adjustment"/);
  assert.match(home, /Number\.isFinite\(location\.lat\).*Number\.isFinite\(location\.lng\)/s);
});

test("destination adjustment is a separate typed mode and preserves pickup", () => {
  const map = fs.readFileSync(path.join(__dirname, "MapPreview.native.js"), "utf8");
  assert.match(map, /SELECTING_MODES = \["pickup", "destination"\]/);
  assert.match(map, /onAdjustLocation\(selectingMode\)/);
  assert.match(home, /if \(adjustMode === "destination"\) applyDropoff\(location\)/);
  assert.match(home, /initialLocation=\{adjustMode === "destination" \? dropoff : pickup\}/);
  assert.match(adjuster, /Confirm destination/);
});
