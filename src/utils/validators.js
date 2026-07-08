export const VEHICLE_TYPES = ["bike", "rickshaw", "mini", "car"];

export function isSameLocation(a, b) {
  if (!a || !b) return false;
  return a.lat === b.lat && a.lng === b.lng;
}

// Returns an error message, or null when the form is valid.
export function validateCompareFareForm({ pickup, dropoff, vehicleType }) {
  if (!pickup) return "Please select a pickup location";
  if (!dropoff) return "Please select a drop-off location";
  if (!vehicleType) return "Please select a vehicle type";
  if (isSameLocation(pickup, dropoff)) return "Pickup and drop-off cannot be the same location";
  return null;
}

export function canCompareFares({ pickup, dropoff, vehicleType }) {
  return Boolean(pickup && dropoff && vehicleType) && !isSameLocation(pickup, dropoff);
}
