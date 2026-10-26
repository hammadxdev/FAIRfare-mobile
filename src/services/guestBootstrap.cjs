function createGuestBootstrap(createGuest) {
  if (typeof createGuest !== "function") throw new TypeError("createGuest must be a function");
  let inFlight = null;
  return function ensureGuestSession() {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve().then(createGuest).finally(() => { inFlight = null; });
    return inFlight;
  };
}

function shouldCreateGuest(status) {
  return status === "none" || status === "expiredGuest";
}

async function restoreOrCreateGuest({ restore, createGuest }) {
  const status = await restore();
  if (!shouldCreateGuest(status)) return { status };
  return { status: "guestCreated", session: await createGuest() };
}

module.exports = { createGuestBootstrap, shouldCreateGuest, restoreOrCreateGuest };