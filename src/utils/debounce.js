// Returns a debounced version of `fn` that only runs `delayMs` after the
// last call — used to keep autocomplete keystrokes from each firing a
// billable Google Places request through the backend.
export function debounce(fn, delayMs = 500) {
  let timeoutId = null;

  function debounced(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  }

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}
