// Visible location text stays separate from canonical coordinates and IDs.
export function getLocationDisplayText(location) {
  if (!location) return "";
  return (
    location.name ||
    location.address ||
    location.formattedAddress ||
    location.formatted_address ||
    location.description ||
    location.vicinity ||
    ""
  );
}
