export const VEHICLE_TYPES = ["bike", "rickshaw", "mini", "car"];

function coordinateValue(location, key, alternateKey) {
  const value = location?.[key] ?? location?.[alternateKey];
  return typeof value === "number" ? value : Number(value);
}

export function hasValidCoordinates(location) {
  const lat = coordinateValue(location, "lat", "latitude");
  const lng = coordinateValue(location, "lng", "longitude");
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isSameLocation(a, b) {
  if (!hasValidCoordinates(a) || !hasValidCoordinates(b)) return false;
  return coordinateValue(a, "lat", "latitude") === coordinateValue(b, "lat", "latitude") &&
    coordinateValue(a, "lng", "longitude") === coordinateValue(b, "lng", "longitude");
}

// Returns an error message, or null when the form is valid.
export function validateCompareFareForm({ pickup, dropoff, vehicleType }) {
  if (!pickup) return "Please select a pickup location";
  if (!dropoff) return "Please select a drop-off location";
  if (!vehicleType) return "Please select a vehicle type";
  if (!hasValidCoordinates(pickup)) return "Please select a valid pickup location";
  if (!hasValidCoordinates(dropoff)) return "Please select a valid drop-off location";
  if (isSameLocation(pickup, dropoff)) return "Pickup and drop-off cannot be the same location";
  return null;
}

export function canCompareFares({ pickup, dropoff, vehicleType }) {
  return Boolean(vehicleType) && hasValidCoordinates(pickup) && hasValidCoordinates(dropoff) && !isSameLocation(pickup, dropoff);
}
