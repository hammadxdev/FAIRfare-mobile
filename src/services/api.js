import axios from "axios";
import { createRefreshSingleFlight, isRefreshAuthFailure, normalizeApiBaseUrl } from "./authRetry.cjs";
import { annotateApiError, isRetryableRequest, retryAfterMs } from "./apiErrors.cjs";

export const COMPARISON_TIMEOUT_MS = 30000;
export const AI_CHAT_TIMEOUT_MS = 70000;

// This is the only mobile API base URL. Expo inlines EXPO_PUBLIC_* variables
// at bundle time; restart Expo after changing the value.
export const AUTH_RESTORE_TIMEOUT_MS = 8000;

let API_BASE_URL;
try {
  API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
} catch (error) {
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    throw new Error(
      "[FareRide] EXPO_PUBLIC_API_BASE_URL is missing. Set it in mobile/.env.local to the backend URL, including /api.",
    );
  }
  throw new Error(`[FareRide] ${error.message}`);
}

const isDevelopment =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

if (isDevelopment) {
  console.info(`FareRide API: ${API_BASE_URL}`);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

const RETRY_LIMIT = 2;
const retryWait = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(Object.assign(new Error("Request cancelled"), { code: "ERR_CANCELED" })); return; }
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(Object.assign(new Error("Request cancelled"), { code: "ERR_CANCELED" })); }, { once: true });
});

let authHandlers = { getSession: null, refresh: null, signOut: null };
let authSigningOut = false;
let sessionExpiryNotified = false;
export function configureAuth(handlers) { authHandlers = handlers; }
export function setAuthSigningOut(value) { authSigningOut = Boolean(value); }
export function resetSessionExpiryNotification() { sessionExpiryNotified = false; }
const refreshOnce = createRefreshSingleFlight((options) => authHandlers.refresh(options));
apiClient.interceptors.request.use(async (config) => {
  if (config._authDeadlineAt == null && Number.isFinite(Number(config.authDeadlineMs))) {
    config._authDeadlineAt = Date.now() + Number(config.authDeadlineMs);
  }
  if (config._authDeadlineAt != null) {
    const remaining = Number(config._authDeadlineAt) - Date.now();
    if (remaining <= 0) throw Object.assign(new Error("Authentication startup timed out"), { code: "AUTH_RESTORE_TIMEOUT" });
    config.timeout = Math.min(Number(config.timeout) || 15000, remaining);
  }
  if (!config.skipAuth) { const session = await authHandlers.getSession?.(); if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`; }
  return config;
});
apiClient.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  if (error.response?.status === 401 && !config?._authRetried && !config?.skipAuth && !authSigningOut && authHandlers.refresh && !config?.url?.includes("/auth/refresh")) {
    config._authRetried = true;
    try {
      const remaining = config._authDeadlineAt == null ? undefined : Math.max(1, Number(config._authDeadlineAt) - Date.now());
      const session = await refreshOnce({ timeout: remaining, authDeadlineAt: config._authDeadlineAt });
      config.headers.Authorization = `Bearer ${session.accessToken}`;
      return apiClient(config);
    }
    catch (refreshError) {
      const isSessionExpired = isRefreshAuthFailure(refreshError);
      if (isSessionExpired && !sessionExpiryNotified) { sessionExpiryNotified = true; await authHandlers.signOut?.({ reason: "SESSION_EXPIRED", silent: true }); }
      const sessionError = new Error(isSessionExpired ? "Your session has expired. Please sign in again." : "We could not refresh your session because the server is temporarily unavailable. Please try again.");
      sessionError.code = isSessionExpired ? "SESSION_EXPIRED" : "SESSION_REFRESH_UNAVAILABLE";
      sessionError.sessionError = true;
      sessionError.retryable = !isSessionExpired;
      sessionError.cause = refreshError;
      throw annotateApiError(sessionError);
    }
  }
  const details = annotateApiError(error);
  const retryCount = Number(config?._fareRetryCount || 0);
  if (config && details.retryable && isRetryableRequest(config) && retryCount < RETRY_LIMIT && error.code !== "ERR_CANCELED") {
    config._fareRetryCount = retryCount + 1;
    await retryWait(retryAfterMs(error, 250 * 2 ** retryCount), config.signal);
    return apiClient(config);
  }
  throw details;
});

function authData(response) { return response.data.data; }
export async function authRefresh(refreshToken, config = {}) { return authData(await apiClient.post("/auth/refresh", { refreshToken }, { ...config, skipAuth: true })); }
export async function authLogout(refreshToken) { return apiClient.post("/auth/logout", { refreshToken }, { skipAuth: true }); }
export async function requestEmailOtp(email) { return authData(await apiClient.post("/auth/email/otp/request", { email }, { skipAuth: true })); }
export async function verifyEmailOtp(email, code) { return authData(await apiClient.post("/auth/email/otp/verify", { email, code }, { skipAuth: true })); }
export async function authMe(config = {}) { return authData(await apiClient.get("/auth/me", config)); }
export async function updateProfile(name) { return authData(await apiClient.patch("/auth/me", { name })); }
export async function getPreferences() { return authData(await apiClient.get("/preferences")); }
export async function updatePreferences(preferences) { return authData(await apiClient.put("/preferences", preferences)); }

export async function compareFares(payload, config = {}) {
  const response = await apiClient.post("/fares/compare", payload, {
    ...config,
    timeout: COMPARISON_TIMEOUT_MS,
  });
  return response.data;
}

export async function getProviders() {
  const response = await apiClient.get("/providers");
  return response.data;
}

export async function getIndriveNearbyDrivers(latitude, longitude, config = {}) {
  const response = await apiClient.get("/providers/indrive/drivers", { ...config, params: { latitude, longitude }, timeout: 12000 });
  return response.data.data;
}
export async function getYangoNearbyDrivers(latitude, longitude, rideType, config = {}) {
  const response = await apiClient.get("/providers/yango/drivers", { ...config, params: { latitude, longitude, ...(rideType ? { rideType } : {}) }, timeout: 12000 });
  return response.data.data;
}
export async function getBykeaNearbyDrivers(latitude, longitude, serviceCode, config = {}) {
  const response = await apiClient.get("/providers/bykea/drivers", { ...config, params: { latitude, longitude, ...(serviceCode ? { serviceCode } : {}) }, timeout: 12000 });
  return response.data.data;
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
export async function getAiConversation(id, config) { const response = await apiClient.get(`/ai/conversations/${id}`, config); return response.data; }
export async function renameAiConversation(id, title) { const response = await apiClient.patch(`/ai/conversations/${id}`, { title }); return response.data; }
export async function updateAiConversation(id, changes) { const response = await apiClient.patch(`/ai/conversations/${id}`, changes); return response.data; }
export async function deleteAiConversation(id) { const response = await apiClient.delete(`/ai/conversations/${id}`); return response.data; }
export async function askAi(message, comparisonId, conversationId, clientMessageId, config) {
  const response = await apiClient.post("/ai/chat", { message, ...(comparisonId ? { comparisonId } : {}), ...(conversationId ? { conversationId } : {}), ...(clientMessageId ? { clientMessageId } : {}) }, { ...config, timeout: AI_CHAT_TIMEOUT_MS });
  return response.data;
}

export async function checkHealth() {
  const response = await apiClient.get("/health");
  return response.data;
}

export { API_BASE_URL };
export default apiClient;
