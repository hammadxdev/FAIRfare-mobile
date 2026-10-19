const test = require("node:test");
const assert = require("node:assert/strict");
const { assessRouteEligibility, locationIdentity } = require("./routeEligibility.cjs");

const route = { requestId: 4, geometryAvailable: true, distanceKm: 10.7, durationMin: 14 };
const karachi = { id: "k1", name: "North Nazimabad", city: "Karachi", lat: 24.9, lng: 67.0 };
const gulshan = { id: "k2", name: "Gulshan", city: "Karachi", lat: 24.93, lng: 67.1 };
const lahore = { id: "l1", name: "Gulberg", city: "Lahore", lat: 31.5, lng: 74.3 };

test("same-city Karachi route remains eligible", () => assert.equal(assessRouteEligibility({ pickup: karachi, dropoff: gulshan, route }).eligible, true));
test("coordinate-valid intercity route remains eligible for provider policy", () => assert.equal(assessRouteEligibility({ pickup: karachi, dropoff: lahore, route }).eligible, true));
test("explicit intercity route is preserved for backend policy", () => assert.equal(assessRouteEligibility({ pickup: karachi, dropoff: lahore, route, explicitIntercity: true }).eligible, true));
test("HTTP/geometry success without a request identity is not eligible", () => assert.equal(assessRouteEligibility({ pickup: karachi, dropoff: gulshan, route: { ...route, requestId: null } }).eligible, false));
test("location diagnostics preserve raw and canonical identity plus coordinates", () => assert.deepEqual(locationIdentity(karachi), { id: "k1", name: "North Nazimabad", city: "Karachi", canonicalCity: "karachi", lat: 24.9, lng: 67 }));
test("Lahore and Urban Lahore are treated as one canonical city", () => {
  const urbanLahore = { id: "l2", name: "DHA Phase 6", city: "Urban Lahore", lat: 31.47, lng: 74.42 };
  assert.equal(assessRouteEligibility({ pickup: lahore, dropoff: urbanLahore, route }).eligible, true);
});
test("unresolved city identity does not block a valid coordinate route", () => {
  const unresolved = { id: "x1", name: "Unknown area", locality: "Lidher", lat: 31.47, lng: 74.42 };
  assert.equal(assessRouteEligibility({ pickup: unresolved, dropoff: lahore, route }).reason, "COORDINATES_AND_ROUTE_VALID");
});
