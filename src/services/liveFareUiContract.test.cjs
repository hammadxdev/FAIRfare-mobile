const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { fareProvenance } = require("../utils/fareProvenance.cjs");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("mobile provenance accepts only positive live fares", () => {
  assert.equal(fareProvenance({ isAvailable: true, fare: 450, dataSource: "REAL" }).key, "live");
  assert.equal(fareProvenance({ isAvailable: true, fare: 450, dataSource: "SIMULATED" }).key, "unavailable");
  assert.equal(fareProvenance({ isAvailable: true, fare: 0, dataSource: "REAL" }).key, "unavailable");
});
test("production mobile comparison has no mock fare fallback or mock provider fixture", () => {
  const home = read("screens/HomeScreen.js");
  const card = read("components/ProviderFareCard.js");
  assert.equal(home.includes("mockCompareFaresResponse"), false);
  assert.equal(home.includes("ENABLE_MOCK_FALLBACK"), false);
  assert.equal(card.includes('source === "REAL"'), false); // source is evaluated by the shared provenance contract
  assert.equal(fs.existsSync(path.join(__dirname, "..", "constants", "mockProviders.js")), false);
});
