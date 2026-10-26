const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");
const locationService = fs.readFileSync(path.join(__dirname, "../services/location.service.js"), "utf8");

test("GPS handler updates only the explicitly requested field and retains real coordinates", () => {
  const handler = source.slice(source.indexOf("const handleUseCurrentLocation"), source.indexOf("// Tapping the map"));
  assert.match(handler, /field === "destination" \? applyDropoff : applyPickup/);
  assert.match(handler, /lat: location\.lat/);
  assert.match(handler, /lng: location\.lng/);
});

test("field-specific suggestion handlers remain independent", () => {
  assert.match(source, /const handleSelectPickup = createSelectHandler\(\{ sessionTokenRef: pickupSessionTokenRef, apply: applyPickup, selectionRef: pickupSelectionRef \}\)/);
  assert.match(source, /const handleSelectDropoff = createSelectHandler\(\{ sessionTokenRef: dropoffSessionTokenRef, apply: applyDropoff, selectionRef: dropoffSelectionRef \}\)/);
  assert.match(source, /const selectedLocation = field === "pickup" \? pickupRef\.current : dropoffRef\.current/);
});

test("current location control is explicitly pickup-only", () => {
  assert.match(source, /accessibilityLabel="Use current location for pickup"/);
  assert.doesNotMatch(source, /currentLocationButton/);
});

test("Home requests GPS once on entry and a user-edited pickup wins over a late fix", () => {
  assert.match(source, /initialPickupLocationRequestedRef = useRef\(false\)/);
  assert.match(source, /void handleUseCurrentLocation\("pickup"\)/);
  assert.match(source, /if \(route\?\.params\?\.savedRoute \|\| route\?\.params\?\.compareAgain\) return/);
  assert.match(source, /pickupManuallySelectedRef\.current = true/);
  assert.match(source, /if \(field === "pickup" && pickupManuallySelectedRef\.current\) return/);
  assert.match(locationService, /Location\.hasServicesEnabledAsync\(\)/);
  assert.match(locationService, /LOCATION_SERVICES_DISABLED/);
});

test("GPS failure paths preserve explicit permission, timeout, and accuracy handling", () => {
  assert.match(locationService, /requestForegroundPermissionsAsync/);
  assert.match(locationService, /Location permission was denied/);
  assert.match(locationService, /Location request timed out/);
  assert.match(locationService, /coords\.accuracy/);
  assert.match(source, /Unable to resolve your current location/);
});

test("route uses retained coordinates rather than parsing the address", () => {
  assert.match(source, /computeRoute\(\s*\{ lat: pickup\.lat, lng: pickup\.lng \}/);
  assert.match(source, /\{ lat: dropoff\.lat, lng: dropoff\.lng \}/);
  assert.doesNotMatch(source, /parse.*address/i);
});
