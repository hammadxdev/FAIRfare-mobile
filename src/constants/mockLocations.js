// Real Google Places autocomplete (via the backend proxy) is the active
// search path. Flip this on only for an offline demo — it falls back to a
// client-side filter over the fixed list below when the backend is
// unreachable. Leave it false for real use.
export const ENABLE_MOCK_LOCATION_FALLBACK = false;

const mockLocations = [
  {
    id: "university-road",
    name: "University Road",
    address: "University Road, Sialkot",
    lat: 32.4945,
    lng: 74.5229,
  },
  {
    id: "sialkot-cantt",
    name: "Sialkot Cantt",
    address: "Cantt, Sialkot",
    lat: 32.5201,
    lng: 74.56,
  },
  {
    id: "kashmir-road",
    name: "Kashmir Road",
    address: "Kashmir Road, Sialkot",
    lat: 32.5018,
    lng: 74.5353,
  },
  {
    id: "paris-road",
    name: "Paris Road",
    address: "Paris Road, Sialkot",
    lat: 32.5007,
    lng: 74.5417,
  },
  {
    id: "daska-road",
    name: "Daska Road",
    address: "Daska Road, Sialkot",
    lat: 32.4703,
    lng: 74.5061,
  },
  {
    id: "airport-road",
    name: "Airport Road",
    address: "Airport Road, Sialkot",
    lat: 32.5355,
    lng: 74.3635,
  },
];

export default mockLocations;
