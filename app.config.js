// Converted from app.json so the Android Google Maps display key can be
// injected from mobile/.env at prebuild time via the react-native-maps
// config plugin, without ever hardcoding it in source. All other values
// below are carried over unchanged from the previous app.json.

if (!process.env.GOOGLE_MAPS_ANDROID_API_KEY) {
  console.warn(
    "[app.config.js] GOOGLE_MAPS_ANDROID_API_KEY is not set — the Android map " +
      "will still render but with Google's unbranded/dev watermark. Set it in mobile/.env.",
  );
}

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const usesLocalHttpApi = apiBaseUrl?.startsWith("http://") === true;

export default {
  expo: {
    name: "Fair Fare",
    slug: "fairfair",
    version: "1.0.0",
    orientation: "portrait",
    // Use the official Fair Fare mark instead of the Expo starter artwork.
    icon: "./assets/logo/logo.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/logo/logo.png",
      resizeMode: "contain",
      backgroundColor: "#0F766E",
    },

    ios: {
      supportsTablet: true,
    },

    android: {
      package: "com.fairfare.app",
      // Allow cleartext only for an explicitly configured local HTTP backend.
      // HTTPS/Vercel builds leave Android's cleartext protection enabled.
      usesCleartextTraffic: usesLocalHttpApi,
      adaptiveIcon: {
        backgroundColor: "#F3F8EC",
        foregroundImage: "./assets/logo/logo.png",
        monochromeImage: "./assets/logo/logo.png",
      },
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/logo/logo.png",
          imageWidth: 220,
          resizeMode: "contain",
          backgroundColor: "#0F766E",
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      ],
    ],

    extra: {
      eas: {
        projectId: "a3822636-2a69-4977-8743-5aa7797b433b",
      },
    },
  },
};
