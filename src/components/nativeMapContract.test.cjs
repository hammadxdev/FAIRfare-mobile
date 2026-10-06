const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const config = fs.readFileSync(path.join(root, "app.config.js"), "utf8");
const map = fs.readFileSync(path.join(root, "src/components/MapPreview.native.js"), "utf8");

test("native map config uses the react-native-maps Android key plugin", () => {
  assert.match(config, /\[\s*"react-native-maps"/);
  assert.match(config, /androidGoogleMapsApiKey: process\.env\.GOOGLE_MAPS_ANDROID_API_KEY/);
});

test("native map preserves coordinate, marker, and route inputs", () => {
  assert.match(map, /initialRegion=\{region\}/);
  assert.match(map, /coordinate=\{\{ latitude: pickup\.lat, longitude: pickup\.lng \}\}/);
  assert.match(map, /coordinate=\{\{ latitude: dropoff\.lat, longitude: dropoff\.lng \}\}/);
  assert.match(map, /routeCoordinates\.length > 1/);
});
