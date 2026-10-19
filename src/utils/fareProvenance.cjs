function fareProvenance(result) {
  const source = String(
    result?.source || result?.dataSource || result?.metadata?.dataSource || result?.metadata?.provenance || result?.provenance || "",
  ).toUpperCase();
  const fare = Number(result?.fare);
  const priceType = String(result?.priceType || result?.fareType || result?.metadata?.priceType || "").trim().toLowerCase();
  const ttlSeconds = Number(result?.metadata?.providerTtlSeconds ?? result?.providerTtlSeconds);
  const receivedAt = Number(result?.quoteReceivedAt);
  const expired = Number.isFinite(ttlSeconds) && ttlSeconds > 0 && Number.isFinite(receivedAt) && Date.now() >= receivedAt + ttlSeconds * 1000;
  if (expired || !result?.isAvailable || !Number.isFinite(fare) || fare <= 0 || !["REAL", "LIVE", "LIVE_PROVIDER", "PROVIDER_QUOTE"].includes(source)) {
    return { key: "unavailable", label: "Unavailable", detail: "No fare is available for this provider." };
  }
  if (["suggested", "negotiable", "recommended"].includes(priceType) || result?.isNegotiable === true) {
    return { key: "suggested", label: "Suggested fare", detail: "Provider-recommended amount; final fare may be negotiated." };
  }
  return { key: "live", label: "Live provider quote", detail: "Provided by the connected ride provider." };
}

module.exports = { fareProvenance };
