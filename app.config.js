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

export default {
  expo: {
    name: "FAIRfair",
    slug: "fairfair",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",

    ios: {
      supportsTablet: true,
    },

    android: {
      package: "com.fairfair.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    plugins: [
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
