// Vehicle image files are placeholder marks generated for scaffolding.
// Drop real artwork into assets/vehicles/<type>.png (same filenames) to replace them —
// no code changes needed. VehicleTypeCard also falls back to an emoji if an
// image ever fails to load.
export const VEHICLE_FALLBACK_EMOJI = {
  bike: "🏍️",
  rickshaw: "🛺",
  mini: "🚗",
  car: "🚙",
};

const vehicles = [
  {
    type: "bike",
    title: "Bike",
    subtitle: "Fast & affordable",
    image: require("../../assets/vehicles/bike.png"),
  },
  {
    type: "rickshaw",
    title: "Rickshaw",
    subtitle: "Local city rides",
    image: require("../../assets/vehicles/rickshaw.png"),
  },
  {
    type: "mini",
    title: "Mini",
    subtitle: "Budget car",
    image: require("../../assets/vehicles/mini.png"),
  },
  {
    type: "car",
    title: "Car",
    subtitle: "Comfort ride",
    image: require("../../assets/vehicles/car.png"),
  },
];

export default vehicles;
