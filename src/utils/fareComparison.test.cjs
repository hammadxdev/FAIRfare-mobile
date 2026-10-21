const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalVehicleCategory,
  flattenFareOptions,
  filterOptions,
  supportedCategories,
  supportedFeatures,
  supportedServiceTiers,
  comparableOptions,
  bestComparableIds,
} = require("./fareComparison.cjs");

test("preserves provider labels while classifying documented and unknown options", () => {
  const options = flattenFareOptions([
    { provider: { name: "indrive", displayName: "inDrive" }, quotes: [{ categoryId: "2", categoryName: "Moto", vehicleCategory: "bike", fare: 200, currency: "PKR", isAvailable: true }] },
    { provider: { name: "urbancab", displayName: "Bykea" }, quotes: [{ service_code: 23, providerServiceLabel: "Service 23", fare: 196, currency: "PKR", isAvailable: true }] },
  ]);
  assert.deepEqual(options.map((item) => [item.providerName, item.serviceLabel, item.category]), [["inDrive", "Moto", "bike"], ["Bykea", "Service 23", "unknown"]]);
});

test("sorts and highlights only comparable fares in the same verified category", () => {
  const options = flattenFareOptions([
    { provider: { name: "indrive", displayName: "inDrive" }, quotes: [{ categoryId: "2", categoryName: "Moto", vehicleCategory: "bike", fare: 220, currency: "PKR", isAvailable: true }] },
    { provider: { name: "yango", displayName: "Yango" }, quotes: [{ categoryId: "moto", categoryName: "Bike", vehicleCategory: "bike", fare: 210, currency: "PKR", isAvailable: true }] },
    { provider: { name: "urbancab", displayName: "Bykea" }, quotes: [{ service_code: 70, fare: 180, currency: "PKR", vehicleCategory: "unknown", isAvailable: true }] },
  ]);
  assert.deepEqual(supportedCategories(options), ["bike"]);
  assert.deepEqual(comparableOptions(options, "bike").map((item) => item.fare), [210, 220]);
  assert.deepEqual([...bestComparableIds(options)], [options.find((item) => item.fare === 210).optionId]);
});

test("generic Yango tariffs remain unknown without explicit vehicle metadata", () => {
  assert.equal(canonicalVehicleCategory({ provider: { name: "yango" }, categoryName: "Economy" }), "unknown");
});

test("AC and premium filters use explicit metadata without changing vehicle categories", () => {
  const options = flattenFareOptions([
    { provider: { name: "indrive", displayName: "inDrive" }, quotes: [
      { categoryId: "29", categoryName: "Ride AC", vehicleCategory: "car", serviceTier: "standard", features: ["AC"], fare: 620, currency: "PKR", isAvailable: true },
      { categoryId: "11", categoryName: "Premium", vehicleCategory: "car", serviceTier: "premium", features: [], fare: 780, currency: "PKR", isAvailable: true },
    ] },
  ]);
  assert.deepEqual(supportedFeatures(options), ["AC"]);
  assert.deepEqual(supportedServiceTiers(options), ["premium"]);
  assert.equal(filterOptions(options, "AC")[0].category, "car");
  assert.equal(filterOptions(options, "premium")[0].serviceLabel, "Premium");
});
