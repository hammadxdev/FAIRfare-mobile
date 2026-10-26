const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const home = fs.readFileSync(path.join(root, "src/screens/HomeScreen.js"), "utf8");
const overlay = fs.readFileSync(path.join(root, "src/components/SuggestionsOverlay.js"), "utf8");

test("autocomplete remains visible for meaningful queries and exposes provider states", () => {
  assert.match(home, /MIN_AUTOCOMPLETE_LENGTH = 3/);
  assert.match(home, /shouldShowSuggestions = Boolean\(activeField\)/);
  assert.match(overlay, /Searching locations/);
  assert.match(overlay, /Updating results/);
  assert.match(home, /No locations found/);
  assert.match(home, /Unable to load location suggestions/);
});

test("suggestions remain above the keyboard and preserve tap handling", () => {
  assert.doesNotMatch(overlay, /<Modal/);
  assert.match(overlay, /keyboardShouldPersistTaps="always"/);
  assert.match(overlay, /keyboardDismissMode="none"/);
  assert.match(overlay, /maxHeight:/);
  assert.match(overlay, /const showSuggestions = suggestions\.length > 0/);
  assert.match(overlay, /onRetry/);
});

test("GPS selection retains raw coordinates and reported accuracy", () => {
  assert.match(home, /deviceLocationRef\.current = \{ lat: location\.lat, lng: location\.lng, accuracy: location\.accuracy, timestamp: location\.timestamp \}/);
  assert.match(home, /accuracy: location\.accuracy/);
  assert.match(home, /timestamp: location\.timestamp/);
});
