// IDs and names are taken from the verified backend inDrive mapper contract.
// Unknown provider categories intentionally use the neutral bundled fallback.
const INDRIVE_VEHICLE_IMAGES = Object.freeze({
  "2": require("../../assets/vehicles/bike.png"),
  "33": require("../../assets/vehicles/mini.png"),
  "31": require("../../assets/vehicles/rickshaw.png"),
  "29": require("../../assets/vehicles/car.png"),
  "11": require("../../assets/vehicles/car.png"),
});

const INDRIVE_VEHICLE_FALLBACK_IMAGE = require("../../assets/vehicles/generic.png");

function getIndriveVehicleImage(categoryId) {
  return INDRIVE_VEHICLE_IMAGES[String(categoryId)] || INDRIVE_VEHICLE_FALLBACK_IMAGE;
}

module.exports = { INDRIVE_VEHICLE_IMAGES, INDRIVE_VEHICLE_FALLBACK_IMAGE, getIndriveVehicleImage };
