const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildComparisonRouteSnapshot, sameComparisonRoute } = require("./comparisonRouteSnapshot.cjs");

test("uses the successful comparison response as the immutable provider route", () => {
  const snapshot = buildComparisonRouteSnapshot({
    comparisonId: "comparison-1",
    pickup: { name: "Pickup", lat: "12.3456789", lng: "45.6789012" },
    dropoff: { name: "Dropoff", lat: "13.4567890", lng: "46.7890123" },
  });
  assert.deepEqual(snapshot.pickup, { lat: 12.3456789, lng: 45.6789012 });
  assert.deepEqual(snapshot.destination, { lat: 13.456789, lng: 46.7890123 });
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.pickup), true);
});

test("does not swap pickup and destination", () => {
  const snapshot = buildComparisonRouteSnapshot({
    pickup: { lat: 10, lng: 20 },
    dropoff: { lat: 30, lng: 40 },
  });
  assert.equal(snapshot.pickup.lat, 10);
  assert.equal(snapshot.pickup.lng, 20);
  assert.equal(snapshot.destination.lat, 30);
  assert.equal(snapshot.destination.lng, 40);
});

test("rejects missing, invalid, identical, or stale changed routes", () => {
  assert.equal(buildComparisonRouteSnapshot({ pickup: { lat: 1, lng: 2 } }), null);
  assert.equal(buildComparisonRouteSnapshot({ pickup: { lat: 91, lng: 2 }, dropoff: { lat: 3, lng: 4 } }), null);
  assert.equal(buildComparisonRouteSnapshot({ pickup: { lat: 1, lng: 2 }, dropoff: { lat: 1, lng: 2 } }), null);
  const first = buildComparisonRouteSnapshot({ pickup: { lat: 1, lng: 2 }, dropoff: { lat: 3, lng: 4 } });
  const changed = buildComparisonRouteSnapshot({ pickup: { lat: 1, lng: 2 }, dropoff: { lat: 3, lng: 5 } });
  assert.equal(sameComparisonRoute(first, first), true);
  assert.equal(sameComparisonRoute(first, changed), false);
});

test("provider opening reads the comparison snapshot instead of device GPS", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/ResultsScreen.js"), "utf8");
  assert.match(source, /buildComparisonRouteSnapshot\(result\)/);
  assert.match(source, /openProvider\(providerId, comparisonRoute \|\| \{\}\)/);
  assert.doesNotMatch(source, /deviceLocation/);
});

test("keeps exactly one provider-level Open button per provider", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/ResultsScreen.js"), "utf8");
  assert.equal((source.match(/Open inDrive/g) || []).length, 1);
  assert.equal((source.match(/Open Yango/g) || []).length, 1);
  assert.equal((source.match(/Open Bykea/g) || []).length, 1);
});
