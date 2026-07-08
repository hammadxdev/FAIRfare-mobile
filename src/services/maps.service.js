import apiClient from "./api";

// All Google Maps access goes through our backend proxy (/api/maps/*) so the
// Google API key never ships in the app bundle. Never call Google endpoints
// directly from the frontend.

export async function autocompletePlaces(input, sessionToken) {
  const response = await apiClient.get("/maps/autocomplete", { params: { input, sessionToken } });
  return response.data;
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
  const response = await apiClient.post("/maps/route", { origin, destination, vehicleType });
  return response.data;
}

export async function getMapUsage() {
  const response = await apiClient.get("/maps/usage");
  return response.data;
}
