const test = require("node:test");
const assert = require("node:assert/strict");
const { flattenFareOptions, supportedCategories, supportedServiceCategories, filterOptions } = require("./fareComparison.cjs");
const { sortOptionsWithinCategories, nearbyEvidence } = require("./comparisonResults.cjs");

function fixtureOptions() {
  return flattenFareOptions([
    { provider: { name: "indrive", displayName: "inDrive" }, quotes: [
      { categoryId: "2", categoryName: "Moto", vehicleCategory: "bike", fare: 200, currency: "PKR", isAvailable: true },
      { categoryId: "31", categoryName: "Rickshaw", vehicleCategory: "rickshaw", fare: 300, currency: "PKR", isAvailable: true },
      { categoryId: "33", categoryName: "Mini", normalizedCategory: "ECONOMY_CAR", vehicleCategory: "car", serviceTier: "economy", fare: 450, currency: "PKR", isAvailable: true },
      { categoryId: "29", categoryName: "Ride AC", vehicleCategory: "car", serviceTier: "standard", features: ["AC"], fare: 620, currency: "PKR", isAvailable: true },
      { categoryId: "11", categoryName: "Premium", vehicleCategory: "car", serviceTier: "premium", fare: 780, currency: "PKR", isAvailable: true },
    ] },
    { provider: { name: "bykea", displayName: "Bykea" }, quotes: [
      { categoryId: "44", categoryName: "Car AC", vehicleCategory: "car", serviceTier: "standard", features: ["AC"], fare: 560, currency: "PKR", isAvailable: true },
      { categoryId: "45", categoryName: "Car", vehicleCategory: "car", serviceTier: "standard", fare: 500, currency: "PKR", isAvailable: true },
      { categoryId: "48", categoryName: "Car Premium", vehicleCategory: "car", serviceTier: "premium", fare: 850, currency: "PKR", isAvailable: true },
    ] },
    { provider: { name: "yango", displayName: "Yango" }, quotes: [
      { categoryId: "comfortplus", categoryName: "Comfort Plus", vehicleCategory: "car", serviceTier: "premium", fare: 900, currency: "PKR", isAvailable: true },
      { categoryId: "econom_ac", categoryName: "Economy AC", vehicleCategory: "car", serviceTier: "economy", features: ["air conditioning"], fare: 440, currency: "PKR", isAvailable: true },
      { categoryId: "econom", categoryName: "Economy", vehicleCategory: "car", serviceTier: "economy", fare: 430, currency: "PKR", isAvailable: true },
    ] },
  ]);
}

test("AC variants share one AC filter and Premium variants share one Premium filter without merging fares", () => {
  const options = fixtureOptions();
  const ac = filterOptions(options, "AC");
  const premium = filterOptions(options, "premium");
  assert.deepEqual(supportedCategories(options), ["bike", "car", "mini", "rickshaw"]);
  assert.deepEqual(ac.map(({ providerId, categoryId, categoryName, fare }) => [providerId, categoryId, categoryName, fare]), [
    ["indrive", "29", "Ride AC", 620], ["bykea", "44", "Car AC", 560], ["yango", "econom_ac", "Economy AC", 440],
  ]);
  assert.deepEqual(premium.map(({ providerId, categoryId, categoryName, fare }) => [providerId, categoryId, categoryName, fare]), [
    ["indrive", "11", "Premium", 780], ["bykea", "48", "Car Premium", 850], ["yango", "comfortplus", "Comfort Plus", 900],
  ]);
  assert.deepEqual(supportedServiceCategories(options).map(({ label }) => label), ["Economy"]);
});

test("Mini remains a separate category and does not leak into Car fares or sorting", () => {
  const options = fixtureOptions();
  const mini = filterOptions(options, "mini");
  assert.deepEqual(mini.map(({ providerId, categoryId, categoryName, fare }) => [providerId, categoryId, categoryName, fare]), [["indrive", "33", "Mini", 450]]);
  assert.equal(filterOptions(options, "car").some((option) => option.categoryId === "33"), false);
  assert.equal(supportedServiceCategories(options).some(({ label }) => label === "Mini"), false);
  assert.deepEqual(sortOptionsWithinCategories([...mini, ...filterOptions(options, "car")], "price").map((option) => option.category), ["mini", "car", "car", "car", "car", "car", "car", "car", "car"]);
});

test("subtype nearest matching requires the same provider service ID and verified fresh position", () => {
  const now = Date.now();
  const captured = new Date(now).toISOString();
  const snapshot = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [
    { providerId: "indrive", category: "car", providerCategoryId: "29", status: "available", timestampSource: "verified_provider_capture", providerCapturedAt: captured, markers: [{ latitude: 31.501, longitude: 74.3 }] },
  ] };
  const rideAc = { providerId: "indrive", category: "car", categoryId: "29", features: ["AC"], fare: 620 };
  const premium = { providerId: "indrive", category: "car", categoryId: "11", serviceTier: "premium", fare: 780 };
  const mini = { providerId: "indrive", category: "mini", categoryId: "33", fare: 450 };
  assert.ok(nearbyEvidence(snapshot, "indrive", "car", now, rideAc).nearestKm > 0);
  assert.equal(nearbyEvidence(snapshot, "indrive", "car", now, premium).nearestKm, null);
  assert.equal(nearbyEvidence(snapshot, "indrive", "mini", now, mini).nearestKm, null);
  const stale = { ...snapshot, results: [{ ...snapshot.results[0], providerCapturedAt: new Date(now - 120_000).toISOString() }] };
  assert.equal(nearbyEvidence(stale, "indrive", "car", now, rideAc).nearestKm, null);
});

test("unknown subtype cannot borrow a broad car marker for AC, Premium, or Mini", () => {
  const now = Date.now();
  const broad = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [{ providerId: "yango", category: "car", status: "available", providerCaptureVerified: true, providerCapturedAt: new Date(now).toISOString(), markers: [{ latitude: 31.501, longitude: 74.3, providerCaptureVerified: true, providerCapturedAt: new Date(now).toISOString() }] }] };
  for (const fareOption of [
    { category: "car", categoryId: "comfortplus", serviceTier: "premium" },
    { category: "car", categoryId: "econom_ac", features: ["AC"] },
    { category: "mini", categoryId: "33" },
  ]) {
    const evidence = nearbyEvidence(broad, "yango", fareOption.category, now, fareOption);
    assert.equal(evidence.nearestKm, null);
    assert.equal(evidence.reason, "SUBTYPE_IDENTITY_UNAVAILABLE");
  }
});
