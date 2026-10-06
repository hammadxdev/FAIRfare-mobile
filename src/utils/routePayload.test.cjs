const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCompareAgainRoute } = require("./routePayload.cjs");

test("normalizes history pickup/dropoff labels and numeric coordinates", () => {
  assert.deepEqual(normalizeCompareAgainRoute({
    pickup: { label: "Pickup", latitude: 31.5, longitude: 74.3 },
    dropoff: { label: "Dropoff", latitude: 31.6, longitude: 74.4 },
  }), {
    pickup: { name: "Pickup", address: "Pickup", lat: 31.5, lng: 74.3 },
    dropoff: { name: "Dropoff", address: "Dropoff", lat: 31.6, lng: 74.4 },
  });
});

test("normalizes saved-route destination and numeric-string coordinates", () => {
  assert.deepEqual(normalizeCompareAgainRoute({
    pickup: { name: "Home", address: "Home address", lat: "31.5", lng: "74.3" },
    destination: { name: "Work", address: "Work address", lat: "31.6", lng: "74.4" },
  }), {
    pickup: { name: "Home", address: "Home address", lat: 31.5, lng: 74.3 },
    dropoff: { name: "Work", address: "Work address", lat: 31.6, lng: 74.4 },
  });
});

test("rejects missing pickup or dropoff instead of producing undefined locations", () => {
  assert.equal(normalizeCompareAgainRoute({ pickup: { label: "Pickup", latitude: 1, longitude: 2 } }), null);
  assert.equal(normalizeCompareAgainRoute({ dropoff: { label: "Dropoff", latitude: 1, longitude: 2 } }), null);
  assert.equal(normalizeCompareAgainRoute({ pickup: { label: "Pickup", latitude: 1, longitude: 2 }, destination: {} }), null);
  assert.equal(normalizeCompareAgainRoute({ pickup: { label: "Pickup", latitude: 1, longitude: 2 }, dropoff: {}, destination: { name: "Work", lat: 1, lng: 2 } }), null);
});
