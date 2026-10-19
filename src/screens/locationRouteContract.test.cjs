const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const home = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");
const location = fs.readFileSync(path.join(__dirname, "../services/location.service.js"), "utf8");
const map = fs.readFileSync(path.join(__dirname, "../components/MapPreview.native.js"), "utf8");
const webMap = fs.readFileSync(path.join(__dirname, "../components/MapPreview.web.js"), "utf8");
const tabs = fs.readFileSync(path.join(__dirname, "../navigation/TabNavigator.js"), "utf8");
const savedRoutes = fs.readFileSync(path.join(__dirname, "SavedRoutesScreen.js"), "utf8");

test("foreground GPS is requested once and manual pickup wins late responses", () => {
  assert.match(location, /permissionPromptedThisSession/);
  assert.match(location, /getForegroundPermissionsAsync/);
  assert.match(home, /pickupManuallySelectedRef/);
  assert.match(home, /if \(pickupManuallySelectedRef\.current && !allowOverride\) return/);
});

test("route preview, stale response guards, caching and fare gating are present", () => {
  assert.match(home, /previewCoordinates/);
  assert.match(map, /lineDashPattern=\{\[8, 8\]\}/);
  assert.match(home, /routeRequestIdRef/);
  assert.match(home, /routeCacheRef/);
  assert.match(home, /hasConfirmedRoadRoute/);
  assert.match(home, /routeGeometryDiagnostics/);
});

test("valid road geometry, not the web map renderer, controls fare eligibility", () => {
  assert.match(home, /routeInfo\?\.geometryAvailable/);
  assert.match(home, /Number\.isFinite\(routeInfo\.distanceKm\)/);
  assert.match(home, /Number\.isFinite\(routeInfo\.durationMin\)/);
  assert.match(home, /const canCompare = canCompareFares\(\{ pickup, dropoff, vehicleType \}\) && routeReady/);
  assert.match(home, /const compareButtonDisabled = !canCompare \|\| loading/);
  assert.match(home, /compareButtonDisabled/);
  assert.match(home, /disableReason/);
  assert.doesNotMatch(home, /AMBIGUOUS_CITY_IDENTITY/);
  assert.match(home, /const DEFAULT_PRICING_VEHICLE_TYPE = "car"/);
  assert.doesNotMatch(home, /autoPricedRouteRef/);
  assert.match(home, /title="Compare Fares"/);
  assert.match(home, /onPress=\{handleCompare\}/);
  assert.match(home, /useEffect\(\(\) => \{/);
  assert.doesNotMatch(home, /<VehicleSelector/);
  assert.doesNotMatch(home, /\}, \[pickup, dropoff, vehicleType\]\)/);
  assert.match(webMap, /const hasRoute = Boolean\(routeInfo\?\.geometryAvailable && routeCoordinates\.length > 1\)/);
  assert.match(webMap, /const hasPreview = !hasRoute && previewCoordinates\.length > 1/);
});

test("route diagnostics include request identity and stale completion state", () => {
  assert.match(home, /requestId/);
  assert.match(home, /httpStatus/);
  assert.match(home, /normalizedPointCount/);
  assert.match(home, /blockingReason/);
  assert.match(home, /const stale = cancelled \|\| routeRequestIdRef\.current !== requestId/);
});

test("route completion does not price automatically; Compare Fares is the only trigger", () => {
  const compareCalls = [...home.matchAll(/compareFares\(payload\)/g)];
  assert.equal(compareCalls.length, 1);
  assert.match(home, /const response = await compareFares\(payload\)/);
  assert.match(home, /title="Compare Fares"[\s\S]*onPress=\{handleCompare\}/);
  assert.doesNotMatch(home, /autoPricedRouteRef|handleCompare\(\);/);
});

test("Home uses the map-first panel layout without Home saved-route fetching", () => {
  assert.match(home, /<MapPreview\s+fullScreen/);
  assert.match(home, /bottomPanel/);
  assert.doesNotMatch(home, /getSavedRoutes|SavedRoutesSkeleton|Saved Trips/);
  assert.match(home, /accessibilityLabel=\{savedRouteKey === currentRouteKey \? "Route saved" : "Save route"\}/);
  assert.match(home, /onPress=\{handleSaveRoute\}/);
  assert.match(home, /disabled=\{!canSaveRoute \|\| savedRouteKey === currentRouteKey\}/);
  assert.match(home, /useSafeAreaInsets/);
});

test("Home keeps authenticated autocomplete, selected coordinates, route metrics and FairFare styling", () => {
  assert.match(home, /SuggestionsOverlay/);
  assert.match(home, /onSelect=\{handleOverlaySelect\}/);
  assert.match(home, /lat: pickup\.lat, lng: pickup\.lng/);
  assert.match(home, /lat: dropoff\.lat, lng: dropoff\.lng/);
  assert.match(home, /distanceKm: routeInfo\.distanceKm, durationMin: routeInfo\.durationMin/);
  assert.match(home, /colors\.accent/);
  assert.match(home, /colors\.background/);
});

test("Saved tab reuses the existing saved-route screen and restores trips without pricing", () => {
  assert.match(tabs, /<Tab\.Screen name="Saved" component=\{SavedRoutesScreen\}/);
  assert.match(tabs, /Saved: "🔖"/);
  assert.match(savedRoutes, /getSavedRoutes/);
  assert.match(savedRoutes, /deleteSavedRoute/);
  assert.match(savedRoutes, /savedRoute: item/);
  assert.doesNotMatch(savedRoutes, /compareFares|compareFares\(/);
});

test("Results summary remains route-only and Home does not auto-price or price saved routes", () => {
  const results = fs.readFileSync(path.join(__dirname, "ResultsScreen.js"), "utf8");
  assert.match(results, /summaryEyebrow}>TRIP SUMMARY/);
  assert.doesNotMatch(results, /metaLabel\}>Vehicle/);
  assert.doesNotMatch(results, /vehicleType/);
  assert.doesNotMatch(results, /fare\}/);
  assert.equal([...home.matchAll(/compareFares\(payload\)/g)].length, 1);
  assert.doesNotMatch(savedRoutes, /compareFares\(/);
});
