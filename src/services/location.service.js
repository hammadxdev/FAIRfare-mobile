import * as Location from "expo-location";

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Location permission was denied. Please enable location access to use this feature.");
  }

  const position = await Location.getCurrentPositionAsync({});

  return {
    id: "current-location",
    name: "Current Location",
    address: "Your current location",
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}
