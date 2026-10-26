// Native Android maps use Google Maps through react-native-maps. The Android
// key is read only while Expo evaluates this config for a native build.

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const usesLocalHttpApi = apiBaseUrl?.startsWith("http://") === true;
const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

export default {
  expo: {
    name: "FareRide",
    slug: "fairfair",
    version: "1.0.0",
    orientation: "portrait",
    // Use the official FareRide mark instead of the Expo starter artwork.
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
      // Native Android screens must receive a resized window when the IME opens.
      // This is required by the chat screen's KeyboardAvoidingView.
      softwareKeyboardLayoutMode: "resize",
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
      "expo-status-bar",
      ["react-native-maps", { androidGoogleMapsApiKey: googleMapsAndroidApiKey }],
      "./plugins/withProviderQueries",
    ],

    extra: {
      eas: {
        projectId: "a3822636-2a69-4977-8743-5aa7797b433b",
      },
    },
  },
};
