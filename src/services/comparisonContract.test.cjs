const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { flattenFareOptions } = require("../utils/fareComparison.cjs");

const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");
const homeSource = fs.readFileSync(path.join(__dirname, "../screens/HomeScreen.js"), "utf8");

test("comparison preserves the POST contract, JSON payload, and response.data navigation shape", () => {
  assert.match(apiSource, /apiClient\.post\("\/fares\/compare", payload/);
  assert.match(apiSource, /timeout: COMPARISON_TIMEOUT_MS/);
  assert.match(homeSource, /const response = await compareFares\(payload/);
  assert.match(homeSource, /navigation\.navigate\("Results", \{ result: \{ \.\.\.response\.data/);
});

test("comparison has a bounded dedicated timeout and does not alter the shared client timeout", () => {
  assert.match(apiSource, /export const COMPARISON_TIMEOUT_MS = 30000/);
  assert.match(apiSource, /timeout: 15000/);
});

test("valid three-provider responses and unavailable providers remain in the comparison result", () => {
  const response = { success: true, message: "ok", data: { results: [
    { provider: { name: "indrive", displayName: "inDrive" }, quotes: Array.from({ length: 5 }, (_, i) => ({ fare: 100 + i, currency: "PKR", isAvailable: true })) },
    { provider: { name: "yango", displayName: "Yango" }, quotes: Array.from({ length: 5 }, (_, i) => ({ fare: 200 + i, currency: "PKR", isAvailable: true })) },
    { provider: { name: "urbancab", displayName: "Bykea" }, quotes: Array.from({ length: 5 }, (_, i) => ({ service_code: `mstr-${i}`, fare: 300 + i, currency: "PKR", isAvailable: true })) },
    { provider: { name: "other" }, quotes: [], isAvailable: false, error: "unavailable" },
  ] } };
  assert.equal(response.success, true);
  const options = flattenFareOptions(response.data.results);
  assert.equal(options.filter((item) => item.isAvailable).length, 15);
  assert.deepEqual([...new Set(options.slice(0, 15).map((item) => item.providerName))].sort(), ["Bykea", "Yango", "inDrive"]);
  assert.equal(response.data.results[3].isAvailable, false);
});
