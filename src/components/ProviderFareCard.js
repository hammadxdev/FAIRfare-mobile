import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Badge from "./Badge";
import FareDisclaimer from "./FareDisclaimer";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { formatPKR, formatApproxPKR } from "../utils/formatCurrency";

const BADGE_TYPE_MAP = {
  Cheapest: "cheapest",
  Fastest: "fastest",
  Recommended: "recommended",
};

export default function ProviderFareCard({ result, onOpenApp }) {
  const { provider, fare, etaMin, badges = [], isRecommended, isAvailable = true, prediction, recommendation, personalization } = result;
  const displayBadges = badges.filter((badge) => badge !== "Fastest");
  const recommendationLabel = { BOOK_NOW: "Book now", WAIT: "Wait", NEUTRAL: "Fair / neutral", INSUFFICIENT_DATA: "Insufficient data" }[recommendation?.status];
  const vehicleLabel = result.categoryName || result.vehicleType || result.quotes?.[0]?.categoryName;

  return (
    <View style={[styles.card, (isRecommended || personalization?.isTopRecommendation) && styles.cardRecommended]}>
      {personalization?.isTopRecommendation && (
        <View style={styles.recommendedStrip}>
          <Text style={styles.recommendedStripText}>Recommended for You</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.providerName}>{provider.displayName}</Text>
          {vehicleLabel ? <Text style={styles.vehicle}>{vehicleLabel}</Text> : null}
        </View>
        <View style={styles.fareBlock}>
          <Text style={styles.fareLabel}>Current fare</Text>
          <Text style={styles.fare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{isAvailable ? formatPKR(fare) : "Unavailable"}</Text>
          {isAvailable && fare != null ? <FareDisclaimer /> : null}
        </View>
      </View>

      {isAvailable && prediction?.status === "AVAILABLE" && (
        <View style={styles.predictionBox}>
          <View style={styles.predictionCopy}>
            <Text style={styles.predictionLabel}>Expected fare</Text>
            {prediction.dataSource && prediction.dataSource !== "REAL" && (
              <Text style={styles.predictionNote}>Development prediction model • simulated training data</Text>
            )}
          </View>
          <Text style={styles.predictionFare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{formatApproxPKR(prediction.predictedFare)}</Text>
        </View>
      )}

      {personalization && (
        <View style={[styles.personalizationBox, personalization.isTopRecommendation && styles.personalizationTop]}>
          {!personalization.eligible ? (
            <Text style={styles.excludedText}>Excluded from your recommendations: {personalization.exclusionReason}</Text>
          ) : personalization.isTopRecommendation ? (
            <>
              <Text style={styles.personalizationTitle}>Recommended for You</Text>
              {personalization.reasons?.map((reason) => <Text key={reason} style={styles.personalizationReason}>✓ {reason}</Text>)}
            </>
          ) : null}
        </View>
      )}

      {isAvailable && recommendation && recommendation.status !== "INSUFFICIENT_DATA" && (
        <View style={[styles.recommendationBox, recommendation.status === "BOOK_NOW" && styles.recommendationBook, recommendation.status === "WAIT" && styles.recommendationWait]}>
          <View style={styles.recommendationHeader}>
            <Text style={styles.recommendationLabel}>Recommendation</Text>
            <Text style={[styles.recommendationStatus, recommendation.status === "BOOK_NOW" && styles.bookText, recommendation.status === "WAIT" && styles.waitText]}>{recommendationLabel}</Text>
          </View>
          <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
          {recommendation.status === "WAIT" && <Text style={styles.waitNote}>Waiting does not guarantee a lower fare.</Text>}
        </View>
      )}

      {displayBadges.length > 0 && (
        <View style={styles.badgeRow}>
          {displayBadges.map((badge) => (
            <Badge key={badge} label={badge} type={BADGE_TYPE_MAP[badge] || "default"} />
          ))}
        </View>
      )}

      {isAvailable && <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => onOpenApp(result)}>
          <Text style={styles.primaryButtonText} numberOfLines={1}>
            Open {provider.displayName}
          </Text>
        </TouchableOpacity>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  providerName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
  },
  vehicle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  fare: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  fareBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
    minWidth: 112,
    maxWidth: 150,
  },
  fareLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
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
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
});
