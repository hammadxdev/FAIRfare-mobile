import apiClient from "./api";
import { toRouteLocation } from "../utils/locationPayload.cjs";

// All map-provider access goes through our backend proxy (/api/maps/*) so
// provider credentials never ship in the app bundle.

export async function autocompletePlaces(input, sessionToken, coordinates, signal) {
  const params = { input, sessionToken };
  if (Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)) {
    params.lat = coordinates.lat;
    params.lng = coordinates.lng;
  }
  const response = await apiClient.get("/maps/autocomplete", { params, signal });
  return response.data;
}

function normalizeIndriveSuggestions(payload) {
  const suggestions = payload?.data?.suggestions;
  if (!Array.isArray(suggestions)) return [];
  return suggestions.map((item) => ({
    id: item.suggestId || item.placeId,
    placeId: item.suggestId || item.placeId,
    mainText: item.address || item.description,
    name: item.address || item.description,
    address: item.description || item.address,
    description: item.description || item.address,
    secondaryText: item.description || "",
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    locality: item.locality || "",
    source: "indrive",
  })).filter((item) => item.id && Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

export async function autocompleteDestination(input, coordinates, signal) {
  const response = await apiClient.post("/locations/indrive/autocomplete", {
    text: input,
    cid: 5388,
    orderTypeId: 2,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    routePointType: "to",
  }, { signal });
  const data = response.data?.data;
  if (data?.status === "auth_required") {
    const error = new Error("Your FareRide session cannot access live location suggestions.");
    error.code = "PROVIDER_AUTH_REQUIRED";
    throw error;
  }
  if (data?.status !== "available" && data?.error) {
    const error = new Error(data.error.message || "Live location suggestions are unavailable.");
    error.code = data.error.code || "PROVIDER_UNAVAILABLE";
    throw error;
  }
  return { data: normalizeIndriveSuggestions(response.data) };
}

export async function getPlaceDetails(placeId, sessionToken) {
  const response = await apiClient.get("/maps/place-details", { params: { placeId, sessionToken } });
  return response.data;
}

export async function reverseGeocode(lat, lng) {
  const response = await apiClient.get("/maps/reverse-geocode", { params: { lat, lng } });
  return response.data;
}

export async function computeRoute(origin, destination, vehicleType) {
  const response = await apiClient.post("/maps/route", {
    origin: toRouteLocation(origin),
    destination: toRouteLocation(destination),
    vehicleType,
  });
  return { ...response.data, __httpStatus: response.status };
}

export async function getMapUsage() {
  const response = await apiClient.get("/maps/usage");
  return response.data;
}

// Provider-specific calls stay behind the same authenticated API client.
// Geoapify remains the primary map search and routing provider until an
// authorized provider contract is configured on the backend.
export async function getIndriveSuggestions(text, coordinates, sessionId, signal) {
  const params = { text, sessionId };
  if (Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)) {
    params.latitude = coordinates.lat;
    params.longitude = coordinates.lng;
  }
  const response = await apiClient.get("/providers/indrive/suggestions", { params, signal });
  return response.data;
}

export async function getIndriveRoute(pickup, destination) {
  const response = await apiClient.post("/providers/indrive/route", { pickup: toRouteLocation(pickup), destination: toRouteLocation(destination) });
  return response.data;
}

export async function getIndriveFareEstimates(payload) {
  const response = await apiClient.post("/providers/indrive/fares", payload);
  return response.data;
}
