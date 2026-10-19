const test = require("node:test");
const assert = require("node:assert/strict");
const { expandYangoResults, isAuthorizedYangoResult, yangoUiState } = require("./yangoQuotes.cjs");

function authorizedResult(quotes) {
  return {
    provider: { id: "quickride", name: "quickride", displayName: "Yango" },
    source: "live",
    dataSource: "REAL",
    quotes,
  };
}

test("authorized Yango expands dynamic passenger categories and keeps fare fields distinct", () => {
  const cards = expandYangoResults([authorizedResult([
    { categoryId: "econom", categoryName: "Economy", fare: 439, displayFare: 430, startingFare: 209, currency: "PKR", source: "live", isAvailable: true, pickupEtaSeconds: 420 },
    { categoryId: "comfortplus", categoryName: "Comfort", fare: 559, displayFare: 550, startingFare: 230, currency: "PKR", source: "live", isAvailable: true, pickupEtaSeconds: 780 },
  ])]);
  assert.deepEqual(cards.map((item) => [item.categoryId, item.fare, item.displayFare, item.startingFare, item.pickupEtaSeconds]), [
    ["econom", 439, 430, 209, 420],
    ["comfortplus", 559, 550, 230, 780],
  ]);
  assert.equal(cards[0].provider.id, "yango");
});

test("Yango requires authorized live backend provenance and never promotes fixture-like results", () => {
  const disabled = { provider: { id: "quickride" }, source: "none", dataSource: "NONE", quotes: [{ categoryId: "econom", fare: 439, currency: "PKR", isAvailable: true }] };
  assert.equal(isAuthorizedYangoResult(disabled), false);
  assert.deepEqual(expandYangoResults([disabled]), []);
  assert.equal(yangoUiState([disabled]).unavailable, true);
});

test("Yango accepts live provenance retained on the quote when provider provenance is absent", () => {
  const result = {
    provider: { id: "yango", name: "yango", displayName: "Yango" },
    quotes: [
      { categoryId: "econom", fare: 439, currency: "PKR", source: "live", dataSource: "REAL", isAvailable: true },
    ],
  };
  assert.equal(isAuthorizedYangoResult(result), true);
  assert.deepEqual(expandYangoResults([result]).map((item) => item.fare), [439]);
  assert.equal(yangoUiState([result]).unavailable, false);
});

test("Yango resolves canonical name when provider id is an opaque UUID", () => {
  const result = {
    provider: { id: "7d3c2f1e-8a7d-4b15-9b7c-000000000001", name: "quickride", displayName: "Yango" },
    source: "live",
    dataSource: "REAL",
    quotes: [{ categoryId: "econom", fare: 439, currency: "PKR", source: "live", isAvailable: true }],
  };
  assert.deepEqual(expandYangoResults([result]).map((item) => item.categoryId), ["econom"]);
});

test("Yango deduplicates quickride and canonical yango aliases", () => {
  const first = authorizedResult([{ categoryId: "econom", fare: 439, displayFare: 430, currency: "PKR", source: "live", isAvailable: true }]);
  const second = { ...authorizedResult([{ categoryId: "econom", fare: 439, displayFare: 430, currency: "PKR", source: "live", isAvailable: true }]), provider: { id: "yango", name: "yango" } };
  assert.deepEqual(expandYangoResults([first, second]).map((item) => item.categoryId), ["econom"]);
});

test("unavailable Rickshaw+ is retained as unavailable and delivery is excluded", () => {
  const cards = expandYangoResults([authorizedResult([
    { categoryId: "test_tariff_project_category", categoryName: "Rickshaw+", fare: 273, displayFare: 270, currency: "PKR", source: "live", isAvailable: false, availability: "unavailable", availabilityReason: { code: "no_free_cars_nearby" } },
    { categoryId: "courier", categoryType: "delivery", fare: 125, currency: "PKR", source: "live", isAvailable: true },
  ])]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].fare, null);
  assert.equal(cards[0].exactFare, 273);
  assert.equal(cards[0].availabilityReason.code, "no_free_cars_nearby");
  assert.equal(cards[0].isAvailable, false);
});

test("Yango is unavailable when authorized response has no verified fare", () => {
  const result = authorizedResult([
    { categoryId: "test_tariff_project_category", fare: null, displayFare: 270, startingFare: 110, currency: "PKR", source: "live", isAvailable: false, availability: "unavailable" },
  ]);
  const state = yangoUiState([result]);
  assert.equal(state.authorized, false);
  assert.equal(state.unavailable, true);
  assert.equal(state.quotes[0].fare, null);
});
