const CITY_ALIASES = new Map([
  ["lahore", "lahore"],
  ["urban lahore", "lahore"],
  ["lahore urban", "lahore"],
  ["lahore district", "lahore"],
  ["islamabad", "islamabad"],
  ["rawalpindi", "rawalpindi"],
  ["karachi", "karachi"],
  ["faisalabad", "faisalabad"],
  ["multan", "multan"],
  ["peshawar", "peshawar"],
  ["quetta", "quetta"],
  ["hyderabad", "hyderabad"],
]);

function normalizeCityText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:city|district|division|tehsil)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalCityId(location = {}) {
  const raw = location.city || location.town || location.municipality || location.cityName || "";
  const normalized = normalizeCityText(raw);
  return CITY_ALIASES.get(normalized) || normalized || null;
}

function cityIdentity(location = {}) {
  const raw = String(location.city || location.town || location.municipality || location.cityName || "").trim();
  const canonical = canonicalCityId(location);
  return {
    canonical,
    raw: raw || null,
    lat: Number.isFinite(Number(location.lat)) ? Number(location.lat) : null,
    lng: Number.isFinite(Number(location.lng)) ? Number(location.lng) : null,
  };
}

module.exports = { normalizeCityText, canonicalCityId, cityIdentity };
