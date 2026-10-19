const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const homeSource = fs.readFileSync(require.resolve("./HomeScreen.js"), "utf8");
const formatting = require("../utils/locationFormatting.cjs");

test("autocomplete imports the shared normalization helper it calls", () => {
  assert.equal(typeof formatting.normalizeSearchText, "function");
  assert.match(homeSource, /import\s*\{[^}]*normalizeSearchText[^}]*\}\s*from\s*["']\.\.\/utils\/locationFormatting\.cjs["']/s);
  assert.doesNotMatch(homeSource, /function\s+normalizeSearchText\s*\(/);
});

test("autocomplete maps the backend success/data response into ranked suggestions", () => {
  assert.match(homeSource, /\(res\.data\s*\|\|\s*\[\]\)\.map\(toSuggestion\)/);
  assert.match(homeSource, /mainText\s*\|\|\s*prediction\.name\s*\|\|\s*prediction\.description/);
  assert.match(homeSource, /prediction\.address\s*\|\|\s*prediction\.description\s*\|\|\s*prediction\.secondaryText/);
  assert.match(homeSource, /lat:\s*prediction\.lat/);
  assert.match(homeSource, /lng:\s*prediction\.lng/);
});

test("a superseded autocomplete response cannot overwrite a newer success or error state", () => {
  assert.match(homeSource, /requestIdRef\.current\s*!==\s*requestId/);
  assert.match(homeSource, /abortRef\.current\?\.abort\(\)/);
  assert.match(homeSource, /controller\.signal/);
  assert.match(homeSource, /pickupRef\.current/);
  assert.match(homeSource, /filterRelevantSuggestions/);
  assert.match(homeSource, /selectionRef\.current !== selectionId/);
  assert.match(homeSource, /setStatusType\("empty"\)/);
  assert.match(homeSource, /setStatusType\("error"\)/);
});

test("each changed query after the minimum length reaches the debounced runner", () => {
  assert.match(homeSource, /if\s*\(text\.trim\(\)\.length\s*<\s*MIN_AUTOCOMPLETE_LENGTH\)/);
  assert.match(homeSource, /setPickupLoading\(true\);\s*runPickupSearch\(text\);/s);
  assert.match(homeSource, /setDropoffLoading\(true\);\s*runDropoffSearch\(text\);/s);
  assert.doesNotMatch(homeSource, /text\.trim\(\)\.split\(.*\)\.length/);
});
