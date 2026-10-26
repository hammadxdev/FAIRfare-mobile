const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "HomeScreen.js"), "utf8");

test("comparison prevents duplicate taps and uses one request per intentional retry", () => {
  assert.match(source, /if \(!canCompare \|\| loading\) return/);
  assert.match(source, /setErrorMessage\(null\)/);
  assert.match(source, /const compareRequestId = \+\+compareRequestIdRef\.current/);
});

test("cancellation is ignored while timeout remains a user-visible actionable error", () => {
  assert.match(source, /if \(isCanceledError\(err\)\) return/);
  assert.match(source, /Fare comparison timed out\. Please try again\./);
  assert.match(source, /compareAbortRef\.current\?\.abort\(\)/);
});

test("stale responses cannot clear loading or navigate over a newer comparison", () => {
  assert.match(source, /if \(compareRequestIdRef\.current !== compareRequestId \|\| routeRequestIdRef\.current !== routeRequestId\) return/);
  assert.match(source, /if \(compareRequestIdRef\.current === compareRequestId\) \{/);
});

test("successful fares navigate to Results without awaiting the independent nearby request", () => {
  assert.match(source, /void fetchNearbyDrivers\(pickup/);
  assert.doesNotMatch(source, /nearbyPromise/);
  const fareResponse = source.indexOf("const response = await compareFares(payload");
  const resultsNavigation = source.indexOf('navigation.navigate("Results"');
  assert.ok(fareResponse >= 0 && resultsNavigation > fareResponse);
  assert.match(source, /nearbyDrivers: nearbyRequestStore\.get\(nearbyRequestKey\)/);
});
