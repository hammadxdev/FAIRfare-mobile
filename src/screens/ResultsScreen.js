import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import colors, { radius, spacing } from "../constants/colors";
import { formatPKR } from "../utils/formatCurrency";
import { openProvider } from "../services/providerLauncher";

const { buildComparisonRouteSnapshot } = require("../services/comparisonRouteSnapshot.cjs");
const {
  flattenFareOptions,
  supportedCategories,
  supportedServiceCategories,
  supportedFeatures,
  supportedServiceTiers,
  filterOptions,
  bestComparableIds,
  providerStatusRows,
} = require("../utils/fareComparison.cjs");

const { SORT_OPTIONS, INDRIVE_SUGGESTED_FARE_LABEL, sortOptionsWithinCategories, fareSourceLabel, nearbyRequestStore, scheduleInDriveQuoteExpiry, scheduleNearbyFreshnessExpiry } = require("../utils/comparisonResults.cjs");

const CATEGORY_LABELS = { bike: "Bike", car: "Car", mini: "Mini", rickshaw: "Rickshaw", other: "Other", AC: "AC", premium: "Premium", exclusive: "Exclusive" };
const CATEGORY_ICONS = { bike: "🏍️", car: "🚗", mini: "🚕", rickshaw: "🛺", other: "🚕", unknown: "•" };

function providerActionLabel(providerId) {
  if (providerId === "indrive") return "Open inDrive";
  if (providerId === "yango" || providerId === "quickride") return "Open Yango";
  if (providerId === "urbancab" || providerId === "bykea") return "Open Bykea";
  return "Open provider";
}

function safeErrorText(reason) {
  if (typeof reason !== "string") return "Not available right now.";
  if (/token|secret|password|authorization|device|coordinate|latitude|longitude/i.test(reason)) return "Not available right now.";
  return reason.length > 80 ? `${reason.slice(0, 77)}…` : reason;
}
export default function ResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const result = route.params?.result;
  const rawResults = result?.results || [];
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedOption, setSelectedOption] = useState(null);
  const [sortMode, setSortMode] = useState("price");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [nearbySnapshot, setNearbySnapshot] = useState(result?.nearbyDrivers || null);
  const [quoteExpiryRevision, setQuoteExpiryRevision] = useState(0);
  const [nearbyFreshnessRevision, setNearbyFreshnessRevision] = useState(0);
  useEffect(() => {
    const requestKey = result?.nearbyRequestKey;
    if (!requestKey) { setNearbySnapshot(result?.nearbyDrivers || null); return undefined; }
    setNearbySnapshot(nearbyRequestStore.get(requestKey) || result?.nearbyDrivers || null);
    const unsubscribe = nearbyRequestStore.subscribe(requestKey, (snapshot) => setNearbySnapshot(snapshot));
    return () => { unsubscribe(); nearbyRequestStore.clear(requestKey); };
  }, [result?.nearbyRequestKey]);
  const options = useMemo(() => flattenFareOptions(rawResults), [rawResults]);
  const categoryOptions = useMemo(() => filterOptions(options, selectedCategory), [options, selectedCategory]);
  const categories = useMemo(() => supportedCategories(options), [options]);
  const featureFilters = useMemo(() => supportedFeatures(options), [options]);
  const tierFilters = useMemo(() => supportedServiceTiers(options), [options]);
  const serviceCategories = useMemo(() => supportedServiceCategories(options, [...featureFilters, ...tierFilters]), [options, featureFilters, tierFilters]);
  const bestIds = useMemo(() => bestComparableIds(options), [options]);
  useEffect(() => scheduleInDriveQuoteExpiry(
    categoryOptions,
    () => setQuoteExpiryRevision((revision) => revision + 1),
  ), [categoryOptions, quoteExpiryRevision]);
  useEffect(() => scheduleNearbyFreshnessExpiry(
    nearbySnapshot,
    () => setNearbyFreshnessRevision((revision) => revision + 1),
  ), [nearbySnapshot, selectedCategory, nearbyFreshnessRevision]);

  if (!result) {
    return <View style={styles.flex}><EmptyState icon="🔍" title="No comparison yet" message="Go back to Home and search for a ride to see fare comparisons here." /></View>;
  }

  const { pickup, dropoff, distanceKm, durationMin } = result;
  const comparisonRoute = buildComparisonRouteSnapshot(result);
  const filtered = sortOptionsWithinCategories(categoryOptions, sortMode, nearbySnapshot);
  const actionOption = filtered.find((option) => option.optionId === selectedOption?.optionId) || filtered[0] || null;
  const statuses = providerStatusRows(rawResults).filter((status) => !status.available);

  const openOption = (option) => openProvider(option?.providerName || "", comparisonRoute || {});
  const askAi = () => navigation.navigate("MainTabs", { screen: "AI Chat", params: { comparisonId: result.comparisonId, contextLabel: `${pickup?.name} → ${dropoff?.name}` } });

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <View style={[styles.screen, { paddingTop: Math.max(spacing.xs, insets.top / 2), paddingBottom: Math.max(spacing.xs, insets.bottom / 2) }]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.title}>Compare Fares</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.tripCard}>
          <View style={styles.locationRow}><View style={[styles.locationDot, { backgroundColor: colors.accent }]} /><Text numberOfLines={1} style={styles.locationText}>{pickup?.name || "Pickup"}</Text></View>
          <View style={styles.routeLine} />
          <View style={styles.locationRow}><View style={[styles.locationDot, { backgroundColor: colors.navy }]} /><Text numberOfLines={1} style={styles.locationText}>{dropoff?.name || "Destination"}</Text></View>
          <View style={styles.tripMeta}><Text style={styles.metaText}>{distanceKm} km</Text><Text style={styles.metaDivider}>•</Text><Text style={styles.metaText}>{durationMin} min</Text></View>
        </View>

        <ScrollView horizontal style={styles.chipScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[{ key: "all", label: "All" }, ...categories.map((category) => ({ key: category, label: CATEGORY_LABELS[category] || category })), ...serviceCategories, ...featureFilters.map((feature) => ({ key: feature, label: CATEGORY_LABELS[feature] || feature })), ...tierFilters.map((tier) => ({ key: tier, label: CATEGORY_LABELS[tier] || tier }))].map(({ key: category, label }) => (
            <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === category }} onPress={() => { setSelectedCategory(category); setSelectedOption(null); }} style={[styles.chip, selectedCategory === category && styles.chipSelected]}>
              <Text style={[styles.chipText, selectedCategory === category && styles.chipTextSelected]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <View style={styles.sortControl}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Sort by ${SORT_OPTIONS.find((item) => item.value === sortMode)?.label}`} accessibilityState={{ expanded: sortMenuOpen }} onPress={() => setSortMenuOpen((open) => !open)} style={styles.sortButton}>
              <Text style={styles.sortButtonText}>{SORT_OPTIONS.find((item) => item.value === sortMode)?.label || "Lowest Price"}⌄</Text>
            </Pressable>
            {sortMenuOpen ? <View style={styles.sortMenu}>{SORT_OPTIONS.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: sortMode === item.value }} onPress={() => { setSortMode(item.value); setSortMenuOpen(false); }} style={styles.sortMenuOption}><Text style={[styles.sortMenuText, sortMode === item.value && styles.sortMenuTextSelected]}>{item.label}</Text></Pressable>)}</View> : null}
          </View>
        </View>
        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? <View style={styles.emptyResults}><Text style={styles.emptyTitle}>No comparable fares</Text><Text style={styles.emptyText}>Available estimates will appear here when providers respond.</Text></View> : null}
          {filtered.map((option) => (
            <Pressable key={option.optionId} accessibilityRole="button" accessibilityState={{ selected: selectedOption?.optionId === option.optionId }} onPress={() => setSelectedOption(option)} style={[styles.fareRow, selectedOption?.optionId === option.optionId && styles.fareRowSelected]}>
              <Text style={styles.vehicleIcon}>{CATEGORY_ICONS[option.category] || CATEGORY_ICONS.unknown}</Text>
              <View style={styles.fareDetails}>
                <View style={styles.fareTitleLine}><Text numberOfLines={1} style={styles.providerName}>{option.providerName}</Text>{bestIds.has(option.optionId) && selectedCategory !== "all" ? <Text style={styles.bestBadge}>BEST</Text> : null}</View>
                <Text numberOfLines={1} style={styles.serviceLabel}>{option.serviceLabel}{option.category !== "unknown" ? ` · ${CATEGORY_LABELS[option.category]}` : ""}{option.features.includes("AC") ? " · AC" : ""}</Text>
                {option.providerId === "indrive" ? <Text style={styles.indriveNotice}>{INDRIVE_SUGGESTED_FARE_LABEL}</Text> : null}
              </View>
              <View style={styles.fareRight}>
                <Text style={styles.fareAmount}>{option.currency === "PKR" ? formatPKR(option.fare) : `${option.currency || ""} ${option.fare}`}</Text>
                <Text style={styles.estimateText}>{fareSourceLabel(option)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}

          {statuses.length > 0 ? <Text style={styles.sectionLabel}>Unavailable providers</Text> : null}
          {statuses.map((status) => <View key={status.providerId} style={styles.statusRow}><Text style={styles.statusName}>{status.providerName} · Not available</Text><Text numberOfLines={1} style={styles.statusReason}>{safeErrorText(status.reason)}</Text></View>)}
          <Pressable accessibilityRole="button" disabled={!result.comparisonId} onPress={askAi} style={[styles.aiButton, !result.comparisonId && styles.disabledButton]}><Text style={styles.aiButtonText}>Ask AI about these rides</Text></Pressable>
          <Text style={styles.disclaimer}>Estimates may change before booking.</Text>
        </ScrollView>
        <View style={styles.actionBar}>
          <Pressable accessibilityRole="button" disabled={!actionOption} onPress={() => openOption(actionOption)} style={[styles.openButton, !actionOption && styles.disabledButton]}>
            <Text style={styles.openButtonText}>{actionOption ? providerActionLabel(actionOption.providerId) : "No ride available"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, paddingHorizontal: spacing.md, minHeight: 0 },
  topBar: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  backButton: { width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" },
  backText: { fontSize: 34, lineHeight: 36, color: colors.primary },
  topBarSpacer: { width: 48 },
  title: { flex: 1, textAlign: "center", color: colors.primary, fontSize: 20, fontWeight: "800" },
  tripCard: { backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.outlineVariant },
  locationRow: { flexDirection: "row", alignItems: "center", minHeight: 28 },
  locationDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  locationText: { flex: 1, color: colors.primary, fontSize: 14, fontWeight: "600" },
  routeLine: { width: 1, height: 10, marginLeft: 4, backgroundColor: colors.outline },
  tripMeta: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  metaText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  metaDivider: { color: colors.outline, marginHorizontal: spacing.sm },
  chipScroller: { flexGrow: 0, flexShrink: 0, height: 48 },
  chips: { flexGrow: 0, alignItems: "center", height: 48, gap: spacing.sm },
  chip: { height: 40, minHeight: 40, flexGrow: 0, flexShrink: 0, alignSelf: "center", paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.outline, justifyContent: "center" },
  chipSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: colors.white },
  sortRow: { minHeight: 38, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.xs, zIndex: 2 },
  sortLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  sortControl: { position: "relative", zIndex: 3 },
  sortButton: { minHeight: 32, borderWidth: 1, borderColor: colors.outline, borderRadius: radius.full, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, justifyContent: "center" },
  sortButtonText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  sortMenu: { position: "absolute", top: 34, right: 0, minWidth: 136, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, elevation: 5, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, zIndex: 5 },
  sortMenuOption: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.sm },
  sortMenuText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  sortMenuTextSelected: { color: colors.forest },
  indriveNotice: { color: colors.textSecondary, fontSize: 9, lineHeight: 12, marginTop: 3 },
  results: { flex: 1, minHeight: 0 },
  resultsContent: { paddingBottom: spacing.md, gap: spacing.sm },
  fareRow: { minHeight: 72, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fareRowSelected: { borderColor: colors.primaryDark, backgroundColor: colors.softGreen, borderWidth: 2 },
  vehicleIcon: { width: 34, textAlign: "center", fontSize: 21 },
  fareDetails: { flex: 1, minWidth: 0 },
  fareTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  providerName: { flexShrink: 1, color: colors.primary, fontSize: 14, fontWeight: "800" },
  serviceLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  bestBadge: { color: colors.success, fontSize: 9, fontWeight: "900" },
  fareRight: { alignItems: "flex-end", minWidth: 112 },
  fareAmount: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  estimateText: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  chevron: { width: 24, textAlign: "center", color: colors.outline, fontSize: 26 },
  actionBar: { paddingTop: spacing.sm, paddingBottom: spacing.xs, backgroundColor: colors.background },
  openButton: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  openButtonText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  sectionLabel: { color: colors.primary, fontSize: 13, fontWeight: "900", marginTop: spacing.sm },
  statusRow: { minHeight: 48, paddingHorizontal: spacing.sm, justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  statusName: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
  statusReason: { color: colors.muted, fontSize: 10, marginTop: 2 },
  emptyResults: { padding: spacing.lg, alignItems: "center", backgroundColor: colors.surfaceContainer, borderRadius: radius.md },
  emptyTitle: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  emptyText: { color: colors.textSecondary, textAlign: "center", fontSize: 12, marginTop: spacing.xs },
  aiButton: { minHeight: 32, alignItems: "center", justifyContent: "center", marginTop: spacing.xs, paddingHorizontal: spacing.sm },
  disabledButton: { opacity: 0.5 },
  aiButtonText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  disclaimer: { color: colors.muted, fontSize: 10, textAlign: "center", paddingVertical: spacing.xs },
});
