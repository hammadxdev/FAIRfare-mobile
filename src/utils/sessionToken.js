// Google Places session tokens group one autocomplete "search session"
// (keystrokes + the final place-details call) into a single billing unit.
// Create one per search session and reset it after a place is selected.
export function createSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
