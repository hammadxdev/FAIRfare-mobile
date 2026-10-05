const test = require("node:test");
const assert = require("node:assert/strict");
const { createRefreshSingleFlight, isRefreshAuthFailure } = require("./authRetry.cjs");

test("concurrent protected 401s share one refresh operation", async () => {
  let calls = 0;
  const refreshOnce = createRefreshSingleFlight(async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { accessToken: "new-access-token" };
  });

  const [first, second] = await Promise.all([refreshOnce(), refreshOnce()]);
  assert.equal(calls, 1);
  assert.strictEqual(first, second);
});

test("only a refresh 401 is treated as expired; network/5xx remains retryable", () => {
  assert.equal(isRefreshAuthFailure({ response: { status: 401 } }), true);
  assert.equal(isRefreshAuthFailure({ response: { status: 403 } }), true);
  assert.equal(isRefreshAuthFailure({ response: { status: 500 } }), false);
  assert.equal(isRefreshAuthFailure({ code: "ENOTFOUND" }), false);
});
