import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
const { getProviderLaunchUris, openFirstAvailable } = require("./providerLauncherLogic.cjs");

// VERIFIED inDrive behavior from the installed Android app:
// - indrive://open/client/city with route coordinates opens the booking flow
//   with pickup and destination prefilled
// - indrive://open directly opens the client when route coordinates are absent
// - geo:<lat>,<lng> resolves but opens the Android chooser on the test phone
// - https://indrive.com/app is an official fallback
// The inDrive route handoff is verified; Yango's route candidate and all
// provider handoffs must still be confirmed in the provider UI. FareRide never
// claims that opening a link created a booking.
export const PROVIDER_LAUNCH_CONFIG = {
  indrive: { label: "inDrive", url: "https://indrive.com/app", playStore: "https://play.google.com/store/apps/details?id=sinet.startup.inDriver", playStoreIntent: "market://details?id=sinet.startup.inDriver" },
  yango: { label: "Yango", url: "https://yango.com/en_pk/", playStore: "https://play.google.com/store/apps/details?id=com.yandex.yango", playStoreIntent: "market://details?id=com.yandex.yango" },
  bykea: { label: "Bykea", url: "https://www.bykea.com/pk/", playStore: "https://play.google.com/store/apps/details?id=com.bykea.pk", playStoreIntent: "market://details?id=com.bykea.pk" },
  // These are the existing backend slugs for the current Yango/Bykea
  // display names; keep them as metadata aliases until real adapters rename.
  quickride: { label: "Yango", url: "https://yango.com/en_pk/", playStore: "https://play.google.com/store/apps/details?id=com.yandex.yango", playStoreIntent: "market://details?id=com.yandex.yango" },
  urbancab: { label: "Bykea", url: "https://www.bykea.com/pk/", playStore: "https://play.google.com/store/apps/details?id=com.bykea.pk", playStoreIntent: "market://details?id=com.bykea.pk" },
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

  if (await openFirstAvailable(launchUris, Linking, onEvent)) {
    if (tripContext.comparisonId) await SecureStore.setItemAsync(`fairfare.provider-redirect.${tripContext.comparisonId}`, label).catch(() => {});
    tripContext.onAlert?.("Provider link opened", "Confirm pickup, destination, and fare with the provider before booking. FairFare has not placed an order.");
    return true;
  }

  if (config?.playStore) {
    try {
      // Android intent first: this opens the Play Store app directly. The
      // HTTPS URL remains as a safe fallback for devices without Play Store.
      await Linking.openURL(config.playStoreIntent || config.playStore);
      tripContext.onAlert?.(`${label} is not installed`, `Opening the Google Play Store so you can install ${label}.`);
      return false;
    } catch (_) {
      try {
        await Linking.openURL(config.playStore);
        tripContext.onAlert?.(`${label} is not installed`, `Opening the Google Play Store so you can install ${label}.`);
        return false;
      } catch (_) { /* show the app-level error below */ }
    }
  }
  tripContext.onAlert?.("Unable to open provider", `Unable to open ${label} right now.`);
  return false;
}
