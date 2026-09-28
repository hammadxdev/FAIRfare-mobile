import axios from "axios";
import { createRefreshSingleFlight, isRefreshAuthFailure } from "./authRetry.cjs";

// This is the only mobile API base URL. Expo inlines EXPO_PUBLIC_* variables
// at bundle time; restart Expo after changing the value.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "[Fair Fare] EXPO_PUBLIC_API_BASE_URL is missing. Set it in mobile/.env " +
      "to the backend URL, including /api (for example http://10.0.2.2:4000/api).",
  );
}

const isDevelopment =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

if (isDevelopment) {
  console.info(`Fair Fare API: ${API_BASE_URL}`);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let authHandlers = { getSession: null, refresh: null, signOut: null };
let authSigningOut = false;
let sessionExpiryNotified = false;
export function configureAuth(handlers) { authHandlers = handlers; }
export function setAuthSigningOut(value) { authSigningOut = Boolean(value); }
export function resetSessionExpiryNotification() { sessionExpiryNotified = false; }
const refreshOnce = createRefreshSingleFlight(() => authHandlers.refresh());
apiClient.interceptors.request.use(async (config) => {
  if (!config.skipAuth) { const session = await authHandlers.getSession?.(); if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`; }
  return config;
});
apiClient.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  if (error.response?.status !== 401 || config?._authRetried || config?.skipAuth || authSigningOut || !authHandlers.refresh || config?.url?.includes("/auth/refresh")) throw error;
  config._authRetried = true;
  try { const session = await refreshOnce(); config.headers.Authorization = `Bearer ${session.accessToken}`; return apiClient(config); }
  catch (refreshError) {
    const isSessionExpired = isRefreshAuthFailure(refreshError);
    if (isSessionExpired && !sessionExpiryNotified) { sessionExpiryNotified = true; await authHandlers.signOut?.({ reason: "SESSION_EXPIRED", silent: true }); }
    const sessionError = new Error(isSessionExpired ? "Your session has expired. Please sign in again." : "We could not refresh your session because the server is temporarily unavailable. Please try again.");
    sessionError.code = isSessionExpired ? "SESSION_EXPIRED" : "SESSION_REFRESH_UNAVAILABLE";
    sessionError.sessionError = true;
    sessionError.retryable = !isSessionExpired;
    sessionError.cause = refreshError;
    throw sessionError;
  }
});

function authData(response) { return response.data.data; }
export async function authLogin(email, password) { return authData(await apiClient.post("/auth/login", { email, password }, { skipAuth: true })); }
export async function authRegister(name, email, password) { return authData(await apiClient.post("/auth/register", { name, email, password }, { skipAuth: true })); }
export async function authRefresh(refreshToken) { return authData(await apiClient.post("/auth/refresh", { refreshToken }, { skipAuth: true })); }
export async function authLogout(refreshToken) { return apiClient.post("/auth/logout", { refreshToken }, { skipAuth: true }); }
export async function sendVerificationEmail(email) { return authData(await apiClient.post("/auth/email/send-verification", { email }, { skipAuth: true })); }
export async function verifyEmail(email, code) { return authData(await apiClient.post("/auth/email/verify", { email, code }, { skipAuth: true })); }
export async function requestPasswordReset(email) { return authData(await apiClient.post("/auth/forgot-password", { email }, { skipAuth: true })); }
export async function verifyPasswordReset(email, code) { return authData(await apiClient.post("/auth/forgot-password/verify", { email, code }, { skipAuth: true })); }
export async function resetPassword(resetToken, newPassword, confirmPassword = newPassword) { return authData(await apiClient.post("/auth/reset-password", { resetToken, newPassword, confirmPassword }, { skipAuth: true })); }
export async function authMe() { return authData(await apiClient.get("/auth/me")); }
export async function updateProfile(name) { return authData(await apiClient.patch("/auth/me", { name })); }
export async function getPreferences() { return authData(await apiClient.get("/preferences")); }
export async function updatePreferences(preferences) { return authData(await apiClient.put("/preferences", preferences)); }

export async function compareFares(payload) {
  const response = await apiClient.post("/fares/compare", payload);
  return response.data;
}

export async function getProviders() {
  const response = await apiClient.get("/providers");
  return response.data;
}

export async function getProviderStatus() {
  const response = await apiClient.get("/providers/status");
  return response.data;
}

export async function getHistory(id) {
  const response = await apiClient.get(id ? `/history/${id}` : "/history");
  return response.data;
}

export async function getSavedRoutes() {
  const response = await apiClient.get("/saved-routes");
  return response.data;
}

export async function getSavedRoute(id) {
  const response = await apiClient.get(`/saved-routes/${id}`);
  return response.data;
}

export async function createSavedRoute(payload) {
  const response = await apiClient.post("/saved-routes", payload);
  return response.data;
}

export async function updateSavedRoute(id, payload) {
  const response = await apiClient.put(`/saved-routes/${id}`, payload);
  return response.data;
}

export async function deleteSavedRoute(id) {
  const response = await apiClient.delete(`/saved-routes/${id}`);
  return response.data;
}

export async function predictFare(payload) {
  const response = await apiClient.post("/predictions/fare", payload);
  return response.data;
}
export async function listAiConversations() { const response = await apiClient.get("/ai/conversations"); return response.data; }
export async function createAiConversation() { const response = await apiClient.post("/ai/conversations"); return response.data; }
export async function getAiConversation(id) { const response = await apiClient.get(`/ai/conversations/${id}`); return response.data; }
export async function renameAiConversation(id, title) { const response = await apiClient.patch(`/ai/conversations/${id}`, { title }); return response.data; }
export async function updateAiConversation(id, changes) { const response = await apiClient.patch(`/ai/conversations/${id}`, changes); return response.data; }
export async function deleteAiConversation(id) { const response = await apiClient.delete(`/ai/conversations/${id}`); return response.data; }
export async function askAi(message, comparisonId, conversationId) {
  const response = await apiClient.post("/ai/chat", { message, ...(comparisonId ? { comparisonId } : {}), ...(conversationId ? { conversationId } : {}) });
  return response.data;
}

export async function checkHealth() {
  const response = await apiClient.get("/health");
  return response.data;
}

export { API_BASE_URL };
export default apiClient;
