const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildGeoUri,
  getIndriveLaunchUris,
  hasValidCoordinate,
  normalizeCoordinate,
  openFirstAvailable,
} = require("./providerLauncherLogic.cjs");

test("builds a geo URI from valid canonical coordinates", () => {
  assert.equal(buildGeoUri({ lat: 31.5, lng: 74.3 }), "geo:31.5,74.3");
  assert.equal(hasValidCoordinate({ lat: 31.5, lng: 74.3 }), true);
});

test("normalizes numeric-string coordinates", () => {
  assert.equal(normalizeCoordinate("31.5"), 31.5);
  assert.equal(buildGeoUri({ latitude: "31.5", longitude: "74.3" }), "geo:31.5,74.3");
});

test("rejects invalid latitude", () => {
  assert.equal(hasValidCoordinate({ lat: 90.1, lng: 74.3 }), false);
  assert.equal(buildGeoUri({ lat: 90.1, lng: 74.3 }), null);
});

test("rejects invalid longitude", () => {
  assert.equal(hasValidCoordinate({ lat: 31.5, lng: -180.1 }), false);
  assert.equal(buildGeoUri({ lat: 31.5, lng: -180.1 }), null);
});

test("does not build a geo URI when coordinates are missing", () => {
  assert.equal(hasValidCoordinate({ name: "Unknown" }), false);
  assert.deepEqual(getIndriveLaunchUris({ pickup: { name: "Unknown" } }), [
    "indrive://open",
    "https://indrive.com/app",
  ]);
});

test("uses the verified geo handoff before open and HTTPS fallback", () => {
  assert.deepEqual(getIndriveLaunchUris({ pickup: { lat: "31.5", lng: "74.3" } }), [
    "geo:31.5,74.3",
    "indrive://open",
    "https://indrive.com/app",
  ]);
});

test("never uses non-exported ridepush or autostart routes", () => {
  const uris = getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } });
  assert.equal(uris.some((uri) => uri.includes("ridepush") || uri.includes("autostart")), false);
});

test("geo launch failure falls back to indrive open", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => {
        if (uri === "geo:31.5,74.3") throw new Error("geo launch failed");
      },
    },
  );
  assert.equal(opened, "indrive://open");
  assert.deepEqual(attempted, ["geo:31.5,74.3", "indrive://open"]);
});

test("open fallback failure reaches the verified HTTPS app link", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => {
        if (uri !== "https://indrive.com/app") throw new Error("app launch failed");
      },
    },
  );
  assert.equal(opened, "https://indrive.com/app");
  assert.deepEqual(attempted, ["geo:31.5,74.3", "indrive://open", "https://indrive.com/app"]);
});
