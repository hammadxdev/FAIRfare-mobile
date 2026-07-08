import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Badge from "./Badge";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { formatCurrency } from "../utils/formatCurrency";

const BADGE_TYPE_MAP = {
  Cheapest: "cheapest",
  Fastest: "fastest",
  Recommended: "recommended",
};

export default function ProviderFareCard({ result, onOpenApp, onViewBreakdown }) {
  const { provider, fare, etaMin, badges = [], isRecommended } = result;

  return (
    <View style={[styles.card, isRecommended && styles.cardRecommended]}>
      {isRecommended && (
        <View style={styles.recommendedStrip}>
          <Text style={styles.recommendedStripText}>Best overall match</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.providerName}>{provider.displayName}</Text>
          <Text style={styles.eta}>{etaMin} min pickup</Text>
        </View>
        <Text style={styles.fare}>{formatCurrency(fare)}</Text>
      </View>

      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <Badge key={badge} label={badge} type={BADGE_TYPE_MAP[badge] || "default"} />
          ))}
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => onViewBreakdown(result)}
        >
          <Text style={styles.secondaryButtonText}>Fare Breakdown</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => onOpenApp(result)}>
          <Text style={styles.primaryButtonText}>Open App</Text>
        </TouchableOpacity>
      </View>
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
  providerName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
  },
  eta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  fare: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
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
