import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ProviderFareCard from "../components/ProviderFareCard";
import EmptyState from "../components/EmptyState";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { openProvider } from "../services/providerLauncher";
const { buildComparisonRouteSnapshot } = require("../services/comparisonRouteSnapshot.cjs");
const { expandProviderResults } = require("../utils/indriveQuotes.cjs");
const { fareProvenance } = require("../utils/fareProvenance.cjs");
const { expandYangoResults, yangoUiState, providerKey } = require("../utils/yangoQuotes.cjs");

function hasValidCoordinatePair(location) {
  const latitudeValue = location?.lat ?? location?.latitude;
  const longitudeValue = location?.lng ?? location?.longitude;
  if (latitudeValue === null || latitudeValue === undefined || latitudeValue === "" || longitudeValue === null || longitudeValue === undefined || longitudeValue === "") return false;
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function fareIsLive(result) {
  const key = fareProvenance(result).key;
  return key === "live" || key === "suggested";
}

function isInDrive(result) {
  return providerKey(result) === "indrive";
}

function unavailableReason(result, fallback) {
  const code = typeof result?.error === "string" ? result.error : result?.error?.code;
  if (code === "PROVIDER_AUTH_REQUIRED" || code === "AUTH_REQUIRED") return "Authentication is required for live pricing.";
  if (code === "LIVE_INTEGRATION_NOT_CONFIGURED" || code === "PROVIDER_NOT_CONFIGURED") return "Live pricing is not configured.";
  if (code === "PROVIDER_BAD_RESPONSE") return "The provider returned no usable fare categories.";
  if (code === "PROVIDER_TIMEOUT") return "The provider did not respond in time.";
  return fallback;
}

export default function ResultsScreen({ route, navigation }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const result = route.params?.result;

  if (!result) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="🔍"
          title="No comparison yet"
          message="Go back to Home and search for a ride to see fare comparisons here."
        />
      </View>
    );
  }

  const { pickup, dropoff, distanceKm, durationMin, results = [] } = result;
  const comparisonRoute = buildComparisonRouteSnapshot(result);
  const displayResults = expandProviderResults(results);
  const inDriveResults = displayResults.filter(isInDrive);
  const liveInDriveResults = inDriveResults.filter((item) => fareIsLive(item));
  const inDriveResult = results.find(isInDrive);
  const yangoState = yangoUiState(results);
  const yangoResults = expandYangoResults(results);
  const yangoResult = results.find((item) => ["yango", "quickride"].includes(providerKey(item)));
  const compact = height < 900;
  const verySmall = height < 650;
  const availableYangoResults = yangoResults.filter((item) => item.isAvailable);
  const unavailableYangoResults = yangoResults.filter((item) => !item.isAvailable);
  const visibleYangoResults = verySmall ? availableYangoResults : yangoResults;

  if (__DEV__) {
    console.info("[fare] ResultsScreen response diagnostics", {
      topLevelKeys: Object.keys(result).sort(),
      parsedProviders: results.map((item) => ({
        providerId: item?.provider?.id || null,
        resolvedProviderCode: providerKey(item) || null,
        rawCategoryCount: Array.isArray(item?.quotes) ? item.quotes.length : 0,
        postFilterCategoryCount: providerKey(item) === "indrive"
          ? expandProviderResults([item]).length
          : providerKey(item) === "quickride" || providerKey(item) === "yango"
            ? expandYangoResults([item]).length
            : 0,
        renderedLiveOptionCount: providerKey(item) === "indrive"
          ? expandProviderResults([item]).filter(fareIsLive).length
          : providerKey(item) === "quickride" || providerKey(item) === "yango"
            ? expandYangoResults([item]).filter((quote) => quote.isAvailable === true && fareIsLive(quote)).length
            : 0,
        exactFareCount: Array.isArray(item?.quotes) ? item.quotes.filter((quote) => Number.isFinite(Number(quote?.fare)) && Number(quote.fare) > 0 && quote?.isAvailable === true).length : 0,
        displayOnlyCount: Array.isArray(item?.quotes) ? item.quotes.filter((quote) => quote?.displayFare != null && quote?.fare == null).length : 0,
        unavailableCount: Array.isArray(item?.quotes) ? item.quotes.filter((quote) => quote?.isAvailable === false || quote?.availability === "unavailable").length : 0,
        source: item?.source || item?.quotes?.[0]?.source || null,
        dataSource: item?.dataSource || item?.quotes?.[0]?.dataSource || item?.metadata?.dataSource || null,
        filterRejectionReason: !providerKey(item) ? "provider_identity_missing" : null,
      })),
    });
  }

  const handleOpenApp = (providerResult, fallbackProviderId) => {
    const providerId = providerResult?.provider?.name || fallbackProviderId;
    if (__DEV__) {
      console.log("[ProviderLaunch] button handler", providerId, {
        pickupValid: hasValidCoordinatePair(pickup),
        destinationValid: hasValidCoordinatePair(dropoff),
      });
    }
    return openProvider(providerId, comparisonRoute || {});
  };
  const handleAskAi = () => navigation.navigate("MainTabs", { screen: "AI Chat", params: { comparisonId: result.comparisonId, contextLabel: `${pickup?.name} → ${dropoff?.name}` } });

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <View style={[styles.content, compact && styles.contentCompact, { paddingTop: Math.max(spacing.xs, insets.top / 2), paddingBottom: Math.max(spacing.xs, insets.bottom / 2) }]}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEyebrow}>TRIP SUMMARY</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeDotAccent} />
          <Text style={styles.routeText} numberOfLines={1}>
            {pickup?.name}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={styles.routeDotDanger} />
          <Text style={styles.routeText} numberOfLines={1}>
            {dropoff?.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Distance</Text>
            <Text style={styles.metaValue}>{distanceKm} km</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue}>{durationMin} min</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.askAiButton, compact && styles.buttonCompact]} onPress={handleAskAi} disabled={!result.comparisonId}>
        <Text style={styles.askAiText}>{result.comparisonId ? "Ask AI about these rides" : "AI context unavailable"}</Text>
      </TouchableOpacity>

      <View style={[styles.providerSection, compact && styles.providerSectionCompact]}>
        <View style={styles.providerSectionHeader}>
          <Text style={styles.sectionTitle}>inDrive</Text>
          <Text style={styles.sectionMeta}>{liveInDriveResults.length} {liveInDriveResults.length === 1 ? "option" : "options"}</Text>
        </View>
        {liveInDriveResults.length === 0 ? <Text style={styles.unavailableText}>{unavailableReason(inDriveResult, "Live inDrive prices are currently unavailable.")}</Text> : null}
        {liveInDriveResults.map((item, index) => (
          <ProviderFareCard
            key={`${item.provider?.id || item.provider?.name || "indrive"}-${item.categoryId || "category"}-${index}`}
            result={item}
            compact
          />
        ))}
        <TouchableOpacity style={[styles.providerButton, compact && styles.buttonCompact]} onPress={() => handleOpenApp(liveInDriveResults[0] || inDriveResult, "indrive")}><Text style={styles.providerButtonText}>Open inDrive</Text></TouchableOpacity>
      </View>

      <View style={[styles.providerSection, compact && styles.providerSectionCompact]}>
        <View style={styles.providerSectionHeader}>
          <Text style={styles.sectionTitle}>Yango</Text>
          <Text style={styles.sectionMeta}>{yangoState.authorized ? `${availableYangoResults.length} options` : "Unavailable"}</Text>
        </View>
        {!yangoState.authorized ? <Text style={styles.unavailableText}>{unavailableReason(yangoResult, "Yango live pricing is currently unavailable.")}</Text> : null}
        {visibleYangoResults.map((item) => (
          <ProviderFareCard key={`yango-${item.categoryId}`} result={item} compact />
        ))}
        {verySmall && unavailableYangoResults.length > 0 ? <Text style={styles.compactUnavailableNote}>{unavailableYangoResults.length} unavailable category{unavailableYangoResults.length === 1 ? "" : "ies"}</Text> : null}
        <TouchableOpacity style={[styles.providerButton, compact && styles.buttonCompact]} onPress={() => handleOpenApp(yangoResults.find((item) => item.isAvailable) || yangoResult, "quickride")}><Text style={styles.providerButtonText}>Open Yango</Text></TouchableOpacity>
      </View>

      <View style={[styles.providerSection, styles.bykeaSection, compact && styles.providerSectionCompact]}>
        <Text style={styles.bykeaText}>Bykea — Live fares unavailable</Text>
        <TouchableOpacity style={[styles.providerButton, compact && styles.buttonCompact]} onPress={() => handleOpenApp({ provider: { name: "urbancab" } })}><Text style={styles.providerButtonText}>Open Bykea</Text></TouchableOpacity>
      </View>

      <Text style={[styles.disclaimer, compact && styles.disclaimerCompact]}>
        Prices shown here are live provider estimates and may change before booking.
      </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: "space-between" },
  contentCompact: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow,
  },
  summaryEyebrow: { color: colors.forest, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: spacing.xs },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDotAccent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  routeDotDanger: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    marginRight: spacing.sm,
  },
  routeConnector: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    alignItems: "flex-start",
  },
  metaLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  providerSection: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.xs, ...shadow },
  providerSectionCompact: { padding: spacing.xs, marginBottom: 2 },
  providerSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: colors.primary },
  sectionMeta: { color: colors.forest, fontSize: 10, fontWeight: "800" },
  unavailableSection: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.xs },
  unavailableSectionCompact: { padding: spacing.xs, marginBottom: 2 },
  unavailableText: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  compactUnavailableNote: { color: colors.muted, fontSize: 9, lineHeight: 12, marginTop: 2 },
  bykeaSection: { backgroundColor: colors.surfaceMuted },
  bykeaText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  disclaimerCompact: { fontSize: 9 },
  askAiButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 9, alignItems: "center", marginBottom: spacing.sm },
  buttonCompact: { paddingVertical: 6 },
  providerButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 8, alignItems: "center", marginTop: spacing.xs },
  providerButtonText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  askAiText: { color: colors.white, fontWeight: "800", fontSize: 13 },
});
