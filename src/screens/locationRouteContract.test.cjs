const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const home = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");
const location = fs.readFileSync(path.join(__dirname, "../services/location.service.js"), "utf8");
const map = fs.readFileSync(path.join(__dirname, "../components/MapPreview.native.js"), "utf8");
const webMap = fs.readFileSync(path.join(__dirname, "../components/MapPreview.web.js"), "utf8");
const header = fs.readFileSync(path.join(__dirname, "../components/AppHeader.js"), "utf8");
const locationInput = fs.readFileSync(path.join(__dirname, "../components/LocationInput.js"), "utf8");
const tabs = fs.readFileSync(path.join(__dirname, "../navigation/TabNavigator.js"), "utf8");
const savedRoutes = fs.readFileSync(path.join(__dirname, "SavedRoutesScreen.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");

test("foreground GPS is explicit, field-scoped, and manual pickup wins late responses", () => {
  assert.match(location, /permissionPromptedThisSession/);
  assert.match(location, /getForegroundPermissionsAsync/);
  assert.match(home, /pickupManuallySelectedRef/);
  assert.match(home, /if \(field === "pickup" && pickupManuallySelectedRef\.current\) return/);
  assert.match(home, /Use current location for pickup/);
  assert.match(home, /Use current location for destination/);
  assert.match(home, /handleUseCurrentLocation\("pickup"\)/);
  assert.match(home, /handleUseCurrentLocation\("destination"\)/);
  assert.doesNotMatch(home, /useEffect\(\(\) => \{\s*handleUseCurrentLocation\(\)/);
});

test("route preview, stale response guards, caching and fare gating are present", () => {
  assert.match(home, /previewCoordinates/);
  assert.match(map, /hasConfirmedRoadRoute/);
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
  assert.match(webMap, /const hasRoute = Boolean\(routeInfo\?\.geometryAvailable && routePoints\.length > 1\)/);
  assert.match(webMap, /const hasPreview = !hasRoute && previewPoints\.length > 1/);
  assert.match(map, /routeInfo\?\.geometryAvailable === true/);
});

test("web map is interactive and supports direct active-field selection", () => {
  assert.doesNotMatch(webMap, /Web preview only/);
  assert.match(webMap, /tile\.openstreetmap\.org/);
  assert.match(webMap, /onPointerDown/);
  assert.match(webMap, /onPointerMove/);
  assert.match(webMap, /onPointerUp/);
  assert.match(webMap, /onWheel/);
  assert.match(webMap, /onMapPress\(/);
  assert.match(webMap, /SELECTING_MODES = \["pickup", "destination"\]/);
  assert.match(home, /setSelectingMode\(field === "dropoff" \? "destination" : "pickup"\)/);
  assert.match(home, /mapRequestIdRef/);
  assert.match(webMap, /onPointerDown={handlePointerDown}/);
  assert.match(webMap, /onPointerMove={handlePointerMove}/);
  assert.match(webMap, /onWheel={handleWheel}/);
  assert.match(webMap, /touchAction: "none"/);
  assert.match(webMap, /fitKeyRef/);
  assert.match(webMap, /routePoints\.map\(toScreen\)/);
  assert.match(webMap, /function pointFromCoordinate/);
  assert.match(webMap, /home-pickup-marker/);
  assert.match(webMap, /home-dropoff-marker/);
  assert.match(webMap, /const points = \(hasRoute \? \[validPickup, validDropoff, \.\.\.routePoints\]/);
  assert.match(webMap, /Road route unavailable/);
  assert.match(webMap, /zIndex: 20/);
  assert.match(webMap, /fullScreenWrapper:[\s\S]*height: "auto"/);
  assert.match(home, /mapBottomOverlayRatio/);
  assert.match(app, /minHeight: "100%"/);
});

test("Home is a non-scrolling Material 3 overlay layout", () => {
  assert.doesNotMatch(home, /<ScrollView/);
  assert.match(home, /nativeID="home-screen-canvas"/);
  assert.match(home, /nativeID="home-booking-sheet"/);
  assert.match(home, /compact \/>/);
  assert.match(home, /position: "absolute"/);
  assert.match(home, /borderRadius: radius\.lg/);
  assert.match(home, /minHeight: 48/);
  assert.match(header, /compact = false/);
  assert.match(header, /compact && styles\.compactContainer/);
  assert.match(locationInput, /compact = false/);
  assert.match(locationInput, /compact && styles\.compactInput/);
});

test("route diagnostics include request identity and stale completion state", () => {
  assert.match(home, /requestId/);
  assert.match(home, /httpStatus/);
  assert.match(home, /normalizedPointCount/);
  assert.match(home, /blockingReason/);
  assert.match(home, /const stale = cancelled \|\| routeRequestIdRef\.current !== requestId/);
});

test("route completion does not price automatically; Compare Fares is the only trigger", () => {
  const compareCalls = [...home.matchAll(/compareFares\(payload, \{ signal: abortController\.signal \}\)/g)];
  assert.equal(compareCalls.length, 1);
  assert.match(home, /const response = await compareFares\(payload, \{ signal: abortController\.signal \}\)/);
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

test("restored routes clear stale trip state and remain explicitly sourced", () => {
  assert.match(home, /function restoreRoute\(normalized, source\)/);
  assert.match(home, /pickupRef\.current = null;\s*dropoffRef\.current = null;/);
  assert.match(home, /setRouteCoordinates\(\[\]\);\s*setRouteInfo\(null\);/);
  assert.match(home, /restoreRoute\(normalized, "compare-again"\)/);
  assert.match(home, /restoreRoute\(normalized, "saved-route"\)/);
  assert.match(home, /applyPickup\(\{ \.\.\.normalized\.pickup, source \}\)/);
  assert.match(home, /applyDropoff\(\{ \.\.\.normalized\.dropoff, source \}\)/);
});

test("Home development diagnostics identify selected state without coordinates", () => {
  assert.match(home, /\[home-map-state\]/);
  assert.match(home, /pickupFieldHasSelection/);
  assert.match(home, /dropoffFieldHasSelection/);
  assert.match(home, /navigationRestoreActive/);
  assert.match(home, /navigationRestoreSource/);
  assert.match(home, /routeGeometryValid/);
  assert.match(home, /eventSequence/);
  assert.match(home, /if \(!IS_DEVELOPMENT\) return/);
  assert.doesNotMatch(home, /console\.info\(\"\[home-map-state\].*lat/);
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
  assert.match(results, /Compare Fares/);
  assert.match(results, /distanceKm/);
  assert.match(results, /durationMin/);
  assert.doesNotMatch(results, /metaLabel\}>Vehicle/);
  assert.doesNotMatch(results, /vehicleType/);
  assert.equal([...home.matchAll(/compareFares\(payload, \{ signal: abortController\.signal \}\)/g)].length, 1);
  assert.doesNotMatch(savedRoutes, /compareFares\(/);
});
