const test = require("node:test");
const assert = require("node:assert/strict");
const { assessLocationFix } = require("./locationAccuracy.cjs");

test("preserves a fresh accurate GPS fix without a warning", () => {
  const result = assessLocationFix({ accuracy: 8, timestamp: 100000 }, 120000);
  assert.equal(result.stale, false);
  assert.equal(result.poorAccuracy, false);
  assert.equal(result.warning, null);
});

test("warns when GPS accuracy is poor or freshness is unknown", () => {
  assert.match(assessLocationFix({ accuracy: 120, timestamp: 100000 }, 120000).warning, /accuracy/i);
  assert.match(assessLocationFix({ accuracy: 8, timestamp: null }, 120000).warning, /stale/i);
});
