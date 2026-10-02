const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const overlaySource = fs.readFileSync(path.join(__dirname, "LoadingOverlay.js"), "utf8");
const homeSource = fs.readFileSync(path.join(__dirname, "../screens/HomeScreen.js"), "utf8");

test("comparison pending state keeps the dedicated compact loading treatment", () => {
  assert.match(overlaySource, /Comparing fares/);
  assert.match(overlaySource, /Finding the fairest price/);
  assert.match(overlaySource, /ActivityIndicator/);
  assert.match(overlaySource, /accessibilityLabel="Comparing fares"/);
  assert.doesNotMatch(overlaySource, /FareResultsSkeleton|SkeletonCard|ScrollView/);
  assert.match(homeSource, /<LoadingOverlay visible=\{loading\}\s*\/>/);
});

test("comparison resolution removes loading and navigates with real results", () => {
  assert.match(homeSource, /navigation\.navigate\("Results", \{ result: response\.data \}\)/);
  assert.match(homeSource, /finally \{\s*setLoading\(false\);\s*\}/);
});

test("comparison error path remains unchanged", () => {
  assert.match(homeSource, /setErrorMessage\(/);
  assert.match(homeSource, /Unable to compare fares/);
  assert.match(homeSource, /ENABLE_MOCK_FALLBACK/);
});
