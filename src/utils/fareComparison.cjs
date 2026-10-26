const CATEGORIES = Object.freeze(["bike", "car", "mini", "rickshaw", "other", "unknown"]);

function providerIdFor(result) {
  const provider = result?.provider || {};
  return String(provider.name || provider.code || provider.providerCode || result?.providerName || provider.id || "").trim().toLowerCase();
}

function providerNameFor(result) {
  const provider = result?.provider || {};
  return provider.displayName || provider.name || result?.providerName || provider.id || "Provider";
}

function canonicalVehicleCategory(result = {}) {
  const explicit = String(result.vehicleCategory || result.normalizedCategory || "").trim().toLowerCase();
  const label = String(result.categoryName || result.name || "").trim().toLowerCase();
  if (explicit === "mini" || label === "mini") return "mini";
  if (["bike", "car", "mini", "rickshaw", "other", "unknown"].includes(explicit)) return explicit;
  if (explicit === "economy_car" || explicit === "standard_car" || explicit === "premium_car") return "car";
  if (["moto", "bike", "motorcycle"].includes(label)) return "bike";
  if (label === "rickshaw") return "rickshaw";
  return "unknown";
}

function serviceLabelFor(result, category) {
  const providerId = providerIdFor(result);
  if (providerId === "urbancab" || providerId === "bykea") {
    const serviceCode = result.service_code ?? result.serviceCode ?? result.categoryId;
    return result.categoryName || result.providerServiceLabel || (serviceCode == null ? "Unknown service" : `Service ${serviceCode}`);
  }
  return result.categoryName || result.name || (category === "unknown" ? "Unclassified service" : category[0].toUpperCase() + category.slice(1));
}

function normalizedFeatures(result) {
  return Array.isArray(result?.features)
    ? result.features.map((feature) => {
      const normalized = String(feature).trim().toLowerCase();
      return ["ac", "a/c", "air_conditioned", "air-conditioned", "air conditioning"].includes(normalized) ? "AC" : normalized.toUpperCase();
    }).filter(Boolean)
    : [];
}

function normalizedServiceTier(result) {
  const tier = String(result?.serviceTier || "unknown").trim().toLowerCase();
  return ["economy", "standard", "premium", "exclusive", "unknown"].includes(tier) ? tier : "unknown";
}

function hasFeature(result, feature) {
  return normalizedFeatures(result).includes(String(feature).trim().toUpperCase());
}

function positiveFare(value) {
  const fare = Number(value);
  return Number.isFinite(fare) && fare > 0 ? fare : null;
}

function flattenFareOptions(results = []) {
  return results.flatMap((providerResult) => {
    const quotes = Array.isArray(providerResult?.quotes) && providerResult.quotes.length > 0
      ? providerResult.quotes
      : [providerResult];
    return quotes.map((quote, index) => {
      const option = { ...providerResult, ...quote, provider: providerResult.provider || quote.provider };
      const category = canonicalVehicleCategory(option);
      const fare = positiveFare(option.fare);
      return {
        ...option,
        providerId: providerIdFor(option),
        providerName: providerNameFor(option),
        category,
        serviceLabel: serviceLabelFor(option, category),
        providerServiceName: option.providerServiceName || option.categoryName || option.providerServiceLabel || null,
        serviceTier: normalizedServiceTier(option),
        features: normalizedFeatures(option),
        fare,
        currency: String(option.currency || providerResult.currency || "").trim().toUpperCase() || null,
        isAvailable: option.isAvailable !== false && fare !== null,
        optionId: `${providerIdFor(option)}:${option.categoryId || option.service_code || index}`,
      };
    });
  });
}

function availableOptions(options = []) {
  return options.filter((option) => option.isAvailable === true && option.fare !== null && option.currency);
}

function supportedCategories(options = []) {
  return CATEGORIES.filter((category) => category !== "unknown" && availableOptions(options).some((option) => option.category === category));
}

function serviceCategoryKey(label) {
  const slug = String(label || "").trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug ? `service:${slug}` : null;
}

function supportedServiceCategories(options = [], excludedLabels = []) {
  const excluded = new Set(excludedLabels.map((label) => String(label).trim().toLowerCase()));
  const seen = new Set();
  return availableOptions(options).flatMap((option) => {
    if (option.category === "unknown") return [];
    const label = String(option.providerServiceName || option.serviceLabel || "").trim();
    const normalized = label.toLowerCase();
    const isPrimaryLabel = {
      bike: ["bike", "moto", "motorcycle"],
      car: ["car", "cars"],
      mini: ["mini"],
      rickshaw: ["rickshaw", "auto"],
      other: ["other"],
    }[option.category]?.includes(normalized);
    if (!label || excluded.has(normalized) || isPrimaryLabel || hasFeature(option, "AC") || option.serviceTier === "premium") return [];
    const key = serviceCategoryKey(label);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ key, label }];
  });
}

function supportedFeatures(options = []) {
  return ["AC"].filter((feature) => availableOptions(options).some((option) => hasFeature(option, feature)));
}

function supportedServiceTiers(options = []) {
  return ["premium", "exclusive"].filter((tier) => availableOptions(options).some((option) => option.serviceTier === tier));
}

function filterOptions(options = [], filter) {
  if (!filter || filter === "all") return availableOptions(options);
  if (String(filter).startsWith("service:")) {
    return availableOptions(options).filter((option) => serviceCategoryKey(option.providerServiceName || option.serviceLabel) === filter);
  }
  if (["bike", "car", "mini", "rickshaw", "other", "unknown"].includes(filter)) return comparableOptions(options, filter);
  if (filter === "AC") return availableOptions(options).filter((option) => hasFeature(option, "AC"));
  if (["premium", "exclusive"].includes(filter)) return availableOptions(options).filter((option) => option.serviceTier === filter);
  return [];
}

function comparableOptions(options = [], category) {
  const candidates = availableOptions(options).filter((option) => option.category === category && category !== "unknown");
  const currencies = [...new Set(candidates.map((option) => option.currency))];
  if (currencies.length !== 1) return [];
  return candidates.sort((a, b) => a.fare - b.fare);
}

function bestComparableIds(options = []) {
  const ids = new Set();
  for (const category of supportedCategories(options)) {
    const [best] = comparableOptions(options, category);
    if (best) ids.add(best.optionId);
  }
  return ids;
}

function providerStatusRows(results = []) {
  return results
    .filter((result) => providerIdFor(result))
    .map((result) => ({
      providerId: providerIdFor(result),
      providerName: providerNameFor(result),
      available: availableOptions([result]).length > 0 || (Array.isArray(result.quotes) && result.quotes.some((quote) => quote.isAvailable === true && positiveFare(quote.fare) !== null)),
      reason: result.error?.message || result.error || result.status || "Unavailable",
    }));
}

module.exports = {
  CATEGORIES,
  canonicalVehicleCategory,
  flattenFareOptions,
  availableOptions,
  supportedCategories,
  supportedServiceCategories,
  serviceCategoryKey,
  supportedFeatures,
  supportedServiceTiers,
  filterOptions,
  hasFeature,
  comparableOptions,
  bestComparableIds,
  providerStatusRows,
  positiveFare,
};
