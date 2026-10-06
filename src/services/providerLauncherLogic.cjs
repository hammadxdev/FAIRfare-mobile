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
  // The installed app claims this official HTTPS domain and opens its app, but
  // the device did not prove pickup/destination transfer from Fair Fare.
  return ["https://www.bykea.com/pk/"];
}

function getIndriveLaunchUris(tripContext = {}) {
  // The device resolves indrive://open directly to the inDrive client. Generic
  // geo opens the Android chooser on this phone, so it is a lower-priority
  // fallback and is not claimed to prefill pickup or destination.
  const geoUri = buildGeoUri(tripContext.pickup);
  return ["indrive://open", geoUri, "https://indrive.com/app"].filter(Boolean);
}

async function openFirstAvailable(uris, { canOpenURL, openURL }) {
  for (const uri of uris) {
    try {
      if (!(await canOpenURL(uri))) continue;
      await openURL(uri);
      return uri;
    } catch (error) {
      // Try the next verified/safe fallback.
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
  hasValidCoordinate,
  normalizeCoordinate,
  openFirstAvailable,
};
