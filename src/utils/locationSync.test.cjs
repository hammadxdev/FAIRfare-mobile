const test = require("node:test");
const assert = require("node:assert/strict");
const { programmaticQueryUpdate, userQueryUpdate } = require("./locationSync.cjs");
test("programmatic selected-location synchronization is idempotent", () => {
  const marker = { current: null };
  assert.equal(programmaticQueryUpdate("North Nazimabad", "North Nazimabad", marker), "North Nazimabad");
  assert.deepEqual(userQueryUpdate("North Nazimabad", marker), { ignored: true, value: "North Nazimabad" });
  assert.deepEqual(userQueryUpdate("North Nazimabad x", marker), { ignored: false, value: "North Nazimabad x" });
});
test("actual typing is processed once per changed value", () => {
  const marker = { current: null };
  assert.deepEqual(userQueryUpdate("Karachi", marker), { ignored: false, value: "Karachi" });
  assert.deepEqual(userQueryUpdate("Karachi", marker), { ignored: false, value: "Karachi" });
});
