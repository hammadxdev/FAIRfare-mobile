const RETRYABLE_METHODS = new Set(["get", "head", "options"]);

function isTimeoutError(error) {
  return error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT" || /timeout/i.test(String(error?.message || ""));
}

function classifyApiError(error) {
  const status = Number(error?.response?.status || 0) || null;
  let kind = "unknown";
  let userMessage = "Something went wrong. Please try again.";

  if (status === 401 || status === 403 || error?.code === "SESSION_EXPIRED") {
    kind = "authentication";
    userMessage = "Your session has expired. Please sign in again.";
  } else if (status === 429) {
    kind = "rate_limit";
    userMessage = "Too many requests. Please wait a moment and try again.";
  } else if (status >= 500) {
    kind = "server";
    userMessage = "The service is temporarily unavailable. Please try again.";
  } else if (isTimeoutError(error)) {
    kind = "timeout";
    userMessage = "The request took too long. Please check your connection and try again.";
  } else if (!error?.response) {
    kind = "network";
    userMessage = "We could not connect. Please check your internet connection and try again.";
  } else if (status >= 400) {
    kind = "client";
    userMessage = error?.response?.data?.message || "We could not complete that request.";
  }

  return {
    kind,
    status,
    retryable: kind === "network" || kind === "timeout" || kind === "rate_limit" || kind === "server",
    userMessage,
  };
}

function isRetryableRequest(config) {
  return RETRYABLE_METHODS.has(String(config?.method || "get").toLowerCase());
}

function retryAfterMs(error, fallbackMs) {
  const value = error?.response?.headers?.["retry-after"] ?? error?.response?.headers?.["Retry-After"];
  if (value != null && /^\d+(\.\d+)?$/.test(String(value).trim())) {
    return Math.min(10000, Math.max(0, Number(value) * 1000));
  }
  const date = Date.parse(String(value || ""));
  if (Number.isFinite(date)) return Math.min(10000, Math.max(0, date - Date.now()));
  return fallbackMs;
}

function annotateApiError(error) {
  const details = classifyApiError(error);
  error.fareRideError = details;
  error.kind = details.kind;
  error.userMessage = details.userMessage;
  error.retryable = details.retryable;
  return error;
}

module.exports = { annotateApiError, classifyApiError, isRetryableRequest, retryAfterMs };
