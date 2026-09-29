import { Alert, Linking } from "react-native";
const { getIndriveLaunchUris, openFirstAvailable } = require("./providerLauncherLogic.cjs");

// VERIFIED inDrive behavior from the installed Android app:
// - app launch through indrive://open and https://indrive.com/app
// - one generic geo location/map handoff through geo:<lat>,<lng>
// NOT YET VERIFIED: simultaneous pickup + destination, category, fare, and
// order creation. Fair Fare does not claim booking completion.
export const PROVIDER_LAUNCH_CONFIG = {
  indrive: { label: "inDrive", url: "https://indrive.com/app" },
  yango: { label: "Yango", url: null },
  bykea: { label: "Bykea", url: null },
  // These are the existing backend slugs for the current Yango/Bykea
  // display names; keep them as metadata aliases until real adapters rename.
  quickride: { label: "Yango", url: null },
  urbancab: { label: "Bykea", url: null },
};

export async function openProvider(providerId, tripContext = {}) {
  const config = PROVIDER_LAUNCH_CONFIG[providerId];
  const label = config?.label || "provider";
  if (!config?.url) {
    Alert.alert("Unable to open provider", `Unable to open ${label}. Please install or open the provider app manually.`);
    return false;
  }
  const launchUris = providerId === "indrive"
    ? getIndriveLaunchUris(tripContext)
    : [config.url];

  if (await openFirstAvailable(launchUris, Linking)) return true;

  Alert.alert("Unable to open provider", `Unable to open ${label}. Please install or open the provider app manually.`);
  return false;
}
