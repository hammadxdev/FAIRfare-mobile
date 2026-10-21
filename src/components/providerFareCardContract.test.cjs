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
  assert.match(results, /durationMin/);
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

test("results keep the trip summary vehicle-free and render a unified comparison", () => {
  assert.doesNotMatch(results, /metaLabel\}>Vehicle/);
  assert.doesNotMatch(results, /vehicleType/);
  assert.match(results, /Compare Fares/);
  assert.match(results, /flattenFareOptions/);
  assert.match(results, /Unavailable providers/);
  assert.match(results, /distanceKm/);
  assert.match(results, /durationMin/);
});

test("ResultsScreen uses compact filters, one results scroll area, and row actions", () => {
  assert.match(results, /Open inDrive/);
  assert.match(results, /Open Yango/);
  assert.match(results, /selectedCategory/);
  assert.match(results, /filterOptions/);
  assert.match(results, /supportedFeatures/);
  assert.match(results, /supportedServiceTiers/);
  assert.match(results, /<ScrollView/);
  assert.match(results, /minHeight: 72/);
  assert.match(results, /selectedOption/);
  assert.match(results, /Select a ride/);
  assert.doesNotMatch(results, /onOpenApp=\{handleOpenApp\}/);
});

test("ResultsScreen bounds filter chips and uses a single app header", () => {
  const navigator = read("src/navigation/RootNavigator.js");
  assert.match(results, /chipScroller: \{ flexGrow: 0/);
  assert.match(results, /chips: \{ flexGrow: 0, alignItems: "center", height: 48/);
  assert.match(results, /chip: \{ height: 40/);
  assert.match(navigator, /name="Results"[\s\S]*?headerShown: false/);
  assert.equal((results.match(/<Text style=\{styles\.title\}>/g) || []).length, 1);
});

test("fare rows support compact rendering without individual provider actions", () => {
  assert.match(card, /compact = false/);
  assert.match(card, /compact && styles.cardCompact/);
  assert.match(card, /compactFareRow/);
  assert.match(card, /Boolean\(onOpenApp\)/);
});
