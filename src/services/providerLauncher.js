import { Alert, Linking } from "react-native";

// Only the existing inDrive URL is configured. Yango and Bykea have no
// verified launch link in this repository, so no undocumented URI is made up.
export const PROVIDER_LAUNCH_CONFIG = {
  indrive: { label: "inDrive", url: "https://indrive.com" },
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
  try {
    if (!(await Linking.canOpenURL(config.url))) throw new Error("Unsupported provider link");
    await Linking.openURL(config.url);
    return true;
  } catch (error) {
    Alert.alert("Unable to open provider", `Unable to open ${label}. Please install or open the provider app manually.`);
    return false;
  }
}
