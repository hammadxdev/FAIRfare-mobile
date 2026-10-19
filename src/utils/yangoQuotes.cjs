const YANGO_IDS = new Set(["yango", "quickride"]);

function providerKey(result) {
  const provider = result?.provider || {};
  return String(
    provider.name || provider.code || provider.providerCode ||
    result?.providerName || result?.providerCode || provider.id || ""
  ).trim().toLowerCase();
}

function isYangoResult(result) {
  return YANGO_IDS.has(providerKey(result));
}

function isAuthorizedYangoResult(result) {
  if (!isYangoResult(result)) return false;
  if (!Array.isArray(result?.quotes)) return false;
  const source = String(result?.source || result?.quotes?.[0]?.source || "").trim().toUpperCase();
  const dataSource = String(result?.dataSource || result?.quotes?.[0]?.dataSource || result?.metadata?.dataSource || "").trim().toUpperCase();
  return source === "LIVE" && dataSource === "REAL";
}

function isPassengerQuote(quote) {
  const categoryId = String(quote?.categoryId || "").trim().toLowerCase();
  const categoryType = String(quote?.categoryType || "").trim().toLowerCase();
  return categoryType !== "delivery" && !/courier|cargo|delivery|express|ndd_|sdd_|virtual_orders/.test(categoryId);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeYangoQuote(result, quote) {
  const exactFare = positiveNumber(quote?.exactFare ?? quote?.fare);
  const displayFare = positiveNumber(quote?.displayFare);
  const startingFare = positiveNumber(quote?.startingFare);
  const unavailable = quote?.isAvailable !== true || String(quote?.availability || "").toLowerCase() === "unavailable" || Boolean(quote?.availabilityReason?.code);
  const normalizedQuote = {
    ...quote,
    categoryId: quote?.categoryId == null ? null : String(quote.categoryId),
    categoryName: quote?.categoryName || quote?.name || quote?.categoryId || "Yango ride",
    fare: unavailable ? null : exactFare,
    exactFare,
    displayFare,
    startingFare,
    currency: String(quote?.currency || result?.currency || "").toUpperCase() || null,
    pickupEtaSeconds: Number.isFinite(Number(quote?.pickupEtaSeconds)) && Number(quote.pickupEtaSeconds) > 0 ? Number(quote.pickupEtaSeconds) : null,
    isAvailable: !unavailable && exactFare !== null,
    availability: unavailable ? "unavailable" : quote?.availability || "unverified_bookability",
    availabilityReason: quote?.availabilityReason || null,
    source: "live",
    dataSource: "REAL",
    quoteSource: "authorized_yango_routestats",
  };
  return {
    ...result,
    provider: { id: "yango", name: "yango", displayName: "Yango" },
    categoryId: normalizedQuote.categoryId,
    categoryName: normalizedQuote.categoryName,
    fare: normalizedQuote.fare,
    exactFare: normalizedQuote.exactFare,
    displayFare: normalizedQuote.displayFare,
    startingFare: normalizedQuote.startingFare,
    currency: normalizedQuote.currency,
    fareType: normalizedQuote.fareType || "FIXED_ROUTE_QUOTE",
    pickupEtaSeconds: normalizedQuote.pickupEtaSeconds,
    isAvailable: normalizedQuote.isAvailable,
    availability: normalizedQuote.availability,
    availabilityReason: normalizedQuote.availabilityReason,
    source: "live",
    dataSource: "REAL",
    quoteSource: normalizedQuote.quoteSource,
    quotes: [normalizedQuote],
  };
}

function expandYangoResults(results = []) {
  const authorizedResults = results.filter(isAuthorizedYangoResult);
  if (!authorizedResults.length) return [];

  const byCategory = new Map();
  for (const result of authorizedResults) {
    for (const quote of result.quotes) {
      if (!isPassengerQuote(quote) || !quote?.categoryId) continue;
      const normalized = normalizeYangoQuote(result, quote);
      const key = normalized.categoryId;
      const current = byCategory.get(key);
      if (!current || (normalized.isAvailable && !current.isAvailable)) byCategory.set(key, normalized);
    }
  }
  return [...byCategory.values()];
}

function yangoUiState(results = []) {
  const yangoResults = results.filter(isYangoResult);
  const quotes = expandYangoResults(yangoResults);
  const hasVerifiedFare = quotes.some((quote) => quote.isAvailable === true && positiveNumber(quote.fare) !== null);
  return {
    authorized: hasVerifiedFare,
    quotes,
    unavailable: !hasVerifiedFare,
  };
}

module.exports = {
  isYangoResult,
  providerKey,
  isAuthorizedYangoResult,
  isPassengerQuote,
  normalizeYangoQuote,
  expandYangoResults,
  yangoUiState,
};
