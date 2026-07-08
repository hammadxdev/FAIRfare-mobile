// Demo-only fallback so the UI can be shown without a running backend.
// Keep this false — the real backend is already working. Flip it on only
// for an offline demo/screenshot session.
export const ENABLE_MOCK_FALLBACK = false;

const mockCompareFaresResponse = {
  searchId: 0,
  pickup: { name: "University Road, Sialkot", lat: 32.4945, lng: 74.5229 },
  dropoff: { name: "Sialkot Cantt", lat: 32.5201, lng: 74.56 },
  vehicleType: "bike",
  distanceKm: 5.8,
  durationMin: 15,
  results: [
    {
      provider: { id: 2, name: "quickride", displayName: "QuickRide" },
      fare: 169,
      etaMin: 6,
      isCheapest: true,
      isFastest: false,
      isRecommended: false,
      badges: ["Cheapest"],
      breakdown: {
        baseFare: 50,
        distanceFare: 104,
        timeFare: 15,
        surgeMultiplier: 1,
        minimumFare: 110,
        finalFare: 169,
      },
    },
    {
      provider: { id: 1, name: "ridego", displayName: "RideGo" },
      fare: 201,
      etaMin: 4,
      isCheapest: false,
      isFastest: false,
      isRecommended: true,
      badges: ["Recommended"],
      breakdown: {
        baseFare: 60,
        distanceFare: 116,
        timeFare: 15,
        surgeMultiplier: 1.05,
        minimumFare: 120,
        finalFare: 201,
      },
    },
    {
      provider: { id: 3, name: "urbancab", displayName: "UrbanCab" },
      fare: 237,
      etaMin: 3,
      isCheapest: false,
      isFastest: true,
      isRecommended: false,
      badges: ["Fastest"],
      breakdown: {
        baseFare: 70,
        distanceFare: 128,
        timeFare: 18,
        surgeMultiplier: 1.1,
        minimumFare: 130,
        finalFare: 237,
      },
    },
  ],
};

export default mockCompareFaresResponse;
