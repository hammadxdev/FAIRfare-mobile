const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
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

test("consumer pickup wording does not claim live driver timing", () => {
  const ai = read("src/screens/AIChatScreen.js");
  const emptyState = read("src/components/ai/AIEmptyState.js");
  const settings = read("src/screens/PreferenceEditorScreen.js");
  const settingsRoot = read("src/screens/SettingsRootScreen.js");
  const support = read("src/screens/SupportScreens.js");
  assert.doesNotMatch(ai, /Which pickup is fastest/i);
  assert.doesNotMatch(emptyState, /pickup times/i);
  assert.match(settings, /UNVERIFIED/);
  assert.match(settings, /simulated pickup estimate/i);
  assert.match(settingsRoot, /simulated pickup estimate \(unverified\)/i);
  assert.match(support, /does not currently have live driver pickup times/i);
});

test("provider fare values remain rendered", () => {
  assert.match(card, /formatPKR\(fare\)/);
  assert.match(card, /formatApproxPKR\(prediction\.predictedFare\)/);
});
