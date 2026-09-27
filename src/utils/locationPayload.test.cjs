const test = require("node:test");
const assert = require("node:assert/strict");
const { toRouteLocation } = require("./locationPayload.cjs");

test("current-location object becomes canonical numeric route coordinates", () => {
  assert.deepEqual(toRouteLocation({ lat: 31.5, lng: 74.3 }), { lat: 31.5, lng: 74.3 });
});

test("autocomplete-selected object keeps canonical lat/lng", () => {
  assert.deepEqual(toRouteLocation({ name: "Destination", lat: 31.6, lng: 74.4 }), { lat: 31.6, lng: 74.4 });
});

test("saved-route latitude/longitude strings become numbers", () => {
  assert.deepEqual(toRouteLocation({ name: "Saved", latitude: "31.7", longitude: "74.5" }), { lat: 31.7, lng: 74.5 });
});

test("missing coordinate remains explicit for backend validation", () => {
  assert.deepEqual(toRouteLocation({ name: "Malformed", latitude: null }), { lat: null, lng: undefined });
});
