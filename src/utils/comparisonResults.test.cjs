const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { SORT_OPTIONS, INDRIVE_SUGGESTED_FARE_LABEL, haversineKm, nearbyEvidence, pickupEtaLabel, nextNearbyFreshnessExpiry, scheduleNearbyFreshnessExpiry, sortOptionsWithinCategories, fareSourceLabel, createNearbyRequestStore, nextInDriveQuoteExpiry, scheduleInDriveQuoteExpiry } = require("./comparisonResults.cjs");
const now = Date.parse("2026-10-23T12:00:00.000Z");

test("sorting choices are exactly Lowest Price and Nearest, with price first", () => {
  assert.deepEqual(SORT_OPTIONS, [{ value: "price", label: "Lowest Price" }, { value: "nearest", label: "Nearest" }]);
});
test("price sorting stays within each vehicle category and does not mix Bike and Car fares", () => {
  const input = [
    { providerId: "bykea", category: "car", fare: 1800, currency: "PKR" },
    { providerId: "yango", category: "bike", fare: 450, currency: "PKR" },
    { providerId: "indrive", category: "car", fare: 1500, currency: "PKR" },
    { providerId: "indrive", category: "bike", fare: 500, currency: "PKR" },
  ];
  const sorted = sortOptionsWithinCategories(input, "price");
  assert.deepEqual(sorted.map((item) => item.providerId), ["indrive", "bykea", "yango", "indrive"]);
  assert.deepEqual(sorted.map((item) => item.category), ["car", "car", "bike", "bike"]);
});
test("nearest sorting uses valid category-specific marker coordinates and Haversine distance", () => {
  const nearby = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [
    { providerId: "indrive", category: "bike", status: "available", source: "live", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markers: [{ latitude: 31.501, longitude: 74.3 }], markerCount: 1 },
    { providerId: "yango", category: "bike", status: "available", source: "live", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markers: [{ latitude: 31.51, longitude: 74.3 }], markerCount: 1 },
  ] };
  const options = [{ providerId: "yango", category: "bike", fare: 400 }, { providerId: "indrive", category: "bike", fare: 700 }];
  assert.ok(haversineKm(nearby.pickup, nearby.results[0].markers[0]) < haversineKm(nearby.pickup, nearby.results[1].markers[0]));
  assert.deepEqual(sortOptionsWithinCategories(options, "nearest", nearby, now).map((item) => item.providerId), ["indrive", "yango"]);
  assert.deepEqual(nearbyEvidence(nearby, "indrive", "bike", now).nearestMarker, nearby.results[0].markers[0]);
});
test("missing or stale nearby data has no fabricated distance or nearest ranking", () => {
  const options = [{ providerId: "yango", category: "car", fare: 100 }, { providerId: "indrive", category: "car", fare: 200 }];
  assert.equal(nearbyEvidence(null, "yango", "car", now).nearestKm, null);
  assert.deepEqual(sortOptionsWithinCategories(options, "nearest", null, now), options);
  const stale = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [{ providerId: "yango", category: "car", status: "available", source: "live", providerCapturedAt: new Date(now - 120000).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 31.501, longitude: 74.3 }] }] };
  assert.equal(nearbyEvidence(stale, "yango", "car", now).freshness, "stale");
  assert.equal(nearbyEvidence(stale, "yango", "car", now).nearestKm, null);
  const noTimestamp = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [{ providerId: "yango", category: "car", status: "available", source: "live", markerCount: 1, markers: [{ latitude: 31.501, longitude: 74.3 }] }] };
  assert.equal(nearbyEvidence(noTimestamp, "yango", "car", now).freshness, "unknown");
  assert.equal(nearbyEvidence(noTimestamp, "yango", "car", now).nearestKm, null);
  const invalidMarker = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [{ providerId: "yango", category: "rickshaw", status: "available", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 91, longitude: 74.3 }] }] };
  assert.equal(nearbyEvidence(invalidMarker, "yango", "rickshaw", now).nearestKm, null);
});
test("explicitly unavailable markers cannot qualify as nearest despite a verified fresh capture", () => {
  const snapshot = {
    pickup: { latitude: 31.5, longitude: 74.3 },
    results: [{
      providerId: "bykea", category: "bike", status: "available",
      providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture",
      markers: [
        { latitude: 31.5001, longitude: 74.3, available: false },
        { latitude: 31.51, longitude: 74.3, available: true },
      ],
    }],
  };
  const evidence = nearbyEvidence(snapshot, "bykea", "bike", now);
  assert.equal(evidence.nearestMarker.available, true);
  assert.deepEqual(evidence.nearestMarker, { latitude: 31.51, longitude: 74.3, available: true });
  assert.ok(evidence.nearestKm > 0);

  const unavailableOnly = { ...snapshot, results: [{ ...snapshot.results[0], markers: [{ ...snapshot.results[0].markers[0] }] }] };
  const unavailableEvidence = nearbyEvidence(unavailableOnly, "bykea", "bike", now);
  assert.equal(unavailableEvidence.status, "unavailable");
  assert.equal(unavailableEvidence.reason, "MARKERS_UNAVAILABLE");
  assert.equal(unavailableEvidence.nearestKm, null);
  assert.equal(unavailableEvidence.nearestMarker, null);
});
test("lowest price uses positive numeric fares and never sorts missing or invalid values as zero", () => {
  const options = [
    { providerId: "missing", category: "rickshaw", fare: null, currency: "PKR" },
    { providerId: "high", category: "rickshaw", fare: 240, currency: "PKR" },
    { providerId: "low", category: "rickshaw", fare: 140, currency: "PKR" },
    { providerId: "invalid", category: "rickshaw", fare: -1, currency: "PKR" },
  ];
  assert.deepEqual(sortOptionsWithinCategories(options, "price").map((item) => item.providerId), ["low", "high", "missing", "invalid"]);
});
test("inDrive suggested fare disclaimer is a fixed mandatory string", () => {
  assert.equal(INDRIVE_SUGGESTED_FARE_LABEL, "Suggested fare — not an offer from an inDrive driver.");
});

test("suggested fare terminology is restricted to inDrive while other providers retain provenance", () => {
  const quote = { fare: 200, fareType: "NEGOTIABLE", source: "LIVE", isAvailable: true, metadata: { providerCreatedAt: new Date(now - 1_000).toISOString(), providerTtlSeconds: 60 } };
  assert.equal(fareSourceLabel({ ...quote, providerId: "indrive" }, now), "Live Quote");
  assert.equal(fareSourceLabel({ ...quote, providerId: "yango" }, now), "Live Quote");
  assert.equal(fareSourceLabel({ ...quote, providerId: "bykea" }, now), "Live Quote");
  assert.equal(INDRIVE_SUGGESTED_FARE_LABEL, "Suggested fare — not an offer from an inDrive driver.");
});

test("fare provenance labels never present synthetic, cached, historical, predicted or unknown-source fares as live", () => {
  assert.equal(fareSourceLabel({ fare: 100, source: "SYNTHETIC_DATASET", isAvailable: true }), "Synthetic estimate");
  assert.equal(fareSourceLabel({ fare: 100, source: "CACHED", isAvailable: true }), "Cached provider result");
  assert.equal(fareSourceLabel({ fare: 100, source: "HISTORICAL", isAvailable: true }), "Historical fare");
  assert.equal(fareSourceLabel({ fare: 100, source: "PREDICTED", isAvailable: true }), "Predicted estimate");
  assert.equal(fareSourceLabel({ fare: 100, source: "LIVE", fareType: "HISTORICAL", isAvailable: true, providerFreshness: "current" }), "Historical fare");
  assert.equal(fareSourceLabel({ fare: 100, source: "LIVE", fareType: "CACHED", isAvailable: true, providerFreshness: "current" }), "Cached provider result");
  assert.equal(fareSourceLabel({ fare: 100, isAvailable: true }), "Source not verified");
  assert.equal(fareSourceLabel({ fare: 100, source: "REAL", isAvailable: true }), "Source not verified · freshness unavailable");
  assert.equal(fareSourceLabel({ fare: 100, source: "LIVE", isAvailable: true, quoteReceivedAt: now - 120000, metadata: { providerTtlSeconds: 60 } }), "Expired quote");
  assert.equal(fareSourceLabel({ fare: 100, source: "LIVE", isAvailable: false }), "Unavailable");
});
test("inDrive provider expiry uses provider capture time, not backend processing time", () => {
  const providerCreatedAt = new Date(now).toISOString();
  const providerExpiresAt = new Date(now + 300_000).toISOString();
  const current = {
    providerId: "indrive", fare: 163, currency: "PKR", source: "live", fareType: "RECOMMENDED", isAvailable: true,
    metadata: {
      providerCreatedAt,
      providerExpiresAt,
      providerTtlSeconds: 300,
      providerFreshness: "current",
      backendProcessedAt: new Date(now + 1_000).toISOString(),
    },
  };
  assert.equal(fareSourceLabel(current, now + 299_999), "Live Quote");
  assert.equal(fareSourceLabel(current, now + 300_000), "Expired quote");
  assert.equal(fareSourceLabel({ ...current, metadata: { ...current.metadata, providerFreshness: "expired" } }, now + 300_001), "Expired quote");
  assert.equal(fareSourceLabel({ ...current, metadata: { ...current.metadata, providerFreshness: "expired" } }, now), "Expired quote");

  const missingProviderCaptureTime = {
    ...current,
    metadata: { providerTtlSeconds: 300, providerFreshness: "unknown", backendProcessedAt: new Date(now - 299_000).toISOString() },
  };
  assert.equal(fareSourceLabel(missingProviderCaptureTime, now), "Suggested fare · freshness unavailable");
});
test("expiry scheduler selects only the next unexpired inDrive quote in the supplied category", () => {
  const quotes = [
    { providerId: "indrive", category: "bike", fare: 163, isAvailable: true, metadata: { providerCreatedAt: new Date(now).toISOString(), providerTtlSeconds: 300 } },
    { providerId: "indrive", category: "bike", fare: 180, isAvailable: true, metadata: { providerExpiresAt: new Date(now + 90_000).toISOString() } },
    { providerId: "yango", category: "bike", fare: 200, isAvailable: true, metadata: { providerExpiresAt: new Date(now + 10_000).toISOString() } },
    { providerId: "indrive", category: "car", fare: 300, isAvailable: true, metadata: { providerExpiresAt: new Date(now + 5_000).toISOString() } },
    { providerId: "indrive", category: "bike", fare: 100, isAvailable: true, metadata: { providerCreatedAt: new Date(now - 1_000).toISOString(), providerTtlSeconds: 1 } },
  ];
  assert.equal(nextInDriveQuoteExpiry(quotes.slice(0, 3), now), now + 90_000);
  assert.equal(nextInDriveQuoteExpiry(quotes.slice(0, 3), now + 300_000), null);
  assert.equal(fareSourceLabel(quotes[4], now), "Expired quote");
});
test("expiry scheduler uses one timer and returns cleanup for category/data changes and unmount", () => {
  const quote = { providerId: "indrive", fare: 163, isAvailable: true, metadata: { providerExpiresAt: new Date(now + 30_000).toISOString() } };
  const timers = [];
  const cleared = [];
  let expired = 0;
  const cleanup = scheduleInDriveQuoteExpiry([quote], () => { expired += 1; }, {
    now,
    setTimer(callback, delayMs) { const timer = { callback, delayMs }; timers.push(timer); return timer; },
    clearTimer(timer) { cleared.push(timer); },
  });
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delayMs, 30_001);
  timers[0].callback();
  assert.equal(expired, 1);
  cleanup();
  assert.deepEqual(cleared, [timers[0]]);

  const invalidOrMissing = [
    { providerId: "indrive", fare: 163, fareType: "RECOMMENDED", isAvailable: true, metadata: { providerTtlSeconds: 300, backendProcessedAt: new Date(now).toISOString() } },
    { providerId: "indrive", fare: 163, fareType: "RECOMMENDED", isAvailable: true, metadata: { providerCreatedAt: "bad-date", providerTtlSeconds: -1 } },
  ];
  assert.equal(nextInDriveQuoteExpiry(invalidOrMissing, now), null);
  assert.equal(fareSourceLabel(invalidOrMissing[0], now), "Suggested fare · freshness unavailable");
});
test("ResultsScreen returns the one-shot timer cleanup and reschedules for displayed-category data", () => {
  const source = fs.readFileSync(require.resolve("../screens/ResultsScreen.js"), "utf8");
  assert.match(source, /const categoryOptions = useMemo\(\(\) => filterOptions\(options, selectedCategory\), \[options, selectedCategory\]\)/);
  assert.match(source, /useEffect\(\(\) => scheduleInDriveQuoteExpiry\([\s\S]*?\), \[categoryOptions, quoteExpiryRevision\]\);/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
test("nearby store tracks provider loading independently and settles failures without blocking fares", () => {
  const store = createNearbyRequestStore();
  const key = "comparison:test";
  let emissions = 0;
  store.begin(key, { latitude: 31.5, longitude: 74.3 });
  const unsubscribe = store.subscribe(key, () => { emissions += 1; });
  assert.equal(store.get(key).pendingByProvider.indrive, 1);
  assert.equal(store.get(key).pendingByProvider.yango, 2);
  assert.equal(store.get(key).pendingByProvider.bykea, 5);
  store.settle(key, "indrive", [{ providerId: "indrive", category: "bike", status: "available", source: "live", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 31.501, longitude: 74.3 }] }]);
  assert.equal(store.get(key).pendingByProvider.indrive, 0);
  assert.equal(store.get(key).pendingByProvider.bykea, 5);
  store.finish(key, { results: store.get(key).results });
  assert.deepEqual(store.get(key).pendingByProvider, { indrive: 0, yango: 0, bykea: 0 });
  assert.ok(emissions >= 2);
  unsubscribe();
  store.clear(key);
  assert.equal(store.get(key), null);
});
test("partial nearby provider failures leave successful provider/category data intact", () => {
  const store = createNearbyRequestStore();
  const key = "comparison:partial";
  store.begin(key, { latitude: 31.5, longitude: 74.3 });
  store.settle(key, "indrive", [{ providerId: "indrive", category: "rickshaw", status: "available", source: "authorized-api", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 31.501, longitude: 74.3 }] }]);
  store.settle(key, "yango", [{ providerId: "yango", category: "rickshaw", status: "unavailable", source: "none", errorCode: "provider_timeout", markerCount: 0, markers: [] }]);
  const snapshot = store.get(key);
  assert.equal(nearbyEvidence(snapshot, "indrive", "rickshaw", now).nearestKm !== null, true);
  assert.equal(nearbyEvidence(snapshot, "yango", "rickshaw", now).nearestKm, null);
  assert.equal(snapshot.pendingByProvider.bykea, 5);
});

test("fresh records exclude stale and response-received-only markers from nearest results", () => {
  const pickup = { latitude: 31.5, longitude: 74.3 };
  const snapshot = {
    pickup,
    results: [
    { providerId: "yango", category: "car", status: "available", source: "live", providerCapturedAt: new Date(now - 120_000).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 31.5001, longitude: 74.3 }] },
    { providerId: "yango", category: "car", status: "available", source: "live", providerCapturedAt: new Date(now - 10_000).toISOString(), timestampSource: "verified_provider_capture", markerCount: 1, markers: [{ latitude: 31.51, longitude: 74.3 }] },
    { providerId: "yango", category: "car", status: "available", receivedAt: new Date(now).toISOString(), timestampSource: "unknown", markerCount: 1, markers: [{ latitude: 31.50001, longitude: 74.3 }] },
    ],
  };
  const evidence = nearbyEvidence(snapshot, "yango", "car", now);
  assert.equal(evidence.status, "available");
  assert.equal(evidence.freshness, "fresh");
  assert.equal(evidence.markerCount, 1);
  assert.deepEqual(evidence.nearestMarker, { latitude: 31.51, longitude: 74.3 });

  const onlyStale = { pickup, results: [snapshot.results[0]] };
  const staleEvidence = nearbyEvidence(onlyStale, "yango", "car", now);
  assert.equal(staleEvidence.status, "unavailable");
  assert.equal(staleEvidence.freshness, "stale");
  assert.equal(staleEvidence.nearestKm, null);

  const receiptOnly = { pickup, results: [snapshot.results[2]] };
  const unknownEvidence = nearbyEvidence(receiptOnly, "yango", "car", now);
  assert.equal(unknownEvidence.status, "unavailable");
  assert.equal(unknownEvidence.freshness, "unknown");
  assert.equal(unknownEvidence.nearestKm, null);
});

test("pickup ETA is unavailable unless its units and source are explicitly verified", () => {
  const snapshot = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [{ providerId: "bykea", category: "bike", status: "available", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markers: [{ latitude: 31.501, longitude: 74.3, duration: 30, pickupEtaSeconds: 30, etaSource: "UNKNOWN" }] }] };
  const evidence = nearbyEvidence(snapshot, "bykea", "bike", now);
  assert.ok(evidence.nearestKm !== null);
  assert.equal(evidence.pickupEtaSeconds, null);
  assert.equal(evidence.etaSource, null);
  const verified = { ...snapshot, results: [{ ...snapshot.results[0], markers: [{ ...snapshot.results[0].markers[0], pickupEtaSeconds: 120, etaSource: "PROVIDER_VERIFIED" }] }] };
  assert.equal(nearbyEvidence(verified, "bykea", "bike", now).pickupEtaSeconds, 120);
  const nullEta = { ...verified, results: [{ ...verified.results[0], markers: [{ ...verified.results[0].markers[0], pickupEtaSeconds: null }] }] };
  assert.equal(nearbyEvidence(nullEta, "bykea", "bike", now).pickupEtaSeconds, null);
});

test("pickup ETA label is numeric only for the nearest fresh marker with verified ETA provenance", () => {
  assert.equal(pickupEtaLabel(null), "ETA unavailable");
  assert.equal(pickupEtaLabel({ status: "available", nearestMarker: { latitude: 31.5, longitude: 74.3 }, pickupEtaSeconds: 60, etaSource: "UNKNOWN" }), "ETA unavailable");
  const fresh = {
    pickup: { latitude: 31.5, longitude: 74.3 },
    results: [{
      providerId: "yango", category: "car", status: "available",
      providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture",
      markers: [{ latitude: 31.501, longitude: 74.3, pickupEtaSeconds: 121, etaSource: "PROVIDER_VERIFIED" }],
    }],
  };
  assert.equal(pickupEtaLabel(nearbyEvidence(fresh, "yango", "car", now)), "ETA 3 min");
  const stale = { ...fresh, results: [{ ...fresh.results[0], providerCapturedAt: new Date(now - 120_000).toISOString() }] };
  assert.equal(pickupEtaLabel(nearbyEvidence(stale, "yango", "car", now)), "ETA unavailable");
  const unknownCapture = { ...fresh, results: [{ ...fresh.results[0], providerCapturedAt: undefined, timestampSource: "unknown" }] };
  assert.equal(pickupEtaLabel(nearbyEvidence(unknownCapture, "yango", "car", now)), "ETA unavailable");
});

test("nearby freshness schedules one cleanup rerender from verified capture time only", () => {
  const snapshot = { results: [
    { providerId: "yango", receivedAt: new Date(now).toISOString(), timestampSource: "unknown", markers: [{ latitude: 31.5, longitude: 74.3 }] },
    { providerId: "bykea", timestampSource: "verified_provider_capture", providerCapturedAt: new Date(now).toISOString(), markers: [{ latitude: 31.5, longitude: 74.3 }] },
  ] };
  const expiresAt = now + 60_001;
  assert.equal(nextNearbyFreshnessExpiry(snapshot, now), expiresAt);
  const timers = [];
  const cleared = [];
  const cleanup = scheduleNearbyFreshnessExpiry(snapshot, () => {}, {
    now,
    setTimer(callback, delay) { const timer = { callback, delay }; timers.push(timer); return timer; },
    clearTimer(timer) { cleared.push(timer); },
  });
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 60_001);
  cleanup();
  assert.deepEqual(cleared, [timers[0]]);
  assert.equal(nextNearbyFreshnessExpiry(snapshot, expiresAt), null);
});

test("exact provider subtype IDs isolate Nearest and broad car markers cannot stand in for AC or Premium", () => {
  const snapshot = { pickup: { latitude: 31.5, longitude: 74.3 }, results: [
    { providerId: "bykea", category: "car", providerCategoryId: "44", status: "available", providerCapturedAt: new Date(now).toISOString(), timestampSource: "verified_provider_capture", markers: [{ latitude: 31.501, longitude: 74.3 }] },
  ] };
  const ac = { providerId: "bykea", category: "car", categoryId: "44", features: ["AC"], fare: 500 };
  const premium = { providerId: "bykea", category: "car", categoryId: "48", serviceTier: "premium", fare: 700 };
  assert.ok(nearbyEvidence(snapshot, "bykea", "car", now, ac).nearestKm > 0);
  assert.equal(nearbyEvidence(snapshot, "bykea", "car", now, premium).nearestKm, null);
  const sorted = sortOptionsWithinCategories([premium, ac], "nearest", snapshot, now);
  assert.deepEqual(sorted.map(({ categoryId }) => categoryId), ["44", "48"]);
});
