function coordinate(location, primary, alternate) {
  const value = location?.[primary] ?? location?.[alternate];
  if (typeof value === "string" && value.trim() === "") return Number.NaN;
  return Number(value);
}

function validLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function validLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function locationSnapshot(location) {
  const lat = coordinate(location, "lat", "latitude");
  const lng = coordinate(location, "lng", "longitude");
  if (!validLatitude(lat) || !validLongitude(lng)) return null;
  return Object.freeze({ lat, lng });
}

function buildComparisonRouteSnapshot(comparison) {
  const pickup = locationSnapshot(comparison?.pickup);
  const destination = locationSnapshot(comparison?.dropoff ?? comparison?.destination);
  if (!pickup || !destination) return null;
  if (pickup.lat === destination.lat && pickup.lng === destination.lng) return null;

  return Object.freeze({
    pickup,
    destination,
    comparisonId: comparison?.comparisonId ?? null,
    searchId: comparison?.searchId ?? null,
  });
}

function sameComparisonRoute(first, second) {
  return Boolean(first && second) &&
    first.pickup?.lat === second.pickup?.lat &&
    first.pickup?.lng === second.pickup?.lng &&
    first.destination?.lat === second.destination?.lat &&
    first.destination?.lng === second.destination?.lng;
}

module.exports = {
  buildComparisonRouteSnapshot,
  sameComparisonRoute,
};
