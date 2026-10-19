function finite(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function validPoint(latitude, longitude) {
  return latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function pointFromValue(value, geoJson = false) {
  if (Array.isArray(value) && value.length >= 2) {
    const first = finite(value[0]);
    const second = finite(value[1]);
    const latitude = geoJson ? second : first;
    const longitude = geoJson ? first : second;
    return validPoint(latitude, longitude) ? { latitude, longitude } : null;
  }
  const latitude = finite(value?.latitude ?? value?.lat);
  const longitude = finite(value?.longitude ?? value?.lng);
  return validPoint(latitude, longitude) ? { latitude, longitude } : null;
}

function decodePolyline(encoded) {
  if (typeof encoded !== "string" || !encoded) return [];
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}

function normalizeRouteCoordinates(route = {}) {
  const geometry = route.geometry || route.route?.geometry || route.feature?.geometry;
  const raw = Array.isArray(route.polylineCoordinates)
    ? route.polylineCoordinates
    : geometry?.type === "LineString"
      ? geometry.coordinates
      : geometry?.type === "MultiLineString"
        ? geometry.coordinates.flat()
        : [];
  const geoJson = Boolean(geometry?.type);
  const points = raw.map((value) => pointFromValue(value, geoJson)).filter(Boolean);
  if (points.length >= 2) return points;
  return decodePolyline(route.encodedPolyline);
}

function extractRouteData(response = {}) {
  if (!response || typeof response !== "object") return {};
  const body = response.data && response.success === undefined ? response.data : response;
  if (body?.success !== undefined && body.data && typeof body.data === "object") return body.data;
  return body?.data && body.distanceKm === undefined && body.durationMin === undefined ? body.data : body;
}

function isValidLocation(location) {
  const latitude = finite(location?.lat ?? location?.latitude);
  const longitude = finite(location?.lng ?? location?.longitude);
  return validPoint(latitude, longitude);
}

function haversineMeters(a, b) {
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function routeGeometryDiagnostics(points, origin, destination) {
  if (!Array.isArray(points) || points.length < 2) return { valid: false, reason: "empty-or-too-few-points", pointCount: 0 };
  if (!points.every((point) => validPoint(point?.latitude, point?.longitude))) {
    return { valid: false, reason: "invalid-point", pointCount: points.length };
  }
  const start = pointFromValue(origin);
  const end = pointFromValue(destination);
  if (!start || !end) return { valid: false, reason: "invalid-endpoint", pointCount: points.length };
  // Routing providers commonly snap endpoints to the nearest routable road.
  // Allow a bounded snap distance, while still requiring a real geometry that
  // reaches both requested endpoints rather than accepting a random line.
  const tolerance = Math.min(5000, Math.max(2000, haversineMeters(start, end) * 0.25));
  const startSnapMeters = haversineMeters(points[0], start);
  const endSnapMeters = haversineMeters(points[points.length - 1], end);
  const valid = startSnapMeters <= tolerance && endSnapMeters <= tolerance;
  return {
    valid,
    reason: valid ? null : "endpoint-snap-too-far",
    pointCount: points.length,
    startSnapMeters,
    endSnapMeters,
    toleranceMeters: tolerance,
  };
}

function validateRouteGeometry(points, origin, destination) {
  return routeGeometryDiagnostics(points, origin, destination).valid;
}

module.exports = { decodePolyline, normalizeRouteCoordinates, extractRouteData, isValidLocation, validPoint, validateRouteGeometry, routeGeometryDiagnostics };
