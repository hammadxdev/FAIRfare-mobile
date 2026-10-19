# FareRide local backend development

The original FareRide Expo app now uses the local backend through the ignored `.env.local` file.

Current local configuration:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.100.19:4000/api
```

The backend source uses port `process.env.PORT || 4000`; the backend `.env` and `.env.example` both currently specify `PORT=4000`. The backend listens on `0.0.0.0`, so LAN access is supported. The local backend was not running during this check, so live health connectivity was not verified.

## Start the backend

In a separate PowerShell window:

```powershell
cd D:\ride\backend
Select-String -Path .env -Pattern '^PORT='
npm run dev
```

Confirm the startup output reports the actual `/api` URL. If `PORT` is changed, update `.env.local` to use the same port; do not assume `4000` after changing it.

## Verify the local backend from Windows

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Expected result is a successful liveness response containing `application: "alive"`. If the backend port differs, replace `4000`.

## Find the Windows LAN address

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object InterfaceAlias,IPAddress,PrefixLength
```

The address used for this configuration was `192.168.100.19`, discovered from the current Windows network interfaces. If the address changes, update `.env.local` and restart Expo.

## Android emulator

For the standard Android emulator, use:

```text
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api
```

`10.0.2.2` maps to the development computer's localhost from the Android emulator. Use the actual backend port if it is not `4000`.

## Physical Android phone

Use the development computer's current Wi-Fi/LAN IPv4 address:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.100.19:4000/api
```

The phone and computer must be on the same network. Allow Node.js or the backend port through Windows Firewall when prompted. A private-network rule can be inspected with:

```powershell
Get-NetFirewallProfile | Select-Object Name,Enabled,DefaultInboundAction
Get-NetFirewallRule -Enabled True -Direction Inbound | Select-Object -First 20 DisplayName,Action,Profile
```

Do not disable the firewall globally. Add only a narrowly scoped private-network rule if your organization permits it.

## Expo startup

From `D:\ride\mobile`:

```powershell
npx expo start -c
```

Then open the app in Expo Go or the development build. Expo reads `EXPO_PUBLIC_API_BASE_URL` at bundle/config time, so restart after changing `.env.local`.

For local web on the same computer, use:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

The Android app's `app.config.js` enables cleartext HTTP only when the configured API URL starts with `http://`. A native rebuild may be required for a standalone development build after changing this native setting; Expo Go generally uses its current runtime configuration.

## Connectivity checks from a device

1. Start the backend and confirm its startup `/api` URL.
2. Confirm Windows can reach `http://localhost:<PORT>/api/health`.
3. On a physical phone, open `http://<LAN_IP>:<PORT>/api/health` in the phone browser.
4. On an emulator, use `http://10.0.2.2:<PORT>/api/health` where supported.
5. Start Expo with `npx expo start -c`.
6. Confirm the app log prints the local API base URL in development.
7. Test login, refresh, maps, fare comparison, and AI chat.

Do not put backend API keys, JWT secrets, database URLs, provider tokens, or Groq/Geoapify credentials in any `EXPO_PUBLIC_*` variable.

## Restore production later

The existing `.env` currently contains the production API URL. To restore production explicitly:

```powershell
Remove-Item .env.local
npx expo start -c
```

For EAS preview/production builds, `eas.json` explicitly supplies the Vercel API URL. Do not change those profiles as part of local development.
