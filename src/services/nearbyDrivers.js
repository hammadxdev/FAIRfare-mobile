import { getBykeaNearbyDrivers, getIndriveNearbyDrivers, getYangoNearbyDrivers } from "./api";

const BYKEA_SERVICES = [
  ["23", "bike"], ["70", "rickshaw"], ["44", "car"], ["45", "car"], ["48", "car"],
];
const YANGO_CLASSES = [["bike", "bike"], ["car", "car"]];

function validCoordinatePair(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude); const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180
    ? { latitude: lat, longitude: lng } : null;
}
function categoryForIndrive(vehicle) {
  const value = String(vehicle?.vehicleType || vehicle?.normalizedCategory || "").toLowerCase();
  if (value.includes("bike") || value === "moto") return "bike";
  if (value.includes("rickshaw")) return "rickshaw";
  if (value.includes("mini") || String(vehicle?.orderTypeId || vehicle?.categoryId || "") === "33") return "mini";
  if (value.includes("car")) return "car";
  const id = String(vehicle?.orderTypeId || vehicle?.categoryId || "");
  return id === "2" ? "bike" : id === "31" ? "rickshaw" : ["33", "29", "11"].includes(id) ? "car" : null;
}
function normalizeMarkers(items = []) {
  return (Array.isArray(items) ? items : []).flatMap((item) => {
    const point = validCoordinatePair(item?.latitude ?? item?.lat, item?.longitude ?? item?.lng ?? item?.lon);
    if (!point) return [];
    const captured = item?.providerCaptureVerified === true ? providerTimestamp(item?.providerCapturedAt) : null;
    const etaVerified = ["PROVIDER_VERIFIED", "ROUTE_VERIFIED"].includes(String(item?.etaSource || "").toUpperCase());
    const etaSeconds = item?.pickupEtaSeconds == null || item.pickupEtaSeconds === "" ? NaN : Number(item.pickupEtaSeconds);
    return [{ ...point, ...(typeof item?.available === "boolean" ? { available: item.available } : {}), ...(captured ? { providerCapturedAt: captured, providerCaptureVerified: true } : {}), ...(etaVerified && Number.isFinite(etaSeconds) && etaSeconds >= 0 ? { pickupEtaSeconds: etaSeconds, etaSource: String(item.etaSource).toUpperCase() } : {}) }];
  });
}
function providerTimestamp(value) {
  if (value == null || value === "") return null;
  let milliseconds;
  if (typeof value === "number" || (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))) {
    const numeric = Number(value);
    milliseconds = Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
  } else {
    milliseconds = Date.parse(value);
  }
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}
function record(providerId, category, data, markers, receivedAt) {
  const providerCapturedAt = data?.providerCaptureVerified === true ? providerTimestamp(data?.providerCapturedAt) : null;
  const markerCaptureAvailable = markers.some((marker) => marker.providerCaptureVerified === true && marker.providerCapturedAt);
  const providerStatus = String(data?.status || "").trim().toLowerCase();
  const eligibleMarkers = markers.filter((marker) => marker.available !== false);
  const status = providerStatus === "no_drivers"
    ? "no_drivers"
    : ["unavailable", "error", "failed"].includes(providerStatus) || eligibleMarkers.length === 0
      ? "unavailable"
      : "available";
  const providerCategoryId = providerId === "indrive"
    ? data?.orderTypeId ?? data?.categoryId
    : providerId === "bykea"
      ? data?.serviceCode ?? data?.service_code
      : data?.categoryId ?? data?.rideType;
  return {
    providerId, category, status, source: data?.source || "none",
    providerCategoryId: providerCategoryId == null ? null : String(providerCategoryId),
    providerCategoryName: data?.categoryName || data?.providerServiceName || null,
    providerServiceTier: data?.serviceTier || null,
    providerFeatures: Array.isArray(data?.features) ? data.features : [],
    providerCapturedAt, receivedAt, timestampSource: providerCapturedAt || markerCaptureAvailable ? "verified_provider_capture" : "unknown",
    markerCount: markers.length, markers, errorCode: data?.error?.code || null,
  };
}

export async function fetchNearbyDrivers(pickup, { signal, onProviderResult } = {}) {
  const coordinates = validCoordinatePair(pickup?.lat ?? pickup?.latitude, pickup?.lng ?? pickup?.longitude);
  if (!coordinates) throw new Error("Valid pickup coordinates are required for nearby lookup.");
  const specs = [
    { providerId: "indrive", run: () => getIndriveNearbyDrivers(coordinates.latitude, coordinates.longitude, { signal }) },
    ...YANGO_CLASSES.map(([category, rideType]) => ({ providerId: "yango", category, run: () => getYangoNearbyDrivers(coordinates.latitude, coordinates.longitude, rideType, { signal }) })),
    ...BYKEA_SERVICES.map(([serviceCode, category]) => ({ providerId: "bykea", category, serviceCode, run: () => getBykeaNearbyDrivers(coordinates.latitude, coordinates.longitude, serviceCode, { signal }) })),
  ];
  const settled = await Promise.all(specs.map(async (spec) => {
    const publish = (records) => {
      if (typeof onProviderResult === "function") onProviderResult(spec.providerId, records);
      return records;
    };
    try {
      const data = await spec.run();
      const receivedAt = providerTimestamp(data?.receivedAt) ? new Date(providerTimestamp(data.receivedAt)).toISOString() : new Date().toISOString();
      const entries = spec.providerId === "indrive" ? (Array.isArray(data?.vehicles) ? data.vehicles : []) : [data];
      if (spec.providerId === "indrive") {
        if (!entries.length) return publish([record("indrive", "unknown", data, [], receivedAt)]);
        return publish(entries.map((entry) => record("indrive", categoryForIndrive(entry), { ...data, ...entry, status: data?.status || entry?.status, source: data?.source || entry?.source }, normalizeMarkers(entry?.drivers), receivedAt)));
      }
      const markers = spec.providerId === "yango" ? normalizeMarkers(data?.drivers) : normalizeMarkers(data?.partners);
      const resultData = spec.providerId === "bykea" ? { ...data, serviceCode: data?.serviceCode ?? spec.serviceCode } : data;
      return publish([record(spec.providerId, spec.category, resultData, markers, receivedAt)]);
    } catch (error) {
      return publish([{ providerId: spec.providerId, category: spec.category || null, serviceCode: spec.serviceCode || null, status: "unavailable", source: "none", providerCapturedAt: null, receivedAt: new Date().toISOString(), timestampSource: "unknown", markerCount: 0, markers: [], errorCode: error?.response?.data?.errorCode || error?.code || "PROVIDER_UNAVAILABLE" }]);
    }
  }));
  return { pickup: coordinates, capturedAt: new Date().toISOString(), results: settled.flat() };
}
