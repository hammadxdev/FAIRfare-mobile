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

test("provider cards distinguish suggested fares from exact live fares", () => {
  assert.match(card, /SUGGESTED PKR/);
  assert.match(card, /hasSuggestedFare/);
});

test("Yango cards keep exact, display, starting, ETA, and availability semantics separate", () => {
  assert.match(card, /displayFare/);
  assert.match(card, /startingFare/);
  assert.match(card, /pickupEtaSeconds/);
  assert.match(card, /isYango/);
  assert.match(card, /isIndrive/);
  assert.match(card, /hasLiveFare && isIndrive/);
});

test("results keep the trip summary vehicle-free and render provider sections", () => {
  assert.doesNotMatch(results, /metaLabel\}>Vehicle/);
  assert.doesNotMatch(results, /vehicleType/);
  assert.match(results, /summaryEyebrow}>TRIP SUMMARY/);
  assert.match(results, /liveInDriveResults\.map/);
  assert.match(results, /Bykea — Live fares unavailable/);
  assert.match(results, /distanceKm/);
  assert.match(results, /durationMin/);
});

test("ResultsScreen uses one provider action below category rows", () => {
  assert.match(results, /Open inDrive/);
  assert.match(results, /Open Yango/);
  assert.equal((results.match(/Open inDrive/g) || []).length, 1);
  assert.equal((results.match(/Open Yango/g) || []).length, 1);
  assert.doesNotMatch(results, /onOpenApp=\{handleOpenApp\}/);
  assert.match(results, /<Text style=\{styles\.sectionTitle\}>inDrive/);
  assert.match(results, /<Text style=\{styles\.sectionTitle\}>Yango/);
  assert.match(results, /Bykea — Live fares unavailable/);
  assert.doesNotMatch(results, /<ScrollView/);
});

test("fare rows support compact rendering without individual provider actions", () => {
  assert.match(card, /compact = false/);
  assert.match(card, /compact && styles.cardCompact/);
  assert.match(card, /compactFareRow/);
  assert.match(card, /Boolean\(onOpenApp\)/);
});
