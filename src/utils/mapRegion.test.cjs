const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("map region implementation rejects invalid coordinates before calculating bounds", () => {
  const source = fs.readFileSync(path.join(__dirname, "mapRegion.js"), "utf8");
  assert.match(source, /Number\.isFinite\(latitude\)/);
  assert.match(source, /latitude >= -90/);
  assert.match(source, /longitude >= -180/);
  assert.match(source, /latitude === 0 && longitude === 0/);
});
