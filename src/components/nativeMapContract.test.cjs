const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const config = fs.readFileSync(path.join(root, "app.config.js"), "utf8");
const map = fs.readFileSync(path.join(root, "src/components/MapPreview.native.js"), "utf8");
const html = fs.readFileSync(path.join(root, "src/components/nativeMapWebViewHtml.cjs"), "utf8");
const home = fs.readFileSync(path.join(root, "src/screens/HomeScreen.js"), "utf8");
const renderedHtml = require(path.join(root, "src/components/nativeMapWebViewHtml.cjs")).buildNativeMapHtml();

test("native Android map uses Google Maps without exposing its key", () => {
  assert.match(config, /react-native-maps/);
  assert.match(config, /GOOGLE_MAPS_ANDROID_API_KEY/);
  assert.match(config, /androidGoogleMapsApiKey/);
  assert.match(map, /react-native-maps/);
  assert.match(map, /PROVIDER_GOOGLE/);
  assert.doesNotMatch(map, /EXPO_PUBLIC_CARTO_API_KEY|buildNativeMapHtml|react-native-webview/);
});

test("native map preserves coordinate, marker, route, and overlay state inputs", () => {
  assert.match(map, /function point\(value\)/);
  assert.match(map, /hasConfirmedRoadRoute/);
  assert.match(map, /Polyline/);
  assert.match(map, /fitToCoordinates/);
  assert.match(map, /onMapPress\(\{ lat: latitude, lng: longitude \}\)/);
  assert.match(map, /fullScreenWrapper/);
  assert.match(map, /Marker/);
  assert.match(map, /accessibilityRole="button"/);
});

test("native map is no longer coupled to the Leaflet WebView", () => {
  assert.doesNotMatch(map, /WebView|MAP_PROTOCOL_VERSION|buildNativeMapHtml/);
  assert.match(map, /onMapReady/);
  assert.match(map, /onRegionChangeComplete/);
  assert.match(map, /onPress=\{handleMapPress\}/);
});

test("web renderer remains available for web and rollback", () => {
  assert.match(fs.readFileSync(path.join(root, "src/components/MapPreview.web.js"), "utf8"), /export default function MapPreview/);
  assert.match(html, /buildNativeMapHtml/);
});

test("native map has a regional default and controlled camera fitting", () => {
  assert.match(map, /initialRegion=\{DEFAULT_REGION\}/);
  assert.match(map, /animateCamera\(\{ center: routeFitPoints\[0\], zoom: 14 \}/);
  assert.match(map, /fitToCoordinates\(routeFitPoints/);
  assert.match(map, /edgePadding/);
});

test("empty and selected marker states are explicit", () => {
  assert.match(map, /validPickup = useMemo/);
  assert.match(map, /validDropoff = useMemo/);
  assert.match(map, /\{validPickup && <Marker/);
  assert.match(map, /\{validDropoff && <Marker/);
});

test("manual camera exploration and recenter are explicit", () => {
  assert.match(map, /manualCameraDirtyRef/);
  assert.match(map, /lastTripKeyRef\.current === tripKey/);
  assert.match(map, /lastFitKeyRef\.current = null/);
  assert.match(map, /accessibilityLabel="Recenter map"/);
});

test("Google Maps configuration is not logged or hardcoded in native JS", () => {
  assert.doesNotMatch(map, /GOOGLE_MAPS_ANDROID_API_KEY|AIza/);
  assert.match(config, /process\.env\.GOOGLE_MAPS_ANDROID_API_KEY/);
});

test.skip("legacy WebView diagnostics are retained only for rollback", () => {
  assert.match(map, /useSafeAreaInsets/);
  assert.match(map, /top: Math\.max\(44, insets\.top \+ 8\)/);
  assert.match(map, /style=\{styles\.diagnosticsScroll\}/);
  assert.match(map, /contentContainerStyle=\{styles\.diagnosticsContent\}/);
  assert.match(map, /diagnosticsPanel: \{[^}]*height: \"64%\"/);
  assert.match(map, /diagnosticsPanel: \{[^}]*maxHeight: \"72%\"/);
  assert.match(map, /diagnosticsScroll: \{ flex: 1 \}/);
  assert.match(map, /__DEV__ && diagnosticsVisible && <Modal/);
});

test.skip("legacy WebView full-screen diagnostics are retained only for rollback", () => {
  assert.match(map, /fullScreenWrapper: \{[^}]*width: "100%"/);
  assert.match(map, /fullScreenWrapper: \{[^}]*height: "100%"/);
  assert.match(map, /fullScreenWrapper: \{[^}]*minHeight: 0/);
  assert.match(map, /if \(width <= 0 \|\| height <= 0\) return/);
  assert.match(map, /__fareRideInvalidateSize/);
  assert.match(html, /window\.__fareRideInvalidateSize=function\(\)/);
  assert.match(html, /map\.invalidateSize\(\{pan:false,animate:false\}\)/);
});

test.skip("legacy WebView marker contract is retained only for rollback", () => {
  assert.match(html, /pickupMarker=setMarker\(pickupMarker,state\.pickup/);
  assert.match(html, /dropoffMarker=setMarker\(dropoffMarker,state\.dropoff/);
  assert.doesNotMatch(html, /dropoffMarker=setMarker\(dropoffMarker,state\.preview/);
  assert.match(html, /if\(current\) map\.removeLayer\(current\)/);
  assert.match(html, /var p=point\(value\); return p\?L\.marker/);
  assert.match(home, /dropoffRef\.current = null;\s*setDropoff\(null\);/);
});

test.skip("legacy WebView runtime diagnostics are retained only for rollback", () => {
  assert.match(map, /\[native-map-bridge\] outgoing/);
  assert.match(map, /pickupValid/);
  assert.match(map, /dropoffValid/);
  assert.match(map, /bridgeRevision/);
  assert.match(map, /message\.type === "runtime"/);
  assert.match(html, /event:"accepted-state"/);
  assert.match(html, /event:"dropped-stale-state"/);
  assert.match(html, /pickupMarkerCount/);
  assert.match(html, /dropoffMarkerCount/);
  assert.match(html, /routeLayerCount/);
  assert.match(html, /cameraFitIncludesDropoff/);
  assert.match(html, /currentZoom/);
});

test.skip("legacy WebView camera contract is retained only for rollback", () => {
  assert.match(html, /lastFitKey=null, lastTripKey=null, manualCameraDirty=false/);
  assert.match(html, /if\(!force&&manualCameraDirty&&lastTripKey===tripKey\)return/);
  assert.match(html, /map\.on\("dragstart zoomstart"/);
  assert.match(html, /manualCameraDirty=true/);
  assert.match(html, /type===\"recenter\"/);
  assert.match(html, /manualCameraDirty=false;lastFitKey=null/);
  assert.match(map, /accessibilityLabel="Recenter map"/);
});

test.skip("legacy CARTO tile contract is retained only for rollback", () => {
  const mapModule = require(path.join(root, "src/components/nativeMapWebViewHtml.cjs"));
  assert.match(html, /const MAP_TILE_URL = "https:\/\/basemaps\.cartocdn\.com\/rastertiles\/voyager\/\{z\}\/\{x\}\/\{y\}\.png"/);
  assert.match(html, /const MAP_ATTRIBUTION = "© OpenStreetMap contributors © CARTO"/);
  assert.match(html, /tileUrl = MAP_TILE_URL, attribution = MAP_ATTRIBUTION/);
  assert.match(html, /var TILE_URL=\$\{JSON\.stringify\(tileUrl\)\}/);
  assert.match(html, /attribution:ATTRIBUTION/);
  assert.match(map, /tileUrl: buildCartoRasterTileUrl\(CARTO_API_KEY\), attribution: MAP_ATTRIBUTION/);
  assert.match(map, /EXPO_PUBLIC_CARTO_API_KEY/);
  const configuredUrl = mapModule.buildCartoRasterTileUrl("dummy+key value");
  assert.equal(configuredUrl, "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=dummy%2Bkey%20value");
  const configuredHtml = mapModule.buildNativeMapHtml({
    tileUrl: configuredUrl,
    attribution: mapModule.MAP_ATTRIBUTION,
  });
  assert.match(configuredHtml, /basemaps\.cartocdn\.com\/rastertiles\/voyager\/\{z\}\/\{x\}\/\{y\}\.png\?key=dummy%2Bkey%20value/);
  assert.doesNotMatch(configuredHtml, /dummy\+key value/);
});

test.skip("legacy CARTO configuration contract is retained only for rollback", () => {
  const mapModule = require(path.join(root, "src/components/nativeMapWebViewHtml.cjs"));
  assert.equal(mapModule.buildCartoRasterTileUrl(""), null);
  const missingKeyHtml = mapModule.buildNativeMapHtml({ tileUrl: null, attribution: mapModule.MAP_ATTRIBUTION });
  assert.match(missingKeyHtml, /var TILE_URL=null/);
  assert.match(missingKeyHtml, /map-config-missing/);
  assert.match(missingKeyHtml, /carto-api-key-missing/);
});
