import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import ProviderFareCard from "../components/ProviderFareCard";
import EmptyState from "../components/EmptyState";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { openProvider } from "../services/providerLauncher";

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ResultsScreen({ route, navigation }) {
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

  const { pickup, dropoff, vehicleType, distanceKm, durationMin, results = [] } = result;

  const handleOpenApp = (providerResult) => openProvider(providerResult.provider.name, { pickup, destination: dropoff });
  const handleAskAi = () => navigation.navigate("MainTabs", { screen: "AI Chat", params: { comparisonId: result.comparisonId, contextLabel: `${pickup?.name} → ${dropoff?.name}` } });

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
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
            <Text style={styles.metaLabel}>Vehicle</Text>
            <Text style={styles.metaValue}>{capitalize(vehicleType)}</Text>
          </View>
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

      <TouchableOpacity style={styles.askAiButton} onPress={handleAskAi} disabled={!result.comparisonId}>
        <Text style={styles.askAiText}>{result.comparisonId ? "Ask AI about these rides" : "AI context unavailable"}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{results.length} providers compared</Text>

      {results.length > 0 && !results.some((item) => item.personalization?.isTopRecommendation) && (
        <Text style={styles.noPersonalizedMatch}>No available ride matches your current vehicle preferences.</Text>
      )}

      {results.length === 0 && <Text style={styles.noPersonalizedMatch}>No provider quotes are currently available. Please try again later.</Text>}

      {results.map((item) => (
        <ProviderFareCard
          key={item.provider.id}
          result={item}
          onOpenApp={handleOpenApp}
        />
      ))}

      <Text style={styles.disclaimer}>
        Fares are estimated for comparison only and may differ from the actual app price.
      </Text>
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
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
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
    marginTop: spacing.lg,
    paddingTop: spacing.md,
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
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  noPersonalizedMatch: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  askAiButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginBottom: spacing.lg },
  askAiText: { color: colors.white, fontWeight: "800", fontSize: 13 },
});
