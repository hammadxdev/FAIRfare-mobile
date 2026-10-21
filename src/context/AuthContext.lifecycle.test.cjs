const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  createRefreshSingleFlight,
  createOperationGate,
  isRefreshAuthFailure,
  normalizeApiBaseUrl,
  shouldRevalidate,
  withTimeout,
} = require("../services/authRetry.cjs");

const context = fs.readFileSync(path.join(__dirname, "AuthContext.js"), "utf8");
const api = fs.readFileSync(path.join(__dirname, "../services/api.js"), "utf8");
const navigator = fs.readFileSync(path.join(__dirname, "../navigation/RootNavigator.js"), "utf8");

test("slow or unreachable startup is bounded without treating timeout as expiration", async () => {
  const started = Date.now();
  await assert.rejects(withTimeout(new Promise(() => {}), 25, "AUTH_RESTORE_TIMEOUT"), { code: "AUTH_RESTORE_TIMEOUT" });
  assert.ok(Date.now() - started < 500, "startup timeout should remain bounded");
  assert.doesNotMatch(context, /AUTH_RESTORE_TIMEOUT[\s\S]{0,300}signOut\(\{ reason: "SESSION_EXPIRED"/);
  assert.match(context, /Connection unavailable/);
  assert.match(context, /setSessionState\(current\)/);
});

test("successful refresh is single-flight and revoked refresh is terminal", async () => {
  let calls = 0;
  const refresh = createRefreshSingleFlight(async () => { calls += 1; return { accessToken: "new" }; });
  const [first, second] = await Promise.all([refresh(), refresh()]);
  assert.equal(calls, 1);
  assert.strictEqual(first, second);
  assert.equal(isRefreshAuthFailure({ response: { status: 401 } }), true);
  assert.equal(isRefreshAuthFailure({ response: { status: 403 } }), true);
  assert.equal(isRefreshAuthFailure({ code: "ETIMEDOUT" }), false);
  assert.equal(isRefreshAuthFailure({ response: { status: 503 } }), false);
});

test("foreground revalidation is throttled and concurrent work is deduplicated by contract", () => {
  assert.equal(shouldRevalidate(1000, 59_000, 60_000), false);
  assert.equal(shouldRevalidate(1000, 61_000, 60_000), true);
  assert.equal(shouldRevalidate(undefined, 1, 60_000), true);
  assert.match(context, /AppState\.addEventListener\("change"/);
  assert.match(context, /foregroundPromiseRef\.current/);
  assert.match(context, /FOREGROUND_REVALIDATION_MS/);
});

test("logout invalidates in-flight auth work and keeps retry behavior centralized", () => {
  const gate = createOperationGate();
  const operation = gate.current();
  gate.invalidate();
  assert.equal(gate.isCurrent(operation), false);
  assert.match(context, /gateRef\.current\.invalidate\(\)/);
  assert.match(api, /config\._authRetried = true/);
  assert.match(api, /createRefreshSingleFlight/);
});

test("API URL normalization appends exactly one /api and rejects malformed configuration", () => {
  assert.equal(normalizeApiBaseUrl("https://example.test"), "https://example.test/api");
  assert.equal(normalizeApiBaseUrl("https://example.test/api/"), "https://example.test/api");
  assert.equal(normalizeApiBaseUrl("https://example.test/api/api"), "https://example.test/api");
  assert.equal(normalizeApiBaseUrl("http://10.0.2.2:4000"), "http://10.0.2.2:4000/api");
  assert.throws(() => normalizeApiBaseUrl("http://example.test/api||http://localhost:8081"));
  assert.throws(() => normalizeApiBaseUrl("ftp://example.test/api"));
  assert.match(api, /normalizeApiBaseUrl\(process\.env\.EXPO_PUBLIC_API_BASE_URL\)/);
  assert.match(navigator, /retrySession/);
});
