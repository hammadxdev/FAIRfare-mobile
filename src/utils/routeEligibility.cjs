function text(value) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
const { cityIdentity } = require("./cityIdentity.cjs");

function cityOf(location) {
  return text(location?.city || location?.town || location?.municipality || location?.cityName);
}

function locationIdentity(location) {
  const identity = cityIdentity(location);
  return {
    id: location?.placeId || location?.id || null,
    name: text(location?.name),
    city: identity.raw,
    canonicalCity: identity.canonical,
    lat: Number.isFinite(Number(location?.lat)) ? Number(location.lat) : null,
    lng: Number.isFinite(Number(location?.lng)) ? Number(location.lng) : null,
  };
}

function coordinateDistanceKm(origin, destination) {
  if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(destination.lat - origin.lat);
  const dLng = radians(destination.lng - origin.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assessRouteEligibility({ pickup, dropoff, route, explicitIntercity = false } = {}) {
  const origin = locationIdentity(pickup);
  const destination = locationIdentity(dropoff);
  const diagnostics = {
    coordinateDistanceKm: coordinateDistanceKm(origin, destination),
    routeDistanceKm: Number.isFinite(Number(route?.distanceKm)) ? Number(route.distanceKm) : null,
    routeRequestId: route?.requestId ?? null,
  };
  const routeValid = Boolean(route?.geometryAvailable && Number.isFinite(Number(route?.distanceKm)) && Number(route.distanceKm) > 0 && Number.isFinite(Number(route?.durationMin)) && Number(route.durationMin) > 0 && route?.requestId != null);
  if (!routeValid) return { eligible: false, reason: "ROUTE_NOT_VERIFIED", origin, destination, diagnostics };
  // Coordinates and the verified road route are the source of truth for fare
  // comparison. Display labels and city metadata are optional enrichment and
  // must not block a valid provider request.
  return { eligible: true, reason: explicitIntercity ? "EXPLICIT_INTERCITY" : "COORDINATES_AND_ROUTE_VALID", origin, destination, diagnostics };
}

module.exports = { cityOf, locationIdentity, assessRouteEligibility };
