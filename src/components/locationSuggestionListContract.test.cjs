const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(require.resolve("./LocationSuggestionList.js"), "utf8");

test("suggestion rows tolerate missing and duplicate identifiers", () => {
  assert.match(source, /Array\.isArray\(suggestions\)/);
  assert.match(source, /suggestions\.filter\(Boolean\)/);
  assert.match(source, /item\?\.id \|\| item\?\.placeId/);
  assert.match(source, /usedKeys/);
  assert.match(source, /item\.name \|\| item\.description \|\| "Unnamed location"/);
});

test("suggestion rows preserve match labels and nullable metadata handling", () => {
  assert.match(source, /Best match/);
  assert.match(source, /Related match/);
  assert.match(source, /Partial match/);
  assert.match(source, /getLocationSecondaryText\(item\) \|\| item\.address/);
  assert.match(source, /filter\(Boolean\)/);
});
