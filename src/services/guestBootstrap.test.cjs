const test = require("node:test");
const assert = require("node:assert/strict");
const { createGuestBootstrap, shouldCreateGuest, restoreOrCreateGuest } = require("./guestBootstrap.cjs");

test("concurrent guest startup shares one creation request", async () => {
  let calls = 0; let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const bootstrap = createGuestBootstrap(async () => { calls += 1; await gate; return { accessToken: "test" }; });
  const first = bootstrap(); const second = bootstrap();
  assert.equal(calls, 0);
  release();
  assert.deepEqual(await first, { accessToken: "test" });
  assert.deepEqual(await second, { accessToken: "test" });
  assert.equal(calls, 1);
});

test("only missing or terminally expired guest sessions can create a guest", () => {
  assert.equal(shouldCreateGuest("none"), true);
  assert.equal(shouldCreateGuest("expiredGuest"), true);
  assert.equal(shouldCreateGuest("transient"), false);
  assert.equal(shouldCreateGuest("expiredAccount"), false);
});

test("transient restoration failure never creates or replaces an identity", async () => {
  let created = 0;
  const result = await restoreOrCreateGuest({ restore: async () => "transient", createGuest: async () => { created += 1; } });
  assert.deepEqual(result, { status: "transient" });
  assert.equal(created, 0);
});