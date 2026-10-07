const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildGeoUri,
  getIndriveLaunchUris,
  getProviderLaunchUris,
  buildYangoRouteUrl,
  getYangoLaunchUris,
  getBykeaLaunchUris,
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

test("prefers the verified direct inDrive app launch before geo and HTTPS fallback", () => {
  assert.deepEqual(getIndriveLaunchUris({ pickup: { lat: "31.5", lng: "74.3" } }), [
    "indrive://open",
    "geo:31.5,74.3",
    "https://indrive.com/app",
  ]);
});

test("maps only the canonical backend provider IDs to their handoffs", () => {
  assert.equal(getProviderLaunchUris("indrive")[0], "indrive://open");
  assert.equal(getProviderLaunchUris("quickride")[0], "https://yango.com/en_pk/");
  assert.equal(getProviderLaunchUris("urbancab")[0], "bykea://kl");
  assert.deepEqual(getProviderLaunchUris("Yango"), []);
  assert.deepEqual(getProviderLaunchUris("Bykea"), []);
});

test("never uses non-exported ridepush or autostart routes", () => {
  const uris = getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } });
  assert.equal(uris.some((uri) => uri.includes("ridepush") || uri.includes("autostart")), false);
});

test("direct inDrive launch can fall back to geo", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => {
        if (uri === "indrive://open") throw new Error("app launch failed");
      },
    },
  );
  assert.equal(opened, "geo:31.5,74.3");
  assert.deepEqual(attempted, ["indrive://open", "geo:31.5,74.3"]);
});

test("open fallback failure reaches the verified HTTPS app link", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => {
        if (uri !== "https://indrive.com/app") throw new Error("handoff failed");
      },
    },
  );
  assert.equal(opened, "https://indrive.com/app");
  assert.deepEqual(attempted, ["indrive://open", "geo:31.5,74.3", "https://indrive.com/app"]);
});

test("builds the documented Yango route link with encoded coordinates", () => {
  assert.equal(buildYangoRouteUrl({ pickup: { lat: 31.5, lng: 74.3 }, destination: { latitude: 31.6, longitude: 74.4 } }), "https://yango.go.link/route?start-lat=31.5&start-lon=74.3&end-lat=31.6&end-lon=74.4");
});

test("rejects invalid Yango coordinates and falls back to the official site", () => {
  assert.equal(buildYangoRouteUrl({ pickup: { lat: 91, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } }), null);
  assert.deepEqual(getYangoLaunchUris({ pickup: {}, destination: {} }), ["https://yango.com/en_pk/"]);
});

test("Bykea exposes the verified official app-link URL without route claims", () => {
  assert.deepEqual(getBykeaLaunchUris(), ["bykea://kl", "https://www.bykea.com/pk/"]);
});

test("attempts openURL even when canOpenURL is false", async () => {
  const events = [];
  const opened = await openFirstAvailable(["verified://first"], {
    canOpenURL: async () => false,
    openURL: async () => undefined,
  }, (event) => events.push(event));
  assert.equal(opened, "verified://first");
  assert.deepEqual(events.filter((event) => event.event === "canOpenURL")[0].result, false);
  assert.equal(events.some((event) => event.event === "openURL" && event.attempted), true);
});

test("openURL rejection reaches the next fallback", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(["verified://first", "verified://second"], {
    canOpenURL: async () => false,
    openURL: async (uri) => { attempted.push(uri); if (uri === "verified://first") throw new Error("handoff failed"); },
  });
  assert.equal(opened, "verified://second");
  assert.deepEqual(attempted, ["verified://first", "verified://second"]);
});

test("invokes Linking methods with their receiver preserved", async () => {
  const linker = {
    prefix: "bound",
    canOpenURL(uri) {
      assert.equal(this.prefix, "bound");
      assert.equal(typeof uri, "string");
      return Promise.resolve(false);
    },
    openURL(uri) {
      assert.equal(this.prefix, "bound");
      assert.equal(typeof uri, "string");
      return Promise.resolve(uri);
    },
  };
  assert.equal(await openFirstAvailable(["verified://bound"], linker), "verified://bound");
});

test("skips malformed non-string candidates without invoking Linking", async () => {
  let invoked = false;
  const events = [];
  const linker = {
    canOpenURL: async () => { invoked = true; return true; },
    openURL: async () => { invoked = true; },
  };
  assert.equal(await openFirstAvailable([undefined, null, ""], linker, (event) => events.push(event)), null);
  assert.equal(invoked, false);
  assert.equal(events.filter((event) => event.event === "invalidCandidate").length, 3);
});
