const test = require("node:test");
const assert = require("node:assert/strict");
const { formatReverseGeocode, haversineDistanceMeters, rankLocationSuggestions, filterRelevantSuggestions } = require("./locationFormatting.cjs");

test("reverse geocode keeps a supported house fragment while making the street the main label", () => {
  const result = formatReverseGeocode({ name: "D 643", address: "D 643 Street 18, DHA Phase 5, Lahore, Pakistan" });
  assert.equal(result.name, "Street 18, DHA Phase 5");
  assert.equal(result.secondaryAddress, "D 643, Lahore, Pakistan");
  assert.match(result.address, /DHA Phase 5/);
});

test("reverse geocode does not invent a house number", () => {
  const result = formatReverseGeocode({ address: "Street 18, DHA Phase 5, Lahore, Pakistan" });
  assert.equal(result.name, "Street 18");
  assert.equal(result.secondaryAddress, "DHA Phase 5, Lahore, Pakistan");
  assert.doesNotMatch(result.secondaryAddress, /D\s*-?\s*643/i);
});

test("reverse geocode does not strip an ordinary provider name from the label", () => {
  const result = formatReverseGeocode({ name: "Kashmir", address: "Kashmir Road, Lahore, Pakistan" });
  assert.equal(result.name, "Kashmir Road");
});

test("distance is calculated only from real numeric coordinates", () => {
  assert.equal(haversineDistanceMeters({ lat: 31.5, lng: 74.3 }, { lat: 31.5, lng: 74.3 }), 0);
  assert.equal(haversineDistanceMeters({ lat: "31.5", lng: 74.3 }, { lat: 31.5, lng: 74.3 }), null);
});

test("nearby suggestions are ranked and equivalent results are deduplicated without removing distant searches", () => {
  const results = rankLocationSuggestions([
    { name: "Far place", address: "Pakistan", lat: 33, lng: 73 },
    { name: "Nearby place", address: "Lahore", lat: 31.501, lng: 74.301 },
    { name: "Nearby place", address: "Lahore", lat: 31.501, lng: 74.301 },
  ], { lat: 31.5, lng: 74.3 });
  assert.deepEqual(results.map((item) => item.name), ["Nearby place", "Far place"]);
  assert.ok(results[0].distanceMeters < results[1].distanceMeters);
});

test("exact university name outranks a nearer similarly named club", () => {
  const results = rankLocationSuggestions([
    { name: "Lahore Garrison Club", address: "DHA, Lahore", lat: 31.4701, lng: 74.4001 },
    { name: "Lahore Garrison University", address: "DHA, Lahore", lat: 31.4901, lng: 74.4201 },
  ], { lat: 31.4700, lng: 74.4000 }, "Lahore Garrison University");
  assert.equal(results[0].name, "Lahore Garrison University");
});

test("ordered full query ranks Lahore Garrison University above Garrison Academy", () => {
  const results = rankLocationSuggestions([
    { name: "Garrison Academy", address: "Lahore", lat: 31.5001, lng: 74.3001 },
    { name: "Lahore Garrison University", address: "DHA, Lahore", lat: 31.52, lng: 74.35 },
  ], { lat: 31.5, lng: 74.3 }, "Lahore garrison");
  assert.equal(results[0].name, "Lahore Garrison University");
});

test("prefix and bounded typo matching keep the university above a nearby academy", () => {
  const candidates = [
    { name: "Garrison Academy", address: "Lahore", lat: 31.5001, lng: 74.3001 },
    { name: "Lahore Garrison University", address: "Lahore", lat: 31.52, lng: 74.35 },
  ];
  assert.equal(rankLocationSuggestions(candidates, { lat: 31.5, lng: 74.3 }, "Lahore garr")[0].name, "Lahore Garrison University");
  assert.equal(rankLocationSuggestions(candidates, { lat: 31.5, lng: 74.3 }, "Lahore garrizon university")[0].name, "Lahore Garrison University");
});

test("missing university token is penalized and reported as a partial candidate by ordering", () => {
  const results = rankLocationSuggestions([
    { name: "Garrison Academy", address: "Lahore", lat: 31.5001, lng: 74.3001 },
    { name: "Lahore Garrison University", address: "Lahore", lat: 33, lng: 73 },
  ], { lat: 31.5, lng: 74.3 }, "Lahore garrison university");
  assert.equal(results[0].name, "Lahore Garrison University");
});

test("mixed Roman Urdu and English tokens still use full token coverage", () => {
  const results = rankLocationSuggestions([
    { name: "Brims Cafe", address: "Lahore", lat: 31.5, lng: 74.3 },
    { name: "Bahria Town Lahore", address: "food point", lat: 31.5001, lng: 74.3001 },
  ], { lat: 31.5, lng: 74.3 }, "Brims cafe Lahore");
  assert.equal(results[0].name, "Brims Cafe");
});

test("full phrase outranks a weak partial match even when the partial is nearer", () => {
  const results = rankLocationSuggestions([
    { name: "Lahore Garrison Club", address: "Lahore", lat: 31.5001, lng: 74.3001 },
    { name: "Lahore Garrison University", address: "Lahore", lat: 33.0001, lng: 73.0001 },
  ], { lat: 31.5, lng: 74.3 }, "Lahore Garrison University");
  assert.equal(results[0].name, "Lahore Garrison University");
});

test("initialism matching supports a provider-supplied abbreviation without inventing a place", () => {
  const results = rankLocationSuggestions([
    { name: "Lahore Garrison University", address: "Lahore", lat: 31.5, lng: 74.3 },
    { name: "Lahore Garrison Club", address: "Lahore", lat: 31.5001, lng: 74.3001 },
  ], { lat: 31.5, lng: 74.3 }, "LGU");
  assert.equal(results[0].name, "Lahore Garrison University");
});
test("relevant prior suggestions can be retained for an updating query", () => {
  const kept = filterRelevantSuggestions([{ name: "DHA Phase 6", address: "Lahore" }], "dha lah");
  const dropped = filterRelevantSuggestions([{ name: "Karachi Cantt", address: "Karachi" }], "dha lah");
  assert.equal(kept.length, 1);
  assert.equal(dropped.length, 0);
});

test("exact Brims match is strong and remains ahead of a nearby partial", () => {
  const results = rankLocationSuggestions([
    { name: "Brims Cafe", address: "Lahore", lat: 31.501, lng: 74.301 },
    { name: "Brim Restaurant", address: "Lahore", lat: 31.5, lng: 74.3 },
  ], { lat: 31.5, lng: 74.3 }, "Brims");
  assert.equal(results[0].name, "Brims Cafe");
  assert.equal(results[0].matchStrength, "strong");
});

test("equal relevance is ordered nearest-first, including sub-250m differences", () => {
  const results = rankLocationSuggestions([
    { name: "Bri Cafe", address: "Lahore", lat: 31.502, lng: 74.302 },
    { name: "Bri Cafe", address: "Lahore, Model Town", lat: 31.5002, lng: 74.3002 },
  ], { lat: 31.5, lng: 74.3 }, "Bri");
  assert.equal(results[0].address, "Lahore, Model Town");
});

test("missing businesses are not fabricated by ranking", () => {
  const results = rankLocationSuggestions([
    { name: "Sialkot Bri Plaza", address: "Sialkot", lat: 32.49, lng: 74.52 },
  ], { lat: 31.52, lng: 74.35 }, "Brims");
  assert.equal(results.some((item) => /brims/i.test(item.name)), false);
});
