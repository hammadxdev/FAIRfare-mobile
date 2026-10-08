const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const card = fs.readFileSync(path.join(root, "src/components/ProviderFareCard.js"), "utf8");
const results = fs.readFileSync(path.join(root, "src/screens/ResultsScreen.js"), "utf8");
const history = fs.readFileSync(path.join(root, "src/screens/HistoryDetailScreen.js"), "utf8");

test("provider cards do not present driver pickup ETA or fastest-pickup badge", () => {
  assert.doesNotMatch(card, /min pickup/);
  assert.doesNotMatch(card, /styles\.eta/);
  assert.match(card, /badge !== "Fastest"/);
  assert.match(card, /FareDisclaimer/);
});

test("consumer route travel duration remains visible", () => {
  assert.match(results, /metaLabel\}>Duration/);
  assert.match(results, /durationMin/);
  assert.match(history, /Duration unavailable/);
  assert.match(history, /durationSeconds/);
});

test("provider fare values remain rendered", () => {
  assert.match(card, /formatPKR\(fare\)/);
  assert.match(card, /formatApproxPKR\(prediction\.predictedFare\)/);
});
