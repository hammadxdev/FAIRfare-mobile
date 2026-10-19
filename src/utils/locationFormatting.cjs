function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function firstValue(source, keys) {
  for (const key of keys) {
    const value = text(source?.[key]);
    if (value) return value;
  }
  return "";
}

// Geoapify's normalized reverse-geocode response is intentionally small. This
// also accepts richer fields if the backend adds them later without changing
// the mobile location model.
function formatReverseGeocode(data = {}) {
  const formatted = firstValue(data, ["formattedAddress", "formatted_address", "address"]);
  const house = firstValue(data, ["houseNumber", "house_number", "housenumber"]);
  const street = firstValue(data, ["street", "streetName", "street_name"]);
  const area = firstValue(data, ["suburb", "neighbourhood", "neighborhood", "district", "area", "locality"]);
  const city = firstValue(data, ["city", "town", "municipality"]);
  const providerName = firstValue(data, ["name"]);

  let main = street;
  let secondaryParts = [house, area, city].filter(Boolean);
  const firstLine = formatted.split(",")[0]?.trim() || "";
  const remainingAddressParts = formatted.split(",").slice(1).map((part) => part.trim()).filter(Boolean);

  if (!main && firstLine) {
    // When the provider gives only "D 643 Street 18" as the first line,
    // preserve the supported house fragment separately and make the street
    // portion the primary label. Nothing is invented; both values came from
    // the provider response.
    // Only remove a provider prefix when it is clearly a house/road fragment
    // such as "D 643". Removing arbitrary provider names can turn valid
    // labels like "Kashmir Road" into "Road" or split a word at its start.
    if (providerName && /\d/.test(providerName) && firstLine.toLowerCase().startsWith(providerName.toLowerCase() + " ")) {
      main = firstLine.slice(providerName.length).trim();
      if (remainingAddressParts[0] && !area) {
        main = `${main}, ${remainingAddressParts[0]}`;
        secondaryParts = [providerName, ...remainingAddressParts.slice(1), city].filter(Boolean);
      } else if (!house) {
        secondaryParts = [providerName, ...secondaryParts];
      }
    } else {
      main = firstLine;
    }
  }

  if (!main) main = providerName || formatted;
  if (!secondaryParts.length) secondaryParts = formatted.split(",").slice(1).map((part) => part.trim()).filter(Boolean);

  return {
    name: main || providerName || "Current location",
    address: formatted || secondaryParts.join(", ") || providerName,
    secondaryAddress: secondaryParts.join(", "),
    city: city || undefined,
    locality: area || undefined,
    formattedAddress: formatted || undefined,
  };
}

function haversineDistanceMeters(from, to) {
  if (![from?.lat, from?.lng, to?.lat, to?.lng].every(Number.isFinite)) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTokens(value) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function maxTypoDistance(token) {
  if (token.length < 4) return 0;
  return token.length >= 7 ? 2 : 1;
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function fuzzyTokenSimilarity(queryToken, candidateToken) {
  if (queryToken.length < 4 || candidateToken.length < 4) return 0;
  const distance = levenshteinDistance(queryToken, candidateToken);
  const limit = Math.max(maxTypoDistance(queryToken), maxTypoDistance(candidateToken));
  if (distance > limit) return 0;
  return 1 - distance / Math.max(queryToken.length, candidateToken.length);
}

function bestTokenMatch(queryToken, candidateTokens) {
  let best = { similarity: 0, kind: "missing" };
  for (const candidateToken of candidateTokens) {
    if (candidateToken === queryToken) return { similarity: 1, kind: "exact" };
    if (candidateToken.startsWith(queryToken)) best = { similarity: Math.max(best.similarity, 0.94), kind: "prefix" };
    const fuzzy = fuzzyTokenSimilarity(queryToken, candidateToken);
    if (fuzzy > best.similarity) best = { similarity: fuzzy, kind: "fuzzy" };
  }
  return best;
}

function matchMetadata(item, query) {
  const queryTokens = searchTokens(query);
  const nameTokens = searchTokens(item.name);
  const allTokens = searchTokens(`${item.name || ""} ${item.address || ""} ${item.secondaryAddress || ""}`);
  const nameMatches = queryTokens.map((token) => bestTokenMatch(token, nameTokens));
  const allMatches = queryTokens.map((token) => bestTokenMatch(token, allTokens));
  const exactName = normalizeSearchText(item.name) === normalizeSearchText(query);
  const nameCoverage = nameMatches.filter((match) => match.similarity > 0).length;
  const allCoverage = allMatches.filter((match) => match.similarity > 0).length;
  const fuzzyMatches = nameMatches.filter((match) => match.kind === "fuzzy").length;
  const ordered = orderedTokenMatch(queryTokens, nameTokens);
  const strength = exactName || (queryTokens.length > 0 && nameCoverage === queryTokens.length && fuzzyMatches === 0)
    ? "strong"
    : allCoverage === queryTokens.length || nameCoverage >= Math.max(1, queryTokens.length - 1)
    ? "related"
    : "partial";
  return { queryTokens, nameTokens, allTokens, nameMatches, allMatches, exactName, nameCoverage, allCoverage, fuzzyMatches, ordered, strength };
}

function isInitialismMatch(queryTokens, nameTokens) {
  if (queryTokens.length !== 1 || queryTokens[0].length < 2) return false;
  const initials = nameTokens.map((token) => token[0]).join("");
  return initials === queryTokens[0];
}

function orderedTokenMatch(queryTokens, haystackTokens) {
  let cursor = 0;
  let matched = 0;
  for (const queryToken of queryTokens) {
    const index = haystackTokens.findIndex((token, i) => i >= cursor && token.startsWith(queryToken));
    if (index < 0) continue;
    matched += 1;
    cursor = index + 1;
  }
  return matched;
}

function suggestionRelevance(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const name = normalizeSearchText(item.name);
  const address = normalizeSearchText(item.address || item.secondaryAddress);
  const metadata = matchMetadata(item, query);
  const { nameTokens, queryTokens } = metadata;
  let score = 0;

  // Name matches are intentionally weighted far above distance. This keeps a
  // university ahead of a nearby club with the same leading words.
  if (name === normalizedQuery) score += 1000;
  else if (name.startsWith(normalizedQuery)) score += 760;
  else if (name.includes(normalizedQuery)) score += 600;

  const matchedNameTokens = metadata.nameMatches.filter((match) => match.similarity > 0).length;
  if (queryTokens.length && matchedNameTokens === queryTokens.length) score += 520;
  else score += matchedNameTokens * 130;

  const orderedNameMatches = orderedTokenMatch(queryTokens, nameTokens);
  score += orderedNameMatches * 85;
  const matchedAnyTokens = metadata.allMatches.filter((match) => match.similarity > 0).length;
  score += matchedAnyTokens * 35;
  if (queryTokens.length && matchedAnyTokens === queryTokens.length) score += 120;
  // A nearby result that omits a meaningful token is a poor match. Keep it
  // visible when it is all the provider returned, but make it impossible for
  // it to outrank a candidate containing the complete query.
  score -= (queryTokens.length - matchedAnyTokens) * 500;
  for (const match of metadata.nameMatches) {
    if (match.kind === "fuzzy") score += Math.round(match.similarity * 110);
  }
  if (isInitialismMatch(queryTokens, nameTokens)) score += 700;

  // Address-only matches remain useful for streets, house numbers and phases,
  // but cannot beat a strong place-name match merely because they are nearby.
  if (address.includes(normalizedQuery)) score += 250;
  if (item.category && /building|amenity|education|university|school|hospital|commercial|shopping/i.test(item.category)) score += 18;
  if (queryTokens.some((token) => /^\d/.test(token)) && address.includes(queryTokens.find((token) => /^\d/.test(token)))) score += 100;
  return score;
}

function rankLocationSuggestions(items, coordinates, query = "") {
  const seen = new Set();
  const accepted = [];
  return items
    .map((item, index) => ({
      ...item,
      distanceMeters: haversineDistanceMeters(coordinates, item),
      relevanceScore: suggestionRelevance(item, query),
      matchStrength: matchMetadata(item, query).strength,
      _index: index,
    }))
    .filter((item) => {
      const key = String(item.id || item.placeId || `${item.name || ""}|${item.address || ""}`).toLowerCase();
      const textKey = `${String(item.name || "").toLowerCase()}|${String(item.address || "").toLowerCase()}`;
      const nearbyDuplicate = accepted.some((other) => {
        if (key && key === String(other.id || other.placeId || "").toLowerCase()) return true;
        return textKey === `${String(other.name || "").toLowerCase()}|${String(other.address || "").toLowerCase()}`
          && haversineDistanceMeters(item, other) != null
          && haversineDistanceMeters(item, other) <= 50;
      });
      if (seen.has(key) || nearbyDuplicate) return false;
      seen.add(key);
      accepted.push(item);
      return true;
    })
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      // Once text relevance is equal, proximity is the deterministic tie
      // breaker. Do not preserve provider order for nearby equal matches.
      if (a.distanceMeters == null || b.distanceMeters == null) return a.distanceMeters == null ? 1 : -1;
      const distanceDelta = a.distanceMeters - b.distanceMeters;
      return distanceDelta || a._index - b._index;
    })
    .map(({ _index, relevanceScore, ...item }) => item)
    .slice(0, 8);
}

function filterRelevantSuggestions(items, query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .filter((item) => {
      const metadata = matchMetadata(item, normalized);
      return metadata.queryTokens.length > 0 && metadata.allMatches.every((match) => match.similarity > 0);
    });
}

module.exports = { formatReverseGeocode, haversineDistanceMeters, normalizeSearchText, levenshteinDistance, fuzzyTokenSimilarity, matchMetadata, suggestionRelevance, rankLocationSuggestions, filterRelevantSuggestions };
