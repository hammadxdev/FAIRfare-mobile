const test = require("node:test");
const assert = require("node:assert/strict");
const { decodePolyline, normalizeRouteCoordinates, extractRouteData, isValidLocation, validateRouteGeometry, routeGeometryDiagnostics } = require("./routeGeometry.cjs");

test("normalizes GeoJSON longitude/latitude order", () => {
  const result = normalizeRouteCoordinates({ geometry: { type: "LineString", coordinates: [[74.3, 31.5], [74.31, 31.51]] } });
  assert.deepEqual(result, [{ latitude: 31.5, longitude: 74.3 }, { latitude: 31.51, longitude: 74.31 }]);
});

test("accepts backend map coordinates and rejects invalid points", () => {
  assert.equal(normalizeRouteCoordinates({ polylineCoordinates: [{ latitude: 31.5, longitude: 74.3 }, { latitude: 31.51, longitude: 74.31 }] }).length, 2);
  assert.equal(isValidLocation({ lat: 999, lng: 74 }), false);
  assert.equal(normalizeRouteCoordinates({ polylineCoordinates: [{ latitude: 0, longitude: 0 }] }).length, 0);
});

test("decodes a standard encoded road polyline", () => {
  assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
});

test("accepts road geometry only when it stays in bounds and reaches both endpoints", () => {
  const points = normalizeRouteCoordinates({ geometry: { type: "LineString", coordinates: [[74.3, 31.5], [74.31, 31.51]] } });
  assert.equal(validateRouteGeometry(points, { lat: 31.5, lng: 74.3 }, { lat: 31.51, lng: 74.31 }), true);
  assert.equal(validateRouteGeometry(points, { lat: 31.5, lng: 74.3 }, { lat: 32, lng: 75 }), false);
});

test("accepts nested GeoJSON geometry and reports bounded endpoint snapping", () => {
  const points = normalizeRouteCoordinates({ route: { geometry: { type: "LineString", coordinates: [[74.3, 31.5], [74.3105, 31.5105]] } } });
  const diagnostics = routeGeometryDiagnostics(points, { lat: 31.5, lng: 74.3 }, { lat: 31.51, lng: 74.31 });
  assert.equal(diagnostics.valid, true);
  assert.equal(diagnostics.pointCount, 2);
  assert.ok(diagnostics.startSnapMeters < diagnostics.toleranceMeters);
  assert.ok(diagnostics.endSnapMeters < diagnostics.toleranceMeters);
});

test("reports unrelated route geometry instead of accepting it", () => {
  const points = normalizeRouteCoordinates({ geometry: { type: "LineString", coordinates: [[73, 32], [73.01, 32.01]] } });
  const diagnostics = routeGeometryDiagnostics(points, { lat: 31.5, lng: 74.3 }, { lat: 31.51, lng: 74.31 });
  assert.equal(diagnostics.valid, false);
  assert.equal(diagnostics.reason, "endpoint-snap-too-far");
});

test("unwraps both API-body and nested Axios-style route responses", () => {
  const route = { distanceKm: 2.1, durationMin: 6, polylineCoordinates: [{ latitude: 31.5, longitude: 74.3 }, { latitude: 31.51, longitude: 74.31 }] };
  assert.deepEqual(extractRouteData({ success: true, data: route }), route);
  assert.deepEqual(extractRouteData({ data: { success: true, data: route } }), route);
});

test("accepts the confirmed 177-point backend route response without changing coordinate order", () => {
  const route = {
    distanceKm: 4.6,
    durationMin: 7,
    polylineCoordinates: Array.from({ length: 177 }, (_, index) => ({
      latitude: 31.47452 + (31.4636 - 31.47452) * (index / 176),
      longitude: 74.4156 + (74.44275 - 74.4156) * (index / 176),
    })),
  };
  const response = extractRouteData({ success: true, data: route });
  const points = normalizeRouteCoordinates(response);
  const diagnostics = routeGeometryDiagnostics(points, { lat: 31.474559870753506, lng: 74.41546671755498 }, { lat: 31.4637789, lng: 74.4431405 });
  assert.equal(points.length, 177);
  assert.equal(diagnostics.valid, true);
  assert.equal(points[0].latitude, 31.47452);
  assert.equal(points[0].longitude, 74.4156);
  assert.equal(Number(response.distanceKm) > 0, true);
  assert.equal(Number(response.durationMin) > 0, true);
});
