function isRefreshAuthFailure(error) {
  // Only an auth response from /auth/refresh is conclusive. Network errors,
  // timeouts, and 5xx responses must preserve the locally stored session.
  return error?.response?.status === 401 || error?.response?.status === 403;
}

function createRefreshSingleFlight(refresh) {
  let refreshPromise = null;
  return function refreshOnce() {
    if (!refreshPromise) {
      refreshPromise = Promise.resolve()
        .then(refresh)
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  };
}

module.exports = { isRefreshAuthFailure, createRefreshSingleFlight };
