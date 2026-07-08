export const DEFAULT_REGION = {
  latitude: 32.4945,
  longitude: 74.5229,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MIN_DELTA = 0.02;
const PADDING_FACTOR = 1.8;

// Returns a region that frames pickup/dropoff (or a single point, or the
// default Sialkot view when neither is set).
export function getRegionForPoints(pickup, dropoff) {
  if (!pickup && !dropoff) {
    return DEFAULT_REGION;
  }

  if (pickup && !dropoff) {
    return { latitude: pickup.lat, longitude: pickup.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }

  if (!pickup && dropoff) {
    return { latitude: dropoff.lat, longitude: dropoff.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }

  const minLat = Math.min(pickup.lat, dropoff.lat);
  const maxLat = Math.max(pickup.lat, dropoff.lat);
  const minLng = Math.min(pickup.lng, dropoff.lng);
  const maxLng = Math.max(pickup.lng, dropoff.lng);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;

  const latitudeDelta = Math.max((maxLat - minLat) * PADDING_FACTOR, MIN_DELTA);
  const longitudeDelta = Math.max((maxLng - minLng) * PADDING_FACTOR, MIN_DELTA);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}
