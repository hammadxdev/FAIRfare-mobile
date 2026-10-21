const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");

test("fare comparison no longer uses an artificial delay", () => {
  assert.doesNotMatch(source, /getRandomLoadingDelay|MIN_COMPARE_LOADING_MS|MAX_COMPARE_LOADING_MS/);
  assert.match(source, /const response = await compareFares\(payload, \{ signal: abortController\.signal \}\)/);
});
