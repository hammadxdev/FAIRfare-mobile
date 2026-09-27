import * as Location from "expo-location";

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Location permission was denied. Please enable location access to use this feature.");
  }

  const positionPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    mayShowUserSettingsDialog: true,
  });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Location request timed out. Please try again.")), 15000);
  });
  const position = await Promise.race([positionPromise, timeoutPromise]);

  if (!Number.isFinite(position?.coords?.latitude) || !Number.isFinite(position?.coords?.longitude)) {
    throw new Error("Your device did not return a usable location. Please try again.");
  }

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}
