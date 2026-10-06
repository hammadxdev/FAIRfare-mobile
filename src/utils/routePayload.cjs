function finiteCoordinate(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object") return null;
  const label = typeof location.label === "string" ? location.label.trim() : "";
  const name = typeof location.name === "string" ? location.name.trim() : "";
  const displayName = name || label;
  const latitude = finiteCoordinate(location.lat ?? location.latitude);
  const longitude = finiteCoordinate(location.lng ?? location.longitude);
  if (!displayName || latitude === null || longitude === null) return null;
  return { name: displayName, address: location.address || displayName, lat: latitude, lng: longitude };
}

function normalizeCompareAgainRoute(route) {
  if (!route || typeof route !== "object") return null;
  const pickup = normalizeLocation(route.pickup);
  const dropoffSource = Object.prototype.hasOwnProperty.call(route, "dropoff") ? route.dropoff : route.destination;
  const dropoff = normalizeLocation(dropoffSource);
  if (!pickup || !dropoff) return null;
  return { pickup, dropoff };
}

module.exports = { normalizeCompareAgainRoute };
