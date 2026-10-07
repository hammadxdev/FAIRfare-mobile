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
  const params = new URLSearchParams({
    "start-lat": String(startLat), "start-lon": String(startLon),
    "end-lat": String(endLat), "end-lon": String(endLon),
  });
  return `https://yango.go.link/route?${params.toString()}`;
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
  // The device resolves indrive://open directly to the inDrive client. Generic
  // geo opens the Android chooser on this phone, so it is a lower-priority
  // fallback and is not claimed to prefill pickup or destination.
  const geoUri = buildGeoUri(tripContext.pickup);
  return ["indrive://open", geoUri, "https://indrive.com/app"].filter(Boolean);
}

function getProviderLaunchUris(providerId, tripContext = {}) {
  if (providerId === "indrive") return getIndriveLaunchUris(tripContext);
  if (providerId === "quickride") return getYangoLaunchUris(tripContext);
  if (providerId === "urbancab") return getBykeaLaunchUris();
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
  getProviderLaunchUris,
  hasValidCoordinate,
  normalizeCoordinate,
  openFirstAvailable,
};
