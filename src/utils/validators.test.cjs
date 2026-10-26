const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "validators.js"), "utf8");

test("validators enforce finite latitude and longitude ranges", () => {
  assert.match(source, /lat >= -90 && lat <= 90/);
  assert.match(source, /lng >= -180 && lng <= 180/);
  assert.match(source, /Number\.isFinite\(lat\)/);
  assert.match(source, /Number\.isFinite\(lng\)/);
});

test("validators reject missing, invalid and identical coordinates", () => {
  assert.match(source, /hasValidCoordinates\(pickup\)/);
  assert.match(source, /hasValidCoordinates\(dropoff\)/);
  assert.match(source, /!isSameLocation\(pickup, dropoff\)/);
});

test("validators accept alternate latitude and longitude field names", () => {
  assert.match(source, /location\?\.\[key\] \?\? location\?\.\[alternateKey\]/);
  assert.match(source, /coordinateValue\(location, "lat", "latitude"\)/);
  assert.match(source, /coordinateValue\(location, "lng", "longitude"\)/);
});
