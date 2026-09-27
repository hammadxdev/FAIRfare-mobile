# FairFare Mobile

React Native (Expo) frontend for **FairFare** — compare ride fares across
simulated providers. Tagline: _Compare fares. Choose fair._

This app is a UI client for the backend at `D:\ride\backend`
(`GET /api/health`, `GET /api/providers`, `POST /api/fares/compare`). Login,
registration, persistent SecureStore sessions, user-owned history and Saved
Trips, private
preferences, deterministic Book/Wait fare recommendations, personalization,
and the grounded AI Ride Assistant are implemented. Real ride-provider APIs
remain out of scope for this FYP milestone.

## Tech Stack

- React Native + Expo (SDK 57)
- React Navigation (native-stack + bottom-tabs)
- react-native-maps, expo-location
- axios, expo-secure-store
- Plain `StyleSheet` components — no heavy UI library, no Redux

## Folder Structure

```
mobile/
  App.js                      # NavigationContainer + SafeAreaProvider root
  app.json
  .env.example / .env

  assets/
    logo/logo.png                # placeholder mark (see Logo section)
    vehicles/{bike,rickshaw,mini,car}.png   # placeholder marks

  src/
    navigation/
      RootNavigator.js            # Splash -> MainTabs -> Results / HistoryDetail / SavedRoutes
      TabNavigator.js              # Home / History / AI Chat / Settings

    screens/
      SplashScreen.js
      HomeScreen.js                 # real autocomplete, map tap, route, compare, Saved Trips quick access
      SavedRoutesScreen.js          # private reusable routes with edit/delete/fresh compare
      ResultsScreen.js               # provider cards + ML/recommendation facts + Ask AI
      LoginScreen.js, RegisterScreen.js, SettingsScreen.js, AIChatScreen.js

    components/                        # reusable UI (see below)
    services/
      api.js                              # authenticated axios client + API calls
      authStorage.js                      # SecureStore session persistence
    context/
      AuthContext.js                      # restore/login/register/logout state
      maps.service.js                       # backend map proxy calls (never calls Google directly)
      location.service.js                    # expo-location wrapper
    constants/
      colors.js, vehicles.js, mockLocations.js, mockProviders.js
    utils/
      formatCurrency.js, mapRegion.js, validators.js, debounce.js, sessionToken.js
```

## Components

| Component                                   | Purpose                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `LogoMark`                                  | Circular logo — uses `assets/logo/logo.png` if present, else "Ff" text mark                    |
| `AppHeader`                                 | Title + tagline + logo, reused across screens                                                  |
| `LocationInput` + `LocationSuggestionList`  | Search field with real Google Places autocomplete suggestions, inline loading/error states     |
| `MapPreview`                                | 300px rounded map, pickup/dropoff markers, real route polyline, tap-to-select, route info pill |
| `VehicleSelector` + `VehicleTypeCard`       | Horizontal vehicle picker with image/emoji fallback                                            |
| `ProviderFareCard`                          | Fare card with badges, breakdown/open-app actions                                              |
| `Badge`                                     | Cheapest / Fastest / Recommended pill                                                          |
| `LoadingOverlay`                            | Full-screen modal spinner shown during the compare request                                     |
| `PrimaryButton`, `EmptyState`, `ErrorState` | Generic building blocks                                                                        |

## Install & Run

```bash
cd mobile
npm install
cp .env.example .env
# edit .env — see "Connecting to the backend" below
npm start
```

Then scan the QR code with **Expo Go** on your phone, or press `a` / `i` in
the terminal for an Android/iOS emulator.

```bash
npm run android   # expo start --android
npm run ios       # expo start --ios
npm run web       # expo start --web (see note below)
```

## Build a standalone Android APK

To create an installable APK so you can download and use the app on your phone without Expo Go:

1. Install EAS CLI if needed:

   ```bash
   npm install -g eas-cli
   ```

2. Log in to Expo:

   ```bash
   eas login
   ```

3. Build the Android APK using the preview profile:

   ```bash
   cd mobile
   eas build -p android --profile preview
   ```

4. Download the generated APK from the EAS build page or from the CLI output.

5. Install the APK on your Android device and open it.

> If you want a release bundle instead, use `eas build -p android --profile production`.
> **Note on `web`:** `react-native-maps` has no web renderer, so
> `MapPreview.web.js` (a stylized preview card, not a real map) is used
> instead on `expo start --web` — see "Real Map & Web Fallback" below. Use
> Android/iOS (Expo Go or an emulator) for the real interactive map.

## Real Map & Web Fallback

- **`src/components/MapPreview.native.js`** (iOS/Android) renders a real
  `react-native-maps` `MapView`: green pickup marker, navy drop-off marker,
  the real Google route polyline (decoded server-side), a Pickup/Destination
  toggle for tap-to-select, and a `distanceKm • durationMin` pill.
- **`src/components/MapPreview.web.js`** (web) never imports
  `react-native-maps` — there is no web renderer for it — and instead shows a
  static preview card with pickup/drop-off labels and the route distance/
  duration if already computed, plus the notice "Web preview only. Real map
  is available on mobile." Metro picks whichever file matches the current
  platform automatically (`.native.js` vs `.web.js`), so no code branches on
  `Platform.OS` are needed in `HomeScreen.js`.
- All map/route data (autocomplete, place details, reverse geocoding, routes)
  comes from **our backend** (`src/services/maps.service.js` →
  `/api/maps/*`). The frontend never calls Google directly and never holds a
  Google API key — see `backend/README.md` → "Google Maps Setup" for why.

## Connecting to the Backend

`src/services/api.js` reads the one authoritative base URL from
`EXPO_PUBLIC_API_BASE_URL`. A missing value fails clearly at startup; there is
no silent production URL fallback.

```js
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL;
```

**Use your computer's LAN IP, not `localhost`,** when testing on a physical
device — the phone can't reach your dev machine's `localhost`.

```txt
# .env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:4000/api
```

Find your LAN IP:

- Windows: `ipconfig` → look for the Wi-Fi adapter's IPv4 address
- macOS/Linux: `ifconfig` or `ip addr`

Start the backend first (`cd ../backend && npm run dev`), then the mobile
app. A physical device and the dev machine must be on the **same Wi-Fi
network**.

The backend listens on `0.0.0.0:4000` for local LAN testing. For an Android
emulator, use `http://10.0.2.2:4000/api`; this is not the address for a
physical phone. For Expo web on the same computer, use
`http://localhost:4000/api`. The backend's current `cors()` middleware allows
the web development origin, while native requests do not use browser CORS.

For the deployed backend, set
`EXPO_PUBLIC_API_BASE_URL=https://YOUR-VERCEL-BACKEND.vercel.app/api`.
Only this public URL belongs in an `EXPO_PUBLIC_*` variable; never put
`AI_API_KEY`, provider credentials, refresh tokens, JWT secrets, or other
backend secrets in the mobile environment.

Expo reads public variables when the bundle/config is built. Restart Expo
after changing the URL, using `npx expo start -c` if the old value is cached.
The app config enables Android cleartext traffic only when the configured URL
starts with `http://`; HTTPS/Vercel configurations keep cleartext disabled.

On Expo Web, authentication sessions use browser `localStorage` because
SecureStore's native implementation is not available there. Native Android and
iOS builds continue to use `expo-secure-store`; this web fallback is not a
replacement for native SecureStore.

If the request fails, the Home screen shows an inline error state:

> Unable to compare fares.
> Please make sure the backend is running and try again.

### Optional demo-only mock fallback

`src/constants/mockProviders.js` exports `ENABLE_MOCK_FALLBACK` (default
`false`). Flip it to `true` only if you need to demo the Results
screens with the backend offline — it returns a canned 3-provider response
instead of showing the error state. Leave it `false` for real use; the
backend is already working.

## AI Ride Assistant

The AI tab calls the authenticated backend endpoint `/api/ai/chat`. It can
discuss the selected current comparison from Results, or answer bounded
preference/history questions without a selected comparison. The backend owns
all grounding data and keeps the LLM key server-side; when AI is disabled or
unconfigured, the app shows an unavailable-assistant message without
breaking comparison, history, or settings.

## Logo & Vehicle Images

- `assets/logo/logo.png` and `assets/vehicles/*.png` currently contain small
  generated placeholder marks (colored circles) so the app has real images
  to `require()` out of the box — Metro needs the file to exist at bundle
  time, so these can't be "missing" placeholders.
- **To use your real logo/artwork:** replace the file at the same path with
  the same filename. No code changes needed.
- `VehicleTypeCard` also has a live fallback: if an image ever fails to load
  (`onError`), it swaps to an emoji (🏍️ 🛺 🚗 🚙) automatically.
- `LogoMark` falls back to a text "Ff" mark if `assets/logo/logo.png` can't
  be required at all (e.g. the file is deleted before a rebuild).

## Manual Smoke Test Checklist

Saved Trips are reusable pickup/destination shortcuts, not comparison history.
They do not store a current fare. Every Compare Fares action starts a fresh
comparison and produces the normal Results experience.

Needs a real device/emulator (screen + touch input) plus a valid
`GOOGLE_MAPS_API_KEY` in `backend/.env` — not verified against real Google
APIs in this environment; do this before a demo.

**Autocomplete / debounce / session tokens**

1. Typing 1–2 characters in Pickup/Drop-off calls no API and shows no spinner
2. Typing the 3rd character starts a 500ms countdown before any request fires
   (rapid typing keeps resetting it — check the Network tab / backend logs
   for one request per pause, not one per keystroke)
3. Suggestions show "Searching locations..." while loading, "No locations
   found" when Google returns zero predictions, and "Unable to load
   suggestions" when the backend is unreachable
4. Selecting a suggestion calls `/api/maps/place-details`, fills the field,
   clears suggestions, and starts a fresh session token for the next search

**Map / route** 5. Home screen shows a real interactive map (Android/iOS), not the web card 6. Pickup marker is green, drop-off marker is navy 7. Tapping the map in "Pickup" or "Destination" mode reverse-geocodes the
tapped point and fills that field with a readable address 8. Once both pickup and drop-off are set, "Calculating route..." appears
briefly, then a real polyline is drawn and a `X.X km • Y min` pill appears 9. Switching vehicle type (e.g. bike → car) recalculates the route 10. Turning off the backend and retrying a route calc falls back to the
"Route not loaded yet. Using approximate estimate." notice, and Compare
Fares still works (haversine fallback server-side)

**Existing flow** 11. "Use Current Location" prompts for permission and fills Pickup with a
reverse-geocoded address 12. Vehicle cards show images (fallback emoji if an image fails) 13. Compare button stays disabled until pickup + drop-off + vehicle are set 14. Selecting the same pickup and drop-off shows the inline validation error 15. Loading overlay appears during the compare request and blocks touches 16. Results screen shows the route summary + 3 provider cards with correct
badges, Expected Fare, Book/Wait, personalization, and Ask AI action 17.
History, Settings, and AI Chat show populated, empty, loading, and failure
states 18. Web (`npm run web`): map area shows the stylized fallback card with the
"Web preview only. Real map is available on mobile." notice, and never
throws an `react-native-maps` import error

## Notes for Next Steps

- Provider handoff currently opens the configured inDrive web link and shows
  a clear manual-open message for providers without verified links.
- Android maps: `react-native-maps` on Android uses Google Maps and needs
  an API key (`app.json` → `android.config.googleMaps.apiKey`) for a
  polished look; without one it still renders (grey/dev watermark) and
  won't crash. This is a separate, restricted-to-Android-app key from the
  backend's `GOOGLE_MAPS_API_KEY` (see `backend/README.md`) — it only draws
  map tiles and never needs Places/Routes/Geocoding access.
