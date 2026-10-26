const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");
const { createNearbyRequestStore, nearbyEvidence, sortOptionsWithinCategories } = require("../utils/comparisonResults.cjs");
const { filterOptions } = require("../utils/fareComparison.cjs");

const sourcePath = path.join(__dirname, "nearbyDrivers.js");
const source = fs.readFileSync(sourcePath, "utf8");

function loadNearbyService(api) {
  const transformed = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = module.paths;
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (id) => id === "./api" ? { __esModule: true, ...api } : originalRequire(id);
  loaded._compile(transformed, sourcePath);
  return loaded.exports;
}

function makeApi({ failYangoBike = false, invalidBykeaBike = false, unavailableBykeaBike = false, omitTimestamp = false } = {}) {
  const calls = { indrive: [], yango: [], bykea: [] };
  const providerCapturedAt = new Date().toISOString();
  const response = (field, latitude, invalid = false) => ({
    status: "available",
    source: "authorized-backend",
    ...(omitTimestamp ? {} : { providerCapturedAt, providerCaptureVerified: true }),
    [field]: [{ latitude: invalid ? 91 : latitude, longitude: 74.3 }],
  });
  return {
    calls,
    providerCapturedAt,
    getIndriveNearbyDrivers: async (latitude, longitude, config) => {
      calls.indrive.push({ latitude, longitude, config });
      return { source: "authorized-backend", ...(omitTimestamp ? {} : { providerCapturedAt, providerCaptureVerified: true }), vehicles: [
        { vehicleType: "moto", orderTypeId: 2, drivers: [{ latitude: 31.505, longitude: 74.3 }] },
        { vehicleType: "ECONOMY_CAR", orderTypeId: 33, drivers: [{ latitude: 31.506, longitude: 74.3 }] },
      ] };
    },
    getYangoNearbyDrivers: async (latitude, longitude, rideType, config) => {
      calls.yango.push({ latitude, longitude, rideType, config });
      if (failYangoBike && rideType === "bike") throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
      return { ...response("drivers", rideType === "bike" ? 31.502 : 31.53), rideType: rideType === "bike" ? "moto" : "econom" };
    },
    getBykeaNearbyDrivers: async (latitude, longitude, serviceCode, config) => {
      calls.bykea.push({ latitude, longitude, serviceCode, config });
      const isBike = serviceCode === "23";
      const latitudeForService = isBike ? 31.501 : serviceCode === "70" ? 31.515 : 31.52;
    const result = response("partners", latitudeForService, isBike && invalidBykeaBike);
    if (isBike && unavailableBykeaBike) result.partners[0].available = false;
    return result;
    },
  };
}

test("eight nearby requests publish each category result into subscribed state", async () => {
  const api = makeApi();
  const { fetchNearbyDrivers } = loadNearbyService(api);
  const store = createNearbyRequestStore();
  const requestKey = "nearby:all";
  const pickup = { lat: 31.5, lng: 74.3 };
  store.begin(requestKey, { latitude: pickup.lat, longitude: pickup.lng });
  const callbackCounts = { indrive: 0, yango: 0, bykea: 0 };
  let emissions = 0;
  const unsubscribe = store.subscribe(requestKey, () => { emissions += 1; });

  const result = await fetchNearbyDrivers(pickup, {
    onProviderResult(providerId, records) {
      callbackCounts[providerId] += 1;
      store.settle(requestKey, providerId, records);
    },
  });
  store.finish(requestKey, result);
  unsubscribe();

  assert.equal(api.calls.indrive.length, 1);
  assert.deepEqual(api.calls.yango.map((call) => call.rideType).sort(), ["bike", "car"]);
  assert.deepEqual(api.calls.bykea.map((call) => call.serviceCode).sort(), ["23", "44", "45", "48", "70"]);
  assert.deepEqual(callbackCounts, { indrive: 1, yango: 2, bykea: 5 });
  assert.equal(result.results.length, 9);
  assert.equal(store.get(requestKey).results.length, 9);
  assert.equal(emissions, 9); // Eight provider publications plus the final aggregate notification.
  assert.deepEqual(store.get(requestKey).pendingByProvider, { indrive: 0, yango: 0, bykea: 0 });
  assert.deepEqual(result.results.map((entry) => entry.category).sort(), ["bike", "bike", "bike", "car", "car", "car", "car", "mini", "rickshaw"].sort());
  const indriveMini = result.results.find((entry) => entry.providerId === "indrive" && entry.category === "mini");
  assert.equal(indriveMini.providerCategoryId, "33");
  const bykeaAc = result.results.find((entry) => entry.providerId === "bykea" && entry.providerCategoryId === "44");
  assert.equal(bykeaAc.category, "car");
  const yangoEconomy = result.results.find((entry) => entry.providerId === "yango" && entry.category === "car");
  assert.equal(yangoEconomy.providerCategoryId, "econom");

  const cards = [
    { providerId: "indrive", category: "bike", fare: 500, currency: "PKR", isAvailable: true },
    { providerId: "yango", category: "bike", fare: 400, currency: "PKR", isAvailable: true },
    { providerId: "bykea", category: "bike", fare: 300, currency: "PKR", isAvailable: true },
    { providerId: "indrive", category: "car", fare: 1000, currency: "PKR", isAvailable: true },
  ];
  const bikeCards = filterOptions(cards, "bike");
  const asOf = Date.parse(api.providerCapturedAt) + 1000;
  const nearest = sortOptionsWithinCategories(bikeCards, "nearest", store.get(requestKey), asOf);
  assert.deepEqual(nearest.map((item) => item.providerId), ["bykea", "yango", "indrive"]);
  assert.deepEqual(sortOptionsWithinCategories(bikeCards, "price").map((item) => item.providerId), ["bykea", "yango", "indrive"]);
  assert.equal(nearbyEvidence(store.get(requestKey), "bykea", "car", asOf).nearestKm !== null, true);
});

test("one provider failure publishes unavailable data while preserving successful categories", async () => {
  const api = makeApi({ failYangoBike: true });
  const { fetchNearbyDrivers } = loadNearbyService(api);
  const store = createNearbyRequestStore();
  const requestKey = "nearby:partial";
  store.begin(requestKey, { latitude: 31.5, longitude: 74.3 });
  const result = await fetchNearbyDrivers({ lat: 31.5, lng: 74.3 }, {
    onProviderResult(providerId, records) { store.settle(requestKey, providerId, records); },
  });
  store.finish(requestKey, result);

  assert.equal(result.results.length, 9);
  assert.equal(nearbyEvidence(store.get(requestKey), "yango", "bike").status, "unavailable");
  assert.equal(nearbyEvidence(store.get(requestKey), "yango", "bike").nearestKm, null);
  assert.equal(nearbyEvidence(store.get(requestKey), "yango", "car").status, "available");
  assert.equal(nearbyEvidence(store.get(requestKey), "indrive", "bike").status, "available");
});

test("invalid marker coordinates and missing provider timestamps cannot imply current availability", async () => {
  assert.equal(require("../utils/comparisonResults.cjs").validCoordinatePair(null, null), null);
  const api = makeApi({ invalidBykeaBike: true, omitTimestamp: true });
  const { fetchNearbyDrivers } = loadNearbyService(api);
  const result = await fetchNearbyDrivers({ lat: 31.5, lng: 74.3 });
  const bike = result.results.find((entry) => entry.providerId === "bykea" && entry.category === "bike");

  assert.equal(bike.markerCount, 0);
  assert.equal(bike.status, "unavailable");
  assert.equal(bike.providerCapturedAt, null);
  assert.equal(bike.timestampSource, "unknown");
  const evidence = nearbyEvidence({ pickup: result.pickup, results: result.results }, "bykea", "bike", Date.parse(result.capturedAt) + 1000);
  assert.equal(evidence.status, "unavailable");
  assert.equal(evidence.freshness, "unknown");
  assert.equal(evidence.nearestKm, null);
});

test("explicitly unavailable provider markers stay unavailable and are excluded from nearest sorting", async () => {
  const api = makeApi({ unavailableBykeaBike: true });
  const { fetchNearbyDrivers } = loadNearbyService(api);
  const result = await fetchNearbyDrivers({ lat: 31.5, lng: 74.3 });
  const bike = result.results.find((entry) => entry.providerId === "bykea" && entry.category === "bike");

  assert.equal(bike.providerCapturedAt, api.providerCapturedAt);
  assert.equal(bike.status, "unavailable");
  assert.equal(bike.markers[0].available, false);
  const snapshot = { pickup: result.pickup, results: result.results };
  const evidence = nearbyEvidence(snapshot, "bykea", "bike", Date.parse(api.providerCapturedAt) + 1000);
  assert.equal(evidence.nearestKm, null);
  assert.equal(evidence.reason, "MARKERS_UNAVAILABLE");

  const options = [
    { providerId: "bykea", category: "bike", fare: 250, currency: "PKR" },
    { providerId: "yango", category: "bike", fare: 300, currency: "PKR" },
  ];
  const sorted = sortOptionsWithinCategories(options, "nearest", snapshot, Date.parse(api.providerCapturedAt) + 1000);
  assert.deepEqual(sorted.map((option) => option.providerId), ["yango", "bykea"]);
});

test("nearby result subtype IDs remain available for exact fare-category matching", async () => {
  const api = makeApi();
  const { fetchNearbyDrivers } = loadNearbyService(api);
  const result = await fetchNearbyDrivers({ lat: 31.5, lng: 74.3 });
  const now = Date.parse(api.providerCapturedAt) + 1000;
  const indriveMini = result.results.find((entry) => entry.providerId === "indrive" && entry.category === "mini");
  const bykeaAc = result.results.find((entry) => entry.providerId === "bykea" && entry.providerCategoryId === "44");
  assert.ok(nearbyEvidence({ pickup: result.pickup, results: result.results }, "indrive", "mini", now, { categoryId: "33" }).nearestKm > 0);
  assert.ok(nearbyEvidence({ pickup: result.pickup, results: result.results }, "bykea", "car", now, { categoryId: "44", features: ["AC"] }).nearestKm > 0);
  assert.equal(indriveMini.providerCategoryId, "33");
  assert.equal(bykeaAc.providerCategoryId, "44");
  assert.equal(nearbyEvidence({ pickup: result.pickup, results: result.results }, "bykea", "car", now, { categoryId: "47", serviceTier: "premium" }).nearestKm, null);
});
