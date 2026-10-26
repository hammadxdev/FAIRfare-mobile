const test = require("node:test");
const assert = require("node:assert/strict");
const { fareProvenance } = require("./fareProvenance.cjs");

test("labels live provider metadata as a live quote", () => {
  assert.equal(fareProvenance({ fare: 300, isAvailable: true, dataSource: "REAL" }).label, "Live provider quote");
});

test("does not expose synthetic or estimate metadata as a production fare", () => {
  assert.equal(fareProvenance({ fare: 300, isAvailable: true, dataSource: "SYNTHETIC_DATASET" }).key, "unavailable");
  assert.equal(fareProvenance({ fare: 300, isAvailable: true, fareType: "ESTIMATE" }).key, "unavailable");
});

test("does not display an unavailable fare as a quote", () => {
  assert.equal(fareProvenance({ fare: null, isAvailable: false }).label, "Unavailable");
});

test("labels inDrive autofill price as suggested rather than exact", () => {
  const provenance = fareProvenance({ fare: 830, fareType: "RECOMMENDED", priceType: "suggested", isNegotiable: true, isAvailable: true, source: "live" });
  assert.equal(provenance.key, "suggested");
  assert.equal(provenance.label, "Suggested fare");
});

test("does not display an expired provider quote as live", () => {
  assert.equal(fareProvenance({ fare: 300, isAvailable: true, source: "live", quoteReceivedAt: Date.now() - 301000, metadata: { providerTtlSeconds: 300 } }).key, "unavailable");
});
