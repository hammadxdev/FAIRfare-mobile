import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import EmptyState from "../components/EmptyState";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { formatCurrency } from "../utils/formatCurrency";

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function BreakdownRow({ label, value, emphasis }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowLabelEmphasis]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

export default function FareBreakdownScreen({ route }) {
  const result = route.params?.result;
  const context = route.params?.context || {};

  if (!result) {
    return (
      <View style={styles.flex}>
        <EmptyState icon="🧾" title="No breakdown available" message="Open this screen from a fare result card." />
      </View>
    );
  }

  const { provider, breakdown = {}, etaMin } = result;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.providerName}>{provider.displayName}</Text>
        <Text style={styles.finalFare}>{formatCurrency(breakdown.finalFare)}</Text>
        <Text style={styles.eta}>{etaMin} min pickup</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fare Breakdown</Text>
        <BreakdownRow label="Base fare" value={formatCurrency(breakdown.baseFare)} />
        <BreakdownRow label="Distance fare" value={formatCurrency(breakdown.distanceFare)} />
        <BreakdownRow label="Time fare" value={formatCurrency(breakdown.timeFare)} />
        <BreakdownRow label="Surge multiplier" value={`x${breakdown.surgeMultiplier}`} />
        <BreakdownRow label="Minimum fare" value={formatCurrency(breakdown.minimumFare)} />
        <View style={styles.divider} />
        <BreakdownRow label="Final fare" value={formatCurrency(breakdown.finalFare)} emphasis />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Details</Text>
        <BreakdownRow label="Provider" value={provider.displayName} />
        <BreakdownRow label="Vehicle type" value={capitalize(context.vehicleType)} />
        <BreakdownRow label="Distance" value={`${context.distanceKm} km`} />
        <BreakdownRow label="Duration" value={`${context.durationMin} min`} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  providerName: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  finalFare: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  eta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  rowLabelEmphasis: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  rowValueEmphasis: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
