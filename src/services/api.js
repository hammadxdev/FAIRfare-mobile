import axios from "axios";

// Never hardcode localhost-only: a physical device/emulator can't always
// reach the dev machine via "localhost". Set EXPO_PUBLIC_API_BASE_URL to
// your machine's LAN IP, e.g. http://192.168.1.10:4000/api
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export async function compareFares(payload) {
  const response = await apiClient.post("/fares/compare", payload);
  return response.data;
}

export async function getProviders() {
  const response = await apiClient.get("/providers");
  return response.data;
}

export async function checkHealth() {
  const response = await apiClient.get("/health");
  return response.data;
}

export { API_BASE_URL };
export default apiClient;
