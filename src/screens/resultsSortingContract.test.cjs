const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const screen = fs.readFileSync(path.join(__dirname, "ResultsScreen.js"), "utf8");
const { SORT_OPTIONS, sortOptionsWithinCategories, INDRIVE_SUGGESTED_FARE_LABEL, fareSourceLabel } = require("../utils/comparisonResults.cjs");
const { filterOptions } = require("../utils/fareComparison.cjs");
test("Results retains category chips and exposes only the supported price sort", () => {
  assert.match(screen, /\.\.\.categories\.map\(/);
  assert.match(screen, /\.\.\.serviceCategories/);
  assert.match(screen, /\.\.\.featureFilters\.map\(/);
  assert.match(screen, /\.\.\.tierFilters\.map\(/);
  assert.match(screen, /SORT_OPTIONS/);
  assert.deepEqual(SORT_OPTIONS.map(({ label }) => label), ["Lowest Price", "Nearest"]);
  assert.match(screen, /selectedCategory/);
  assert.match(screen, /sortOptionsWithinCategories/);
  assert.match(screen, /AVAILABLE_SORT_OPTIONS = SORT_OPTIONS\.filter\(\(item\) => item\.value === "price"\)/);
});
test("switching a category keeps the selected sort and handoff still opens the selected provider", () => {
  assert.match(screen, /const \[sortMode, setSortMode\] = useState\("price"\)/);
  assert.match(screen, /onPress=\{\(\) => \{ setSelectedCategory\(category\); setSelectedOption\(null\); \}\}/);
  assert.match(screen, /onPress=\{\(\) => \{ setSortMode\(item\.value\); setSortMenuOpen\(false\); \}\}/);
  assert.match(screen, /const openOption = \(option\) => openProvider\(option\?\.providerId \|\| option\?\.providerName \|\| "", \{ \.\.\.\(comparisonRoute \|\| \{\}\), comparisonId:/);
  assert.match(screen, /onPress=\{\(\) => openOption\(actionOption\)\}/);
  assert.match(screen, /const actionOption = filtered\.find[\s\S]*?\|\| filtered\[0\]/);
});
test("visible fare rows render the category-filtered and selected-sort order", () => {
  assert.match(screen, /const filtered = sortOptionsWithinCategories\(categoryOptions, sortMode, null\)/);
  assert.match(screen, /filtered\.map\(\(option\) => \(/);
  const options = [
    { providerId: "yango", category: "bike", fare: 350, currency: "PKR", isAvailable: true },
    { providerId: "bykea", category: "bike", fare: 250, currency: "PKR", isAvailable: true },
    { providerId: "indrive", category: "car", fare: 1000, currency: "PKR", isAvailable: true },
    { providerId: "other-car", category: "car", fare: 900, currency: "PKR", isAvailable: true },
    { providerId: "rickshaw-low", category: "rickshaw", fare: 100, currency: "PKR", isAvailable: true },
    { providerId: "rickshaw-high", category: "rickshaw", fare: 160, currency: "PKR", isAvailable: true },
  ];
  assert.deepEqual(sortOptionsWithinCategories(filterOptions(options, "bike"), "price").map((item) => item.providerId), ["bykea", "yango"]);
  assert.deepEqual(sortOptionsWithinCategories(filterOptions(options, "car"), "price").map((item) => item.providerId), ["other-car", "indrive"]);
  assert.deepEqual(sortOptionsWithinCategories(filterOptions(options, "rickshaw"), "price").map((item) => item.providerId), ["rickshaw-low", "rickshaw-high"]);
});
test("every inDrive result row renders the mandatory suggested-fare notice", () => {
  assert.match(screen, /INDRIVE_SUGGESTED_FARE_LABEL/);
  assert.match(screen, /option\.providerId === "indrive"/);
  const { INDRIVE_SUGGESTED_FARE_LABEL } = require("../utils/comparisonResults.cjs");
  assert.equal(INDRIVE_SUGGESTED_FARE_LABEL, "Suggested fare — not an offer from an inDrive driver.");
});
test("Results hides nearby diagnostics and has no nearby subscriptions", () => {
  const fareRows = screen.slice(screen.indexOf("{filtered.map"), screen.indexOf("{statuses.length"));
  assert.doesNotMatch(screen, /Nearby pickup observations/);
  assert.doesNotMatch(fareRows, /ETA unavailable|Nearest pickup|pickupEtaLabel|pickupEtaSeconds|nearbySummary|marker distance|freshness|available drivers/i);
  assert.doesNotMatch(screen, /scheduleNearbyFreshnessExpiry|nearbyRequestStore|fetchNearbyDrivers/);
  assert.doesNotMatch(screen, /straight-line|Distance unavailable|Position freshness unavailable|Nearby pickup unavailable|Nearby pickup loading/);
  assert.doesNotMatch(screen, /\$\{evidence\.markerCount\} map markers/);
  assert.doesNotMatch(screen, /driver count|available drivers/i);
  assert.match(screen, /fareSourceLabel\(option\)/);
  assert.match(screen, /option\.providerId === "indrive"[\s\S]*?INDRIVE_SUGGESTED_FARE_LABEL/);
  assert.equal(INDRIVE_SUGGESTED_FARE_LABEL, "Suggested fare — not an offer from an inDrive driver.");
});

test("Results cards show Live Quote only when provider freshness is verifiably current", () => {
  const now = Date.parse("2026-10-23T12:00:00.000Z");
  const current = { source: "LIVE", fare: 200, isAvailable: true, metadata: { providerCreatedAt: new Date(now - 1000).toISOString(), providerTtlSeconds: 60 } };
  assert.equal(fareSourceLabel({ ...current, providerId: "yango" }, now), "Live Quote");
  assert.equal(fareSourceLabel({ ...current, providerId: "bykea" }, now), "Live Quote");
  assert.equal(fareSourceLabel({ ...current, providerId: "indrive", fareType: "RECOMMENDED" }, now), "Live Quote");
  assert.equal(fareSourceLabel({ source: "LIVE", fare: 200, isAvailable: true, providerId: "yango", providerFreshness: "current" }, now), "Live Quote");
  assert.doesNotMatch(fareSourceLabel({ ...current, source: "CACHED", providerId: "yango" }, now), /^Live Quote/);
  assert.doesNotMatch(fareSourceLabel({ ...current, metadata: { providerCreatedAt: new Date(now - 61_000).toISOString(), providerTtlSeconds: 60 }, providerId: "bykea" }, now), /^Live Quote/);
  assert.doesNotMatch(fareSourceLabel({ ...current, metadata: {}, providerId: "yango" }, now), /^Live Quote/);
  assert.doesNotMatch(fareSourceLabel({ ...current, metadata: { providerFreshness: "unknown" }, providerId: "yango" }, now), /^Live Quote/);
  assert.doesNotMatch(fareSourceLabel({ ...current, isAvailable: false, providerId: "yango" }, now), /^Live Quote/);
});

test("Compare calls only the fare endpoint and does not request nearby drivers", () => {
  const home = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");
  assert.match(home, /const response = await compareFares\(payload/);
  assert.doesNotMatch(home, /fetchNearbyDrivers|nearbyRequestStore/);
});

test("ResultsScreen renders a successful comparison response without a missing-hook crash", () => {
  const babel = require("@babel/core");
  const Module = require("node:module");
  const absolutePath = path.join(__dirname, "ResultsScreen.js");
  const transformed = babel.transformSync(screen, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"],
  }).code;
  const createElement = (type, props, ...children) => ({ type, props: { ...props, children } });
  const fakeReact = {
    __esModule: true,
    default: { createElement },
    useEffect() {},
    useMemo: (callback) => callback(),
    useState: (initial) => [initial, () => {}],
  };
  const mocks = {
    react: fakeReact,
    "react-native": { Pressable: "Pressable", RefreshControl: "RefreshControl", ScrollView: "ScrollView", StyleSheet: { create: (styles) => styles }, Text: "Text", View: "View" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "../components/EmptyState": () => null,
    "../components/LoadingOverlay": () => null,
    "../components/AppAlert": () => null,
    "../components/ConfidenceBadge": () => null,
    "../components/SkeletonBlock": { FareResultsSkeleton: () => null },
    "../constants/colors": { __esModule: true, default: { background: "#fff", primary: "#000", muted: "#777" }, radius: {}, spacing: {} },
    "../utils/formatCurrency": { formatPKR: (amount) => "PKR " + amount },
    "../services/providerLauncher": { openProvider() {} },
    "../services/api": { compareFares: async () => ({ data: {} }) },
    "../services/comparisonRouteSnapshot.cjs": { buildComparisonRouteSnapshot: () => ({ pickup: {}, destination: {} }) },
    "../utils/fareComparison.cjs": { flattenFareOptions: () => [], supportedCategories: () => [], supportedServiceCategories: () => [], supportedFeatures: () => [], supportedServiceTiers: () => [], filterOptions: (items) => items, bestComparableIds: () => new Set(), providerStatusRows: () => [] },
    "../utils/comparisonResults.cjs": { SORT_OPTIONS: [{ value: "price", label: "Lowest Price" }], INDRIVE_SUGGESTED_FARE_LABEL: "Suggested fare", sortOptionsWithinCategories: (items) => items, fareSourceLabel: () => "Estimate", scheduleInDriveQuoteExpiry: () => undefined },
  };
  const compiledModule = new Module(absolutePath, module);
  compiledModule.filename = absolutePath;
  compiledModule.paths = module.paths;
  const originalRequire = compiledModule.require.bind(compiledModule);
  compiledModule.require = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : originalRequire(id);
  compiledModule._compile(transformed, absolutePath);

  const result = {
    comparisonId: "comparison-test",
    pickup: { name: "LGU Lahore", lat: 31.4744, lng: 74.4163 },
    dropoff: { name: "Liberty Market Lahore", lat: 31.5124, lng: 74.3421 },
    distanceKm: 6.2,
    durationMin: 12,
    results: [
      { provider: { name: "inDrive" }, quotes: [{ fare: 163, currency: "PKR", vehicleCategory: "bike", categoryName: "Bike", isAvailable: true, metadata: { providerCreatedAt: Date.now(), providerTtlSeconds: 300 } }] },
      { provider: { name: "Yango" }, quotes: [{ fare: 250, currency: "PKR", vehicleCategory: "car", categoryName: "Car", isAvailable: true }] },
      { provider: { name: "Bykea" }, quotes: [{ fare: 180, currency: "PKR", vehicleCategory: "rickshaw", categoryName: "Rickshaw", isAvailable: true }] },
    ],
  };
  assert.doesNotThrow(() => compiledModule.exports.default({
    route: { params: { result } },
    navigation: { goBack() {}, navigate() {} },
  }));
});
