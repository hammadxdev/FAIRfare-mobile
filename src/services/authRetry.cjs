function isRefreshAuthFailure(error) {
  // Only an auth response from /auth/refresh is conclusive. Network errors,
  // timeouts, and 5xx responses must preserve the locally stored session.
  return error?.response?.status === 401 || error?.response?.status === 403;
}

function createRefreshSingleFlight(refresh) {
  let refreshPromise = null;
  return function refreshOnce(...args) {
    if (!refreshPromise) {
      refreshPromise = Promise.resolve()
        .then(() => refresh(...args))
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  };
}

function withTimeout(promise, timeoutMs, code = "AUTH_OPERATION_TIMEOUT") {
  const duration = Math.max(1, Number(timeoutMs) || 1);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("Authentication operation timed out"), { code })), duration);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createOperationGate() {
  let generation = 0;
  return {
    current() { return generation; },
    invalidate() { generation += 1; return generation; },
    isCurrent(value) { return value === generation; },
  };
}

function shouldRevalidate(lastValidatedAt, now = Date.now(), throttleMs = 60_000) {
  return !Number.isFinite(Number(lastValidatedAt)) || now - Number(lastValidatedAt) >= throttleMs;
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.includes("||") || /\s/.test(raw)) throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL");
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL"); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be an HTTP(S) URL without credentials, query, or hash");
  }
  const path = parsed.pathname.replace(/\/{2,}/g, "/").replace(/(?:\/api)+\/?$/i, "") || "";
  parsed.pathname = `${path}/api`.replace(/\/+/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

module.exports = { isRefreshAuthFailure, createRefreshSingleFlight, withTimeout, createOperationGate, shouldRevalidate, normalizeApiBaseUrl };
