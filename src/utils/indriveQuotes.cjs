const { providerKey } = require("./yangoQuotes.cjs");

function isLiveQuote(quote, provider) {
  const source = String(quote?.source || provider?.source || provider?.dataSource || "").toUpperCase();
  const fare = Number(quote?.fare);
  return quote?.isAvailable === true && Boolean(quote?.categoryId) && Number.isFinite(fare) && fare > 0 &&
    ["REAL", "LIVE", "LIVE_PROVIDER", "PROVIDER_QUOTE"].includes(source) && String(quote?.currency || "").toUpperCase() === "PKR";
}

function expandProviderResults(results = []) {
  return results.flatMap((provider) => {
    if (providerKey(provider) !== "indrive") return [provider];
    const quotes = Array.isArray(provider.quotes) ? provider.quotes : [];
    const liveQuotes = quotes.filter((quote) => isLiveQuote(quote, provider));
    if (!liveQuotes.length) return [provider];
    return liveQuotes.map((quote) => ({
      ...provider,
      categoryId: quote.categoryId,
      categoryName: quote.categoryName || null,
      normalizedCategory: quote.normalizedCategory || "UNKNOWN",
      fare: quote.fare,
      fareRecommended: quote.fareRecommended ?? quote.fare,
      fareMin: quote.fareMin ?? null,
      fareMax: quote.fareMax ?? null,
      currency: quote.currency,
      fareType: quote.fareType,
      pickupEtaSeconds: quote.pickupEtaSeconds ?? null,
      priceType: quote.priceType || quote.fareType || null,
      isNegotiable: quote.isNegotiable === true,
      metadata: quote.metadata || provider.metadata || {},
      source: quote.source || provider.source || "live",
      dataSource: provider.dataSource || "REAL",
      isAvailable: true,
      quotes: [quote],
    }));
  });
}

module.exports = { isLiveQuote, expandProviderResults };
