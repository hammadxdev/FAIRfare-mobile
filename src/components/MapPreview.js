// Metro resolves MapPreview.web.js on web and MapPreview.native.js on
// iOS/Android automatically. This file is only a fallback for any resolver
// that isn't platform-aware.
export { default } from "./MapPreview.native";
