function normalizeCoordinate(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function getCanonicalCoordinate(location, primaryKey, alternateKey) {
  const value = location?.[primaryKey] ?? location?.[alternateKey];
  return normalizeCoordinate(value);
}

function hasValidCoordinate(location) {
  const latitude = getCanonicalCoordinate(location, "lat", "latitude");
  const longitude = getCanonicalCoordinate(location, "lng", "longitude");
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function buildGeoUri(location) {
  if (!hasValidCoordinate(location)) return null;
  const latitude = getCanonicalCoordinate(location, "lat", "latitude");
  const longitude = getCanonicalCoordinate(location, "lng", "longitude");
  return `geo:${latitude},${longitude}`;
}

function buildYangoRouteUrl(tripContext = {}) {
  const pickup = tripContext.pickup || {};
  const destination = tripContext.destination || {};
  if (!hasValidCoordinate(pickup) || !hasValidCoordinate(destination)) return null;
  const startLat = getCanonicalCoordinate(pickup, "lat", "latitude");
  const startLon = getCanonicalCoordinate(pickup, "lng", "longitude");
  const endLat = getCanonicalCoordinate(destination, "lat", "latitude");
  const endLon = getCanonicalCoordinate(destination, "lng", "longitude");
  const fallback = new URL("https://yango.com/en_pk/order/");
  fallback.searchParams.set("gfrom", `${startLon},${startLat}`);
  fallback.searchParams.set("gto", `${endLon},${endLat}`);
  fallback.searchParams.set("ref", "fairfare");
  const params = new URLSearchParams({
    "start-lat": String(startLat), "start-lon": String(startLon),
    "end-lat": String(endLat), "end-lon": String(endLon),
    ref: "fairfare",
    adj_t: "vokme8e_nd9s9z9",
    lang: "en",
    adj_deeplink_js: "1",
    adj_fallback: fallback.toString(),
  });
  return `https://yango.go.link/route?${params.toString()}`;
}

function buildIndriveRouteUrl(tripContext = {}) {
  const pickup = tripContext.pickup || {};
  const destination = tripContext.destination || tripContext.dropoff || {};
  const params = [];

  if (hasValidCoordinate(pickup)) {
    params.push(`start_latitude=${getCanonicalCoordinate(pickup, "lat", "latitude")}`);
    params.push(`start_longitude=${getCanonicalCoordinate(pickup, "lng", "longitude")}`);
  }
  if (hasValidCoordinate(destination)) {
    params.push(`end_latitude=${getCanonicalCoordinate(destination, "lat", "latitude")}`);
    params.push(`end_longitude=${getCanonicalCoordinate(destination, "lng", "longitude")}`);
  }

  return params.length > 0 && hasValidCoordinate(destination)
    ? `indrive://open/client/city?${params.join("&")}`
    : null;
}

function getYangoLaunchUris(tripContext = {}) {
  return [buildYangoRouteUrl(tripContext), "https://yango.com/en_pk/"].filter(Boolean);
}

function getBykeaLaunchUris() {
  // bykea://kl is verified to open the installed Bykea client. Route transfer
  // is intentionally not claimed; the official site remains the fallback.
  return ["bykea://kl", "https://www.bykea.com/pk/"];
}

function getIndriveLaunchUris(tripContext = {}) {
  // The route URI is inDrive's first-party booking deep link. Keep the base
  // app URI as a safe fallback for contexts without a valid destination.
  return [buildIndriveRouteUrl(tripContext), "indrive://open", "https://indrive.com/app"].filter(Boolean);
}

function getProviderLaunchUris(providerId, tripContext = {}) {
  const normalizedId = typeof providerId === "string" ? providerId.trim().toLowerCase() : "";
  if (normalizedId === "indrive") return getIndriveLaunchUris(tripContext);
  if (normalizedId === "quickride" || normalizedId === "yango") return getYangoLaunchUris(tripContext);
  if (normalizedId === "urbancab" || normalizedId === "bykea") return getBykeaLaunchUris();
  return [];
}

function candidateDescription(uri) {
  try {
    const parsed = new URL(uri);
    return { type: parsed.protocol === "https:" ? "https" : "scheme", scheme: parsed.protocol.replace(":", ""), domain: parsed.hostname || null };
  } catch {
    return { type: "unknown", scheme: null, domain: null };
  }
}

async function openFirstAvailable(uris, linker, onEvent = () => {}) {
  for (const uri of uris) {
    if (typeof uri !== "string" || uri.length === 0) {
      const error = new TypeError("Provider launch candidate must be a non-empty string");
      onEvent({ event: "invalidCandidate", uriType: typeof uri, errorName: error.name, errorMessage: error.message });
      continue;
    }
    const candidate = candidateDescription(uri);
    onEvent({ event: "candidate", uri, ...candidate });
    let canOpen = null;
    try {
      canOpen = await linker.canOpenURL(uri);
      onEvent({ event: "canOpenURL", uri, result: canOpen });
    } catch (error) {
      onEvent({ event: "canOpenURL", uri, result: "rejected", errorName: error?.name || "Error", errorMessage: error?.message || String(error) });
    }

    // Android package visibility can make canOpenURL false even though the
    // platform can resolve the URI. It is telemetry/safety information, not a
    // gate for a verified handoff candidate.
    try {
      onEvent({ event: "openURL", uri, attempted: true, canOpenURL: canOpen });
      await linker.openURL(uri);
      onEvent({ event: "openURL", uri, result: "resolved" });
      return uri;
    } catch (error) {
      onEvent({ event: "openURL", uri, result: "rejected", errorName: error?.name || "Error", errorMessage: error?.message || String(error) });
      // Try the next verified/safe fallback after the actual handoff fails.
    }
  }
  return null;
}

module.exports = {
  buildGeoUri,
  buildYangoRouteUrl,
  getYangoLaunchUris,
  getBykeaLaunchUris,
  getIndriveLaunchUris,
  buildIndriveRouteUrl,
  getProviderLaunchUris,
  hasValidCoordinate,
  normalizeCoordinate,
  openFirstAvailable,
};
