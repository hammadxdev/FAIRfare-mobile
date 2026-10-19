const MAX_FIX_AGE_MS = 30 * 1000;
const POOR_ACCURACY_METERS = 50;

function assessLocationFix({ accuracy, timestamp }, now = Date.now()) {
  const accuracyMeters = Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null;
  const timestampMs = Number.isFinite(timestamp) ? timestamp : null;
  const ageMs = timestampMs === null ? null : Math.max(0, now - timestampMs);
  const stale = ageMs === null || ageMs > MAX_FIX_AGE_MS;
  const poorAccuracy = accuracyMeters === null || accuracyMeters > POOR_ACCURACY_METERS;
  let warning = null;
  if (stale && poorAccuracy) warning = "Location fix may be stale and its accuracy is limited. Adjust pickup on the map if needed.";
  else if (stale) warning = "Location fix may be stale. Adjust pickup on the map if needed.";
  else if (poorAccuracy) warning = "Location accuracy is limited. Adjust pickup on the map if needed.";
  return { accuracyMeters, timestampMs, ageMs, stale, poorAccuracy, warning };
}

module.exports = { MAX_FIX_AGE_MS, POOR_ACCURACY_METERS, assessLocationFix };
