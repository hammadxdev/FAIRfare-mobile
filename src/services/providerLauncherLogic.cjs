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

function getIndriveLaunchUris(tripContext = {}) {
  // Physical-device evidence verifies a generic map-location handoff only.
  // The current handoff uses the explicitly supplied pickup coordinate as its
  // source; this does not claim that inDrive treats it as pickup or destination.
  const geoUri = buildGeoUri(tripContext.pickup);
  return [geoUri, "indrive://open", "https://indrive.com/app"].filter(Boolean);
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
  getIndriveLaunchUris,
  hasValidCoordinate,
  normalizeCoordinate,
  openFirstAvailable,
};
