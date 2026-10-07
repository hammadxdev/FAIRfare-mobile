import { Alert, Linking } from "react-native";
const { getProviderLaunchUris, openFirstAvailable } = require("./providerLauncherLogic.cjs");

// VERIFIED inDrive behavior from the installed Android app:
// - indrive://open directly opens the client
// - geo:<lat>,<lng> resolves but opens the Android chooser on the test phone
// - https://indrive.com/app is an official fallback
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
  const launchUris = getProviderLaunchUris(providerId, tripContext);

  const onEvent = __DEV__
    ? (event) => {
      if (event.event === "candidate") {
        console.log("[ProviderLaunch] requested", providerId, event.type, event.scheme || "", event.domain || "");
      } else if (event.event === "canOpenURL") {
        console.log("[ProviderLaunch] canOpenURL", providerId, event.result, event.errorName || "", event.errorMessage || "");
      } else if (event.event === "openURL") {
        console.log("[ProviderLaunch] openURL", providerId, event.result, event.errorName || "", event.errorMessage || "");
      } else if (event.event === "invalidCandidate") {
        console.warn("[ProviderLaunch] invalid candidate", providerId, event.uriType, event.errorName, event.errorMessage);
      }
    }
    : undefined;

  if (await openFirstAvailable(launchUris, Linking, onEvent)) return true;

  Alert.alert("Unable to open provider", `Unable to open ${label} right now.`);
  return false;
}
