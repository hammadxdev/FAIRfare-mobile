import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import Badge from "./Badge";
import FareDisclaimer from "./FareDisclaimer";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { formatPKR, formatApproxPKR } from "../utils/formatCurrency";
const { fareProvenance } = require("../utils/fareProvenance.cjs");
const { getIndriveVehicleImage } = require("../constants/indriveVehicleAssets");

const BADGE_TYPE_MAP = {
  Cheapest: "cheapest",
  Fastest: "fastest",
  Recommended: "recommended",
};

export default function ProviderFareCard({ result, onOpenApp, compact = false }) {
  const { provider, fare, etaMin, badges = [], isRecommended, isAvailable = true, prediction, recommendation, personalization } = result;
  const displayBadges = badges.filter((badge) => badge !== "Fastest");
  const recommendationLabel = { BOOK_NOW: "Book now", WAIT: "Wait", NEUTRAL: "Fair / neutral", INSUFFICIENT_DATA: "Insufficient data" }[recommendation?.status];
  const isIndrive = String(provider?.name || provider?.id || "").toLowerCase() === "indrive";
  const vehicleLabel = result.categoryName || (isIndrive && result.categoryId ? `Category ${result.categoryId}` : result.vehicleType || result.quotes?.[0]?.categoryName);
  const quote = result.quotes?.find((item) => Number(item?.fare) === Number(fare)) || result.quotes?.[0] || result;
  const fareMin = quote.fareMin ?? result.fareMin;
  const fareMax = quote.fareMax ?? result.fareMax;
  const quoteTtlSeconds = quote.metadata?.providerTtlSeconds ?? result.metadata?.providerTtlSeconds ?? result.providerTtlSeconds;
  const displayFare = quote.displayFare ?? result.displayFare;
  const startingFare = quote.startingFare ?? result.startingFare;
  const pickupEtaSeconds = quote.pickupEtaSeconds ?? result.pickupEtaSeconds;
  const isYango = String(provider?.id || provider?.name || "").toLowerCase() === "yango";
  const provenance = fareProvenance(result);
  const hasLiveFare = provenance.key === "live";
  const hasSuggestedFare = provenance.key === "suggested";
  const hasUsableFare = hasLiveFare || hasSuggestedFare;
  const canOpenIndrive = Boolean(onOpenApp) && hasLiveFare && isIndrive;
  const vehicleImage = isIndrive
    ? getIndriveVehicleImage(result.categoryId)
    : null;

  if (compact) {
    return (
      <View style={styles.compactFareRow}>
        {vehicleImage ? <Image source={vehicleImage} style={styles.compactVehicleImage} resizeMode="contain" accessibilityLabel={`${vehicleLabel || "Vehicle"} vehicle`} /> : <View style={styles.compactVehiclePlaceholder} />}
        <Text style={styles.compactVehicleName} numberOfLines={1}>{vehicleLabel || "Vehicle"}</Text>
        <View style={styles.compactFareBlock}>
          <Text style={styles.compactFareLabel}>{hasLiveFare ? "LIVE" : hasSuggestedFare ? "SUGGESTED" : "UNAVAILABLE"}</Text>
          <Text style={styles.compactFare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{hasUsableFare ? formatPKR(fare) : "—"}</Text>
          {isYango && hasLiveFare && Number.isFinite(Number(displayFare)) && Number(displayFare) !== Number(fare) ? <Text style={styles.compactDetail}>Card {formatPKR(displayFare)}</Text> : null}
          {isYango && Number.isFinite(Number(startingFare)) ? <Text style={styles.compactDetail}>From {formatPKR(startingFare)}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact, (isRecommended || personalization?.isTopRecommendation) && styles.cardRecommended]}>
      <View style={styles.compactRow}>
        {vehicleImage ? <Image source={vehicleImage} style={[styles.vehicleImage, compact && styles.vehicleImageCompact]} resizeMode="contain" accessibilityLabel={`${vehicleLabel || "Vehicle"} vehicle`} /> : null}
        <View style={styles.headerCopy}>
          <Text style={[styles.vehicle, compact && styles.vehicleCompact]} numberOfLines={2}>{vehicleLabel || "Vehicle"}</Text>
          {displayBadges.length > 0 ? <View style={styles.badgeRow}>{displayBadges.slice(0, 2).map((badge) => <Badge key={badge} label={badge} type={BADGE_TYPE_MAP[badge] || "default"} />)}</View> : null}
        </View>
        <View style={styles.fareBlock}>
          <Text style={styles.fareLabel}>{hasLiveFare ? "LIVE PKR" : hasSuggestedFare ? "SUGGESTED PKR" : provenance.label}</Text>
          <Text style={styles.fare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{hasUsableFare ? formatPKR(fare) : "Unavailable"}</Text>
          {hasLiveFare && isYango && Number.isFinite(Number(displayFare)) && Number(displayFare) !== Number(fare) ? <Text style={styles.provenanceDetail}>Card {formatPKR(displayFare)}</Text> : null}
          {isYango && Number.isFinite(Number(startingFare)) ? <Text style={styles.provenanceDetail}>From {formatPKR(startingFare)}</Text> : null}
          {hasLiveFare && Number.isFinite(Number(fareMin)) && Number.isFinite(Number(fareMax)) ? <Text style={styles.provenanceDetail}>{formatPKR(fareMin)}–{formatPKR(fareMax)}</Text> : null}
          {hasLiveFare && Number.isFinite(Number(quoteTtlSeconds)) ? <Text style={styles.provenanceDetail}>Valid {Math.round(Number(quoteTtlSeconds) / 60)} min</Text> : null}
        </View>
      </View>
      {hasUsableFare ? <FareDisclaimer /> : null}
      {isYango && Number.isFinite(Number(pickupEtaSeconds)) ? <Text style={styles.provenanceDetail}>Pickup estimate {Math.round(Number(pickupEtaSeconds) / 60)} min</Text> : null}
      {hasLiveFare && prediction?.status === "AVAILABLE" && prediction.dataSource === "REAL" ? <Text style={styles.predictionInline}>Expected {formatApproxPKR(prediction.predictedFare)}</Text> : null}
      {canOpenIndrive ? <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => onOpenApp(result)}><Text style={styles.primaryButtonText}>Open inDrive</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  cardCompact: { padding: 4, marginBottom: 2, borderWidth: 1 },
  compactFareRow: { minHeight: 34, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 },
  compactVehicleImage: { width: 32, height: 26, marginRight: spacing.xs },
  compactVehiclePlaceholder: { width: 32, height: 26, marginRight: spacing.xs },
  compactVehicleName: { flex: 1, minWidth: 0, color: colors.primary, fontSize: 11, fontWeight: "700" },
  compactFareBlock: { alignItems: "flex-end", minWidth: 92, maxWidth: 118 },
  compactFareLabel: { color: colors.muted, fontSize: 8, fontWeight: "800" },
  compactFare: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  compactDetail: { color: colors.muted, fontSize: 8, lineHeight: 9 },
  cardRecommended: {
    borderColor: colors.accent,
    backgroundColor: "#F0FDF4",
  },
  recommendedStrip: {
    alignSelf: "flex-start",
    backgroundColor: colors.navy,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  recommendedStripText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  vehicle: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "800",
  },
  vehicleCompact: { fontSize: 12 },
  vehicleImage: { width: 62, height: 48, marginRight: spacing.xs },
  vehicleImageCompact: { width: 40, height: 30 },
  fare: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  fareBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
    minWidth: 102,
    maxWidth: 132,
  },
  fareLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  provenanceDetail: { color: colors.muted, fontSize: 9, lineHeight: 12, textAlign: "right", marginTop: 2, maxWidth: 132 },
  predictionInline: { color: colors.navy, fontSize: 10, fontWeight: "700", textAlign: "right", marginTop: spacing.xs },
  predictionBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  predictionCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  predictionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  predictionNote: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },
  predictionFare: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    flexShrink: 0,
    maxWidth: 122,
  },
  recommendationBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationBook: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  recommendationWait: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  recommendationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recommendationLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  recommendationStatus: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  bookText: { color: "#15803D" },
  waitText: { color: "#C2410C" },
  recommendationReason: { color: colors.primary, fontSize: 12, lineHeight: 17, marginTop: 6 },
  personalizationBox: { marginTop: spacing.md },
  personalizationTop: { backgroundColor: "#ECFDF5", borderRadius: radius.md, borderWidth: 1, borderColor: "#A7F3D0", padding: spacing.md },
  personalizationTitle: { color: "#047857", fontSize: 13, fontWeight: "900", marginBottom: 4 },
  personalizationReason: { color: colors.primary, fontSize: 12, lineHeight: 18 },
  excludedText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  waitNote: { color: "#9A3412", fontSize: 11, lineHeight: 16, marginTop: 5 },
  developmentNote: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 6 },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
});
