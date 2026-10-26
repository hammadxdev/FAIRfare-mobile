const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildGeoUri,
  buildIndriveRouteUrl,
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

test("builds the confirmed inDrive booking deep link with pickup and destination", () => {
  assert.equal(buildIndriveRouteUrl({
    pickup: { lat: "31.4650", lng: "74.3001" },
    destination: { latitude: 31.5204, longitude: 74.3587 },
  }), "indrive://open/client/city?start_latitude=31.465&start_longitude=74.3001&end_latitude=31.5204&end_longitude=74.3587");
});

test("supports destination-only inDrive route links and rejects invalid destinations", () => {
  assert.equal(buildIndriveRouteUrl({ destination: { lat: 31.5204, lng: 74.3587 } }), "indrive://open/client/city?end_latitude=31.5204&end_longitude=74.3587");
  assert.equal(buildIndriveRouteUrl({ pickup: { lat: 31.5, lng: 74.3 } }), null);
});

test("uses the inDrive booking link before the direct app and official web fallback", () => {
  assert.deepEqual(getIndriveLaunchUris({ pickup: { lat: "31.5", lng: "74.3" }, destination: { lat: "31.6", lng: "74.4" } }), [
    "indrive://open/client/city?start_latitude=31.5&start_longitude=74.3&end_latitude=31.6&end_longitude=74.4",
    "indrive://open",
    "https://indrive.com/app",
  ]);
});

test("maps only the canonical backend provider IDs to their handoffs", () => {
  assert.equal(getProviderLaunchUris("indrive", { pickup: { lat: 31.5, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } })[0], "indrive://open/client/city?start_latitude=31.5&start_longitude=74.3&end_latitude=31.6&end_longitude=74.4");
  assert.equal(getProviderLaunchUris("quickride")[0], "https://yango.com/en_pk/");
  assert.equal(getProviderLaunchUris("urbancab")[0], "bykea://kl");
  assert.equal(getProviderLaunchUris("Yango", { pickup: { lat: 31.5, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } })[0].startsWith("https://yango.go.link/route?"), true);
  assert.deepEqual(getProviderLaunchUris("Bykea"), getBykeaLaunchUris());
  assert.equal(getProviderLaunchUris("inDrive")[0], "indrive://open");
});

test("never uses non-exported ridepush or autostart routes", () => {
  const uris = getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } });
  assert.equal(uris.some((uri) => uri.includes("ridepush") || uri.includes("autostart")), false);
});

test("failed inDrive custom-scheme launch falls back to its official website", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => { if (uri.startsWith("indrive://")) throw new Error("app launch failed"); },
    },
  );
  assert.equal(opened, "https://indrive.com/app");
  assert.deepEqual(attempted, ["indrive://open/client/city?start_latitude=31.5&start_longitude=74.3&end_latitude=31.6&end_longitude=74.4", "indrive://open", "https://indrive.com/app"]);
});

test("open fallback failure reaches the verified HTTPS app link", async () => {
  const attempted = [];
  const opened = await openFirstAvailable(
    getIndriveLaunchUris({ pickup: { lat: 31.5, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } }),
    {
      canOpenURL: async (uri) => { attempted.push(uri); return true; },
      openURL: async (uri) => {
        if (uri !== "https://indrive.com/app") throw new Error("handoff failed");
      },
    },
  );
  assert.equal(opened, "https://indrive.com/app");
  assert.deepEqual(attempted, ["indrive://open/client/city?start_latitude=31.5&start_longitude=74.3&end_latitude=31.6&end_longitude=74.4", "indrive://open", "https://indrive.com/app"]);
});

test("builds the documented Yango route link with encoded coordinates", () => {
  const parsed = new URL(buildYangoRouteUrl({ pickup: { lat: 31.5, lng: 74.3 }, destination: { latitude: 31.6, longitude: 74.4 } }));
  assert.equal(parsed.searchParams.get("start-lat"), "31.5");
  assert.equal(parsed.searchParams.get("end-lon"), "74.4");
  assert.equal(parsed.searchParams.get("adj_fallback"), "https://yango.com/en_pk/order/?gfrom=74.3%2C31.5&gto=74.4%2C31.6&ref=fairfare");
});

test("preserves the comparison pickup and destination ordering without rounding", () => {
  const url = buildYangoRouteUrl({
    pickup: { lat: "12.3456789", lng: "45.6789012" },
    destination: { lat: "13.4567890", lng: "46.7890123" },
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("start-lat"), "12.3456789");
  assert.equal(parsed.searchParams.get("start-lon"), "45.6789012");
  assert.equal(parsed.searchParams.get("end-lat"), "13.456789");
  assert.equal(parsed.searchParams.get("end-lon"), "46.7890123");
  assert.notEqual(parsed.searchParams.get("start-lat"), parsed.searchParams.get("end-lat"));
});

test("rejects invalid Yango coordinates and falls back to the official site", () => {
  assert.equal(buildYangoRouteUrl({ pickup: { lat: 91, lng: 74.3 }, destination: { lat: 31.6, lng: 74.4 } }), null);
  assert.deepEqual(getYangoLaunchUris({ pickup: {}, destination: {} }), ["https://yango.com/en_pk/"]);
});

test("Bykea exposes the verified official app-link URL without route claims", () => {
  assert.deepEqual(getBykeaLaunchUris(), ["bykea://kl", "https://www.bykea.com/pk/"]);
  assert.deepEqual(getProviderLaunchUris("bykea"), getBykeaLaunchUris());
  assert.deepEqual(getProviderLaunchUris("urbancab"), getBykeaLaunchUris());
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
