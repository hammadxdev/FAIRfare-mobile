const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyApiError, isRetryableRequest, retryAfterMs } = require("./apiErrors.cjs");

test("classifies offline, timeout, rate limit, server, and auth errors", () => {
  assert.equal(classifyApiError({ code: "ENOTFOUND" }).kind, "network");
  assert.equal(classifyApiError({ code: "ECONNABORTED", message: "timeout" }).kind, "timeout");
  assert.equal(classifyApiError({ response: { status: 429 } }).kind, "rate_limit");
  assert.equal(classifyApiError({ response: { status: 503 } }).kind, "server");
  assert.equal(classifyApiError({ response: { status: 401 } }).kind, "authentication");
});

test("only idempotent GET-like requests are eligible for automatic retry", () => {
  assert.equal(isRetryableRequest({ method: "get" }), true);
  assert.equal(isRetryableRequest({ method: "HEAD" }), true);
  assert.equal(isRetryableRequest({ method: "post" }), false);
  assert.equal(isRetryableRequest({ method: "delete" }), false);
});

test("honors numeric Retry-After without allowing an unbounded wait", () => {
  assert.equal(retryAfterMs({ response: { headers: { "retry-after": "2" } } }, 250), 2000);
  assert.equal(retryAfterMs({ response: { headers: { "retry-after": "999" } } }, 250), 10000);
});
