const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { expandProviderResults } = require("./indriveQuotes.cjs");

const fixture = {
  provider: { id: "indrive", name: "indrive", displayName: "inDrive" },
  dataSource: "REAL",
  quotes: [
    { categoryId: "2", categoryName: "Moto", fare: 163, fareMin: 140, fareMax: 185, currency: "PKR", source: "live", isAvailable: true },
    { categoryId: "33", categoryName: "Mini", fare: 450, fareMin: 450, fareMax: 450, currency: "PKR", source: "live", isAvailable: true },
    { categoryId: "31", categoryName: "Rickshaw", fare: 300, currency: "PKR", source: "live", isAvailable: true },
    { categoryId: "29", categoryName: "Ride AC", fare: 620, currency: "PKR", source: "live", isAvailable: true },
    { categoryId: "11", categoryName: "Premium", fare: 780, currency: "PKR", source: "live", isAvailable: true },
    { categoryId: "99", categoryName: "Invalid", fare: null, currency: "PKR", source: "live", isAvailable: false },
  ],
};

test("one fare card input is produced for every valid available inDrive category", () => {
  const cards = expandProviderResults([fixture]);
  assert.equal(cards.length, 5);
  assert.deepEqual(cards.map((item) => [item.categoryId, item.categoryName, item.fare]), [
    ["2", "Moto", 163], ["33", "Mini", 450], ["31", "Rickshaw", 300], ["29", "Ride AC", 620], ["11", "Premium", 780],
  ]);
});

test("inDrive resolves canonical name when provider id is an opaque UUID", () => {
  const result = {
    ...fixture,
    provider: { id: "4f2e1a90-3b7c-4d11-8f20-000000000002", name: "indrive", displayName: "inDrive" },
  };
  assert.equal(expandProviderResults([result]).length, 5);
});

test("inDrive preserves provider-recommended prices without treating them as exact", () => {
  const result = {
    ...fixture,
    quotes: [{ categoryId: "33", categoryName: "Mini", fare: 830, currency: "PKR", source: "live", priceType: "suggested", fareType: "RECOMMENDED", isNegotiable: true, isAvailable: true }],
  };
  const [card] = expandProviderResults([result]);
  assert.equal(card.fare, 830);
  assert.equal(card.priceType, "suggested");
  assert.equal(card.isNegotiable, true);
});

test("unknown category uses the generic bundled PNG fallback", () => {
  const source = fs.readFileSync(path.join(__dirname, "../constants/indriveVehicleAssets.js"), "utf8");
  assert.match(source, /generic\.png/);
  assert.match(source, /getIndriveVehicleImage/);
});

test("ResultsScreen expands provider quotes instead of hardcoding category count", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/ResultsScreen.js"), "utf8");
  assert.match(source, /expandProviderResults\(results\)/);
  assert.match(source, /liveInDriveResults\.map/);
  assert.doesNotMatch(source, /slice\(0,\s*5\)/);
});

test("ResultsScreen preserves inDrive-only expansion while Yango uses its separate adapter", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/ResultsScreen.js"), "utf8");
  assert.match(source, /expandProviderResults\(results\)/);
  assert.match(source, /expandYangoResults\(results\)/);
  assert.doesNotMatch(source, /expandYangoResults\(inDriveResults\)/);
});
