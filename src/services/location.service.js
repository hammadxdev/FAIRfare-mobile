import * as Location from "expo-location";

let permissionPromptedThisSession = false;

export async function getForegroundPermission({ request = true } = {}) {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return current.status;
  if (!request || permissionPromptedThisSession) return current.status;
  permissionPromptedThisSession = true;
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status;
}

export async function getCurrentLocation() {
  const status = await getForegroundPermission();

  if (status !== "granted") {
    throw new Error("Location permission was denied. Please enable location access to use this feature.");
  }

  const positionPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    mayShowUserSettingsDialog: true,
  });
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Location request timed out. Please try again.")), 15000);
  });
  let position;
  try {
    position = await Promise.race([positionPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!Number.isFinite(position?.coords?.latitude) || !Number.isFinite(position?.coords?.longitude)) {
    throw new Error("Your device did not return a usable location. Please try again.");
  }

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    timestamp: Number.isFinite(position.timestamp) ? position.timestamp : null,
  };
}
