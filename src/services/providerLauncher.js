import { Alert, Linking } from "react-native";
const { getIndriveLaunchUris, getYangoLaunchUris, getBykeaLaunchUris, openFirstAvailable } = require("./providerLauncherLogic.cjs");

// VERIFIED inDrive behavior from the installed Android app:
// - app launch through indrive://open and https://indrive.com/app
// - one generic geo location/map handoff through geo:<lat>,<lng>
// NOT YET VERIFIED: simultaneous pickup + destination, category, fare, and
// order creation. Fair Fare does not claim booking completion.
export const PROVIDER_LAUNCH_CONFIG = {
  indrive: { label: "inDrive", url: "https://indrive.com/app" },
  yango: { label: "Yango", url: "https://yango.com/en_pk/" },
  bykea: { label: "Bykea", url: "https://www.bykea.com/pk/" },
  // These are the existing backend slugs for the current Yango/Bykea
  // display names; keep them as metadata aliases until real adapters rename.
  quickride: { label: "Yango", url: "https://yango.com/en_pk/" },
  urbancab: { label: "Bykea", url: "https://www.bykea.com/pk/" },
};

export async function openProvider(providerId, tripContext = {}) {
  const config = PROVIDER_LAUNCH_CONFIG[providerId];
  const label = config?.label || "provider";
  const launchUris = providerId === "indrive"
    ? getIndriveLaunchUris(tripContext)
    : (providerId === "yango" || providerId === "quickride")
      ? getYangoLaunchUris(tripContext)
      : getBykeaLaunchUris();

  if (await openFirstAvailable(launchUris, Linking)) return true;

  Alert.alert("Unable to open provider", `Unable to open ${label}. Please install or open the provider app manually.`);
  return false;
}
