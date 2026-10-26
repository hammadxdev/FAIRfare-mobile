const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalCityId, cityIdentity } = require("./cityIdentity.cjs");

test("canonicalizes Lahore administrative variants", () => {
  assert.equal(canonicalCityId({ city: "Lahore" }), "lahore");
  assert.equal(canonicalCityId({ city: "Urban Lahore" }), "lahore");
  assert.equal(canonicalCityId({ municipality: "Lahore District" }), "lahore");
});

test("keeps genuine intercity identities distinct", () => {
  assert.notEqual(canonicalCityId({ city: "Lahore" }), canonicalCityId({ city: "Karachi" }));
  assert.equal(cityIdentity({ city: "Karachi", lat: "24.9", lng: "67.0" }).canonical, "karachi");
});

test("does not invent an identity from locality-only metadata", () => {
  assert.equal(canonicalCityId({ locality: "Lidher", district: "DHA" }), null);
});
