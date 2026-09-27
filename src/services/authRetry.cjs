function isRefreshAuthFailure(error) {
  return error?.response?.status === 401;
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
