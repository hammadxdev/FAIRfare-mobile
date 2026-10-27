const NEARBY_STALE_AFTER_MS = 60_000;
const SORT_OPTIONS = Object.freeze([{ value: "price", label: "Lowest Price" }, { value: "nearest", label: "Nearest" }]);
const INDRIVE_SUGGESTED_FARE_LABEL = "Suggested fare — not an offer from an inDrive driver.";

function validCoordinatePair(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude); const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180 ? { latitude: lat, longitude: lng } : null;
}
function haversineKm(from, to) {
  const a = validCoordinatePair(from?.latitude ?? from?.lat, from?.longitude ?? from?.lng);
  const b = validCoordinatePair(to?.latitude ?? to?.lat, to?.longitude ?? to?.lng);
  if (!a || !b) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude); const dLng = radians(b.longitude - a.longitude);
  const part = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(part), Math.sqrt(Math.max(0, 1 - part)));
}
function canonicalCategory(value) {
  const key = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  if (key === "bike" || key === "moto" || key === "motorcycle") return "bike";
  if (key === "rickshaw" || key === "auto") return "rickshaw";
  if (["car", "economy_car", "standard_car", "premium_car"].includes(key)) return "car";
  if (key === "mini") return "mini";
  return "unknown";
}
function canonicalProvider(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["quickride", "yango"].includes(key)) return "yango";
  if (["urbancab", "bykea"].includes(key)) return "bykea";
  return key;
}
function nearbyEvidence(snapshot, providerId, category, now = Date.now(), fareOption = null) {
  const provider = canonicalProvider(providerId); const normalized = canonicalCategory(category);
  const unavailable = { status: "unavailable", source: "none", reason: "NO_DATA", markerCount: 0, nearestKm: null, nearestMarker: null, providerCapturedAt: null, pickupEtaSeconds: null, etaSource: null, freshness: "unknown" };
  if (!snapshot || normalized === "unknown" || !Array.isArray(snapshot.results)) return unavailable;
  const rawServiceId = fareOption?.categoryId ?? fareOption?.serviceCode ?? fareOption?.service_code;
  const hasExactServiceId = rawServiceId !== undefined && rawServiceId !== null && String(rawServiceId).trim() !== "";
  const subtypeRequiresIdentity = normalized === "mini"
    || (Array.isArray(fareOption?.features) && fareOption.features.some((feature) => String(feature).toUpperCase() === "AC"))
    || String(fareOption?.serviceTier || "").toLowerCase() === "premium";
  const matches = snapshot.results.filter((item) => {
    if (canonicalProvider(item.providerId || item.provider) !== provider || canonicalCategory(item.category || item.vehicleType) !== normalized) return false;
    const nearbyServiceId = item.providerCategoryId ?? item.categoryId ?? item.serviceCode ?? item.service_code;
    if (hasExactServiceId) return nearbyServiceId != null && String(nearbyServiceId) === String(rawServiceId);
    return !subtypeRequiresIdentity;
  });
  if (!matches.length && subtypeRequiresIdentity) return { ...unavailable, reason: "SUBTYPE_IDENTITY_UNAVAILABLE" };
  if (!matches.length) return unavailable;

  const candidates = matches.flatMap((item) => (Array.isArray(item.markers) ? item.markers : []).map((marker) => {
    const capturedAt = (marker?.providerCaptureVerified === true ? timestampMillis(marker.providerCapturedAt) : null)
      ?? (item.timestampSource === "verified_provider_capture" ? timestampMillis(item.providerCapturedAt) : null);
    const stale = capturedAt !== null && (now - capturedAt > NEARBY_STALE_AFTER_MS || capturedAt > now + 30_000);
    const point = validCoordinatePair(marker?.latitude, marker?.longitude);
    const etaSource = String(marker?.etaSource || "").toUpperCase();
    const etaSeconds = marker?.pickupEtaSeconds == null || marker.pickupEtaSeconds === "" ? NaN : Number(marker.pickupEtaSeconds);
    const normalizedMarker = point ? { ...point, ...(typeof marker?.available === "boolean" ? { available: marker.available } : {}), ...(Number.isFinite(etaSeconds) && etaSeconds >= 0 && ["PROVIDER_VERIFIED", "ROUTE_VERIFIED"].includes(etaSource) ? { pickupEtaSeconds: etaSeconds, etaSource } : {}) } : null;
    return { item, marker: normalizedMarker, capturedAt, stale };
  }).filter((entry) => entry.marker));
  const freshPositions = candidates.filter((entry) => entry.capturedAt !== null && !entry.stale);
  const staleEntries = candidates.filter((entry) => entry.capturedAt !== null && entry.stale);
  const unknownEntries = candidates.filter((entry) => entry.capturedAt === null);
  const fresh = freshPositions.filter((entry) => entry.marker.available !== false && String(entry.item.status || "").toLowerCase() === "available");
  const selected = fresh.length ? fresh : staleEntries.length ? staleEntries : unknownEntries;
  const selectedItems = matches;
  const markerCount = selected.length;
  const observedTimes = freshPositions.map((entry) => entry.capturedAt).filter(Number.isFinite);
  const newest = observedTimes.length ? Math.max(...observedTimes) : null;
  const freshness = freshPositions.length ? "fresh" : staleEntries.length ? "stale" : "unknown";
  const validPickup = validCoordinatePair(snapshot.pickup?.latitude, snapshot.pickup?.longitude);
  const nearest = freshness === "fresh" && validPickup
    ? fresh.reduce((best, entry) => {
      const distance = haversineKm(validPickup, entry.marker);
      return distance !== null && (best === null || distance < best.distance) ? { ...entry, distance } : best;
    }, null)
    : null;
  const status = nearest !== null
    ? "available"
    : freshness === "fresh" && selectedItems.some((item) => String(item.status || "").toLowerCase() === "no_drivers")
      ? "no_drivers"
      : "unavailable";
  const reason = nearest !== null ? null
    : candidates.length > 0 && candidates.every((entry) => entry.marker.available === false) ? "MARKERS_UNAVAILABLE"
      : freshPositions.length > 0 ? "NO_ELIGIBLE_MARKER"
        : staleEntries.length > 0 ? "STALE_POSITION"
          : unknownEntries.length > 0 ? "CAPTURE_TIME_UNKNOWN"
            : selectedItems.some((item) => item.errorCode) ? "PROVIDER_ERROR"
              : "NO_MARKER";
  const source = selectedItems.find((item) => item.source && item.source !== "none")?.source || "none";
  const errorCode = selectedItems.find((item) => item.errorCode)?.errorCode || null;

  return {
    status, source, reason, markerCount, nearestKm: nearest?.distance ?? null,
    nearestMarker: nearest?.marker || null,
    providerCapturedAt: newest === null ? null : new Date(newest).toISOString(),
    pickupEtaSeconds: nearest && ["PROVIDER_VERIFIED", "ROUTE_VERIFIED"].includes(String(nearest.marker.etaSource || "").toUpperCase()) && Number.isFinite(Number(nearest.marker.pickupEtaSeconds)) ? Number(nearest.marker.pickupEtaSeconds) : null,
    etaSource: nearest?.marker?.etaSource || null,
    freshness, errorCode,
  };
}
function timestampMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value) < 1e12 ? value * 1000 : value;
  if (typeof value !== "string" || !value.trim()) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function providerQuoteExpiresAt(option = {}) {
  const metadata = option.metadata || {};
  const explicitExpiry = timestampMillis(metadata.providerExpiresAt ?? option.providerExpiresAt);
  if (explicitExpiry !== null) return explicitExpiry;
  const createdAt = timestampMillis(metadata.providerCreatedAt ?? option.providerCreatedAt);
  const ttlValue = metadata.providerTtlSeconds ?? option.providerTtlSeconds;
  return createdAt !== null && typeof ttlValue === "number" && Number.isFinite(ttlValue) && ttlValue >= 0
    ? createdAt + ttlValue * 1000
    : null;
}

function nextInDriveQuoteExpiry(options = [], now = Date.now()) {
  let nextExpiry = null;
  for (const option of options) {
    if (canonicalProvider(option.providerId || option.provider?.name || option.provider?.id) !== "indrive") continue;
    if (String(option.metadata?.providerFreshness || option.providerFreshness || "").toLowerCase() === "expired") continue;
    const fare = Number(option.fare);
    if (option.isAvailable === false || !Number.isFinite(fare) || fare <= 0) continue;
    const expiresAt = providerQuoteExpiresAt(option);
    if (expiresAt !== null && expiresAt > now && (nextExpiry === null || expiresAt < nextExpiry)) nextExpiry = expiresAt;
  }
  return nextExpiry;
}

function scheduleInDriveQuoteExpiry(options, onExpire, { now = Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const expiresAt = nextInDriveQuoteExpiry(options, now);
  if (expiresAt === null || typeof onExpire !== "function") return () => {};
  const delayMs = Math.min(Math.max(0, expiresAt - now) + 1, 2_147_483_647);
  const timer = setTimer(onExpire, delayMs);
  return () => clearTimer(timer);
}

function fareSourceLabel(option = {}, now = Date.now()) {
  const source = String(option.source || option.dataSource || option.metadata?.dataSource || option.provenance || "").trim().toUpperCase();
  const type = String(option.priceType || option.fareType || option.metadata?.priceType || "").trim().toUpperCase();
  const fare = Number(option.fare);
  if (option.isAvailable === false || !Number.isFinite(fare) || fare <= 0) return "Unavailable";
  const isLiveSource = ["REAL", "LIVE", "LIVE_PROVIDER", "PROVIDER_QUOTE"].includes(source);
  const isInDriveSuggested = canonicalProvider(option.providerId || option.provider?.name || option.provider?.id) === "indrive"
    && (["SUGGESTED", "NEGOTIABLE", "RECOMMENDED"].includes(type) || option.isNegotiable === true);
  let label = "Fare estimate";
  if (source.includes("SYNTHETIC")) label = "Synthetic estimate";
  else if (source.includes("HISTORICAL") || type.includes("HISTORICAL")) label = "Historical fare";
  else if (source.includes("CACHED") || type.includes("CACHED")) label = "Cached provider result";
  else if (source.includes("PREDICT") || type.includes("PREDICT")) label = "Predicted estimate";
  else if (isInDriveSuggested) label = "Suggested fare";
  else if (isLiveSource) label = "Live Quote";

  const metadata = option.metadata || {};
  const ttlValue = metadata.providerTtlSeconds ?? option.providerTtlSeconds;
  const ttlSeconds = typeof ttlValue === "number" ? ttlValue : null;
  const providerCreatedAt = timestampMillis(metadata.providerCreatedAt ?? option.providerCreatedAt);
  const providerExpiresAt = providerQuoteExpiresAt(option);
  const explicitFreshness = String(metadata.providerFreshness || option.providerFreshness || "").toLowerCase();
  let freshness = explicitFreshness === "expired" ? "expired" : null;

  if (freshness === null && providerExpiresAt !== null) freshness = now >= providerExpiresAt ? "expired" : "current";
  else if (freshness === null && providerCreatedAt !== null && ttlSeconds !== null && ttlSeconds >= 0) {
    freshness = now >= providerCreatedAt + ttlSeconds * 1000 ? "expired" : "current";
  } else if (freshness === null && ["current", "unknown"].includes(explicitFreshness)) freshness = explicitFreshness;
  // Backward compatibility for callers that already provide a receipt time.
  // New inDrive responses use providerCreatedAt; backendProcessedAt is never
  // substituted for provider capture time because that could hide stale data.
  if (freshness === null && metadata.backendProcessedAt == null && providerCreatedAt === null && providerExpiresAt === null && ttlSeconds !== null && ttlSeconds >= 0) {
    const receivedAt = timestampMillis(option.quoteReceivedAt);
    if (receivedAt !== null) freshness = now >= receivedAt + ttlSeconds * 1000 ? "expired" : "current";
  }

  if (freshness === "expired") {
    return "Expired quote";
  }
  if (freshness === "unknown" || (ttlSeconds !== null && providerCreatedAt === null && providerExpiresAt === null && metadata.backendProcessedAt != null)) {
    return label;
  }
  if ((label === "Live Quote" || (label === "Suggested fare" && isLiveSource && isInDriveSuggested)) && freshness !== "current") {
    return label;
  }
  if (isLiveSource && freshness === "current" && (label === "Live Quote" || (label === "Suggested fare" && isInDriveSuggested))) return "Live Quote";
  return label;
}
function sortOptionsWithinCategories(options = [], sort = "price", nearby = null, now = Date.now()) {
  const groups = new Map();
  for (const option of options) {
    const category = canonicalCategory(option.category || option.vehicleCategory);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(option);
  }
  return [...groups.values()].flatMap((group) => {
    const indexed = group.map((option, index) => ({ option, index }));
    indexed.sort((a, b) => {
      if (sort === "nearest") {
        const da = nearbyEvidence(nearby, a.option.providerId || a.option.provider?.name || a.option.provider?.id, a.option.category || a.option.vehicleCategory, now, a.option).nearestKm;
        const db = nearbyEvidence(nearby, b.option.providerId || b.option.provider?.name || b.option.provider?.id, b.option.category || b.option.vehicleCategory, now, b.option).nearestKm;
        if (da === null && db !== null) return 1;
        if (da !== null && db === null) return -1;
        if (da !== null && db !== null && Math.abs(da - db) > 1e-9) return da - db;
      } else {
        const currencyA = String(a.option.currency || "").toUpperCase(); const currencyB = String(b.option.currency || "").toUpperCase();
        const fareA = Number(a.option.fare); const fareB = Number(b.option.fare);
        const validA = Number.isFinite(fareA) && fareA > 0; const validB = Number.isFinite(fareB) && fareB > 0;
        if (validA !== validB) return validA ? -1 : 1;
        if (validA && validB && currencyA && currencyA === currencyB && fareA !== fareB) return fareA - fareB;
      }
      return a.index - b.index;
    });
    return indexed.map(({ option }) => option);
  });
}

function pickupEtaLabel(evidence) {
  if (evidence?.status !== "available" || !evidence.nearestMarker
    || !Number.isFinite(evidence.pickupEtaSeconds) || evidence.pickupEtaSeconds < 0
    || !["PROVIDER_VERIFIED", "ROUTE_VERIFIED"].includes(String(evidence.etaSource || "").toUpperCase())) return "ETA unavailable";
  return `ETA ${Math.ceil(evidence.pickupEtaSeconds / 60)} min`;
}

function nextNearbyFreshnessExpiry(snapshot, now = Date.now()) {
  let nextExpiry = null;
  for (const item of snapshot?.results || []) {
    for (const marker of Array.isArray(item?.markers) ? item.markers : []) {
      const capturedAt = (marker?.providerCaptureVerified === true ? timestampMillis(marker.providerCapturedAt) : null)
        ?? (item.timestampSource === "verified_provider_capture" ? timestampMillis(item.providerCapturedAt) : null);
      if (capturedAt === null || capturedAt > now + 30_000) continue;
      const expiresAt = capturedAt + NEARBY_STALE_AFTER_MS + 1;
      if (expiresAt > now && (nextExpiry === null || expiresAt < nextExpiry)) nextExpiry = expiresAt;
    }
  }
  return nextExpiry;
}

function scheduleNearbyFreshnessExpiry(snapshot, onExpire, { now = Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const expiresAt = nextNearbyFreshnessExpiry(snapshot, now);
  if (expiresAt === null || typeof onExpire !== "function") return () => {};
  const timer = setTimer(onExpire, Math.min(Math.max(0, expiresAt - now), 2_147_483_647));
  return () => clearTimer(timer);
}

const NEARBY_PENDING_COUNTS = Object.freeze({ indrive: 1, yango: 2, bykea: 5 });
function createNearbyRequestStore() {
  const requests = new Map();
  const listeners = new Map();
  function emit(key) { for (const listener of listeners.get(key) || []) listener(requests.get(key)); }
  return {
    begin(key, pickup) {
      requests.set(key, { pickup, capturedAt: null, results: [], pendingByProvider: { ...NEARBY_PENDING_COUNTS } });
      emit(key);
    },
    get(key) { return requests.get(key) || null; },
    subscribe(key, listener) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(listener);
      return () => { const items = listeners.get(key); items?.delete(listener); if (items?.size === 0) listeners.delete(key); };
    },
    settle(key, providerId, records = []) {
      const current = requests.get(key);
      if (!current) return null;
      const pending = { ...current.pendingByProvider, [providerId]: Math.max(0, (current.pendingByProvider[providerId] || 0) - 1) };
      const next = { ...current, results: [...current.results, ...records], pendingByProvider: pending };
      requests.set(key, next); emit(key); return next;
    },
    finish(key, snapshot = {}) {
      const current = requests.get(key);
      if (!current) return null;
      const next = { ...current, ...snapshot, pickup: snapshot.pickup || current.pickup, results: Array.isArray(snapshot.results) ? snapshot.results : current.results, capturedAt: snapshot.capturedAt || new Date().toISOString(), pendingByProvider: { indrive: 0, yango: 0, bykea: 0 } };
      requests.set(key, next); emit(key); return next;
    },
    clear(key) { requests.delete(key); listeners.delete(key); },
  };
}
const nearbyRequestStore = createNearbyRequestStore();
module.exports = { NEARBY_STALE_AFTER_MS, SORT_OPTIONS, INDRIVE_SUGGESTED_FARE_LABEL, createNearbyRequestStore, nearbyRequestStore, validCoordinatePair, haversineKm, canonicalCategory, canonicalProvider, nearbyEvidence, pickupEtaLabel, nextNearbyFreshnessExpiry, scheduleNearbyFreshnessExpiry, providerQuoteExpiresAt, nextInDriveQuoteExpiry, scheduleInDriveQuoteExpiry, fareSourceLabel, sortOptionsWithinCategories };
