function normalizeCoordinate(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

function toRouteLocation(location) {
  return {
    lat: normalizeCoordinate(location?.lat ?? location?.latitude),
    lng: normalizeCoordinate(location?.lng ?? location?.longitude),
  };
}

module.exports = { normalizeCoordinate, toRouteLocation };
