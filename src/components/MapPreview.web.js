import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors, { radius, spacing } from "../constants/colors";

// react-native-maps has no web renderer, so this must never import it — this
// stylized preview card stands in for the real map on `expo start --web`.
// Same props as MapPreview.native.js, but selectingMode/onMapPress are
// ignored since there's no map to tap on web.
const GRID_LINE_POSITIONS = ["20%", "40%", "60%", "80%"];

export default function MapPreview({ pickup, dropoff, routeInfo = null, isRouteLoading = false }) {
  const hasPickup = Boolean(pickup);
  const hasDropoff = Boolean(dropoff);
  const hasRoute = hasPickup && hasDropoff;

  return (
    <View style={styles.wrapper}>
      <View style={styles.gridBackground}>
        {GRID_LINE_POSITIONS.map((pos) => (
          <View key={`h-${pos}`} style={[styles.gridLineHorizontal, { top: pos }]} />
        ))}
        {GRID_LINE_POSITIONS.map((pos) => (
          <View key={`v-${pos}`} style={[styles.gridLineVertical, { left: pos }]} />
        ))}
      </View>

      {!hasPickup && !hasDropoff && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>Select pickup and drop-off to preview route</Text>
        </View>
      )}

      {hasRoute && <View style={styles.routeLine} />}

      {hasPickup && (
        <View style={[styles.markerWrap, styles.pickupPosition]}>
          <View style={[styles.dot, styles.pickupDot]} />
          <Text style={styles.markerLabel} numberOfLines={1}>
            {pickup.name}
          </Text>
        </View>
      )}

      {hasDropoff && (
        <View style={[styles.markerWrap, styles.dropoffPosition]}>
          <View style={[styles.dot, styles.dropoffDot]} />
          <Text style={styles.markerLabel} numberOfLines={1}>
            {dropoff.name}
          </Text>
        </View>
      )}

      {(hasPickup || hasDropoff) && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Route preview</Text>
          <Text style={styles.overlaySubtitle} numberOfLines={1}>
            {hasRoute
              ? `${pickup.name} → ${dropoff.name}`
              : hasPickup
              ? `Pickup: ${pickup.name}`
              : `Drop-off: ${dropoff.name}`}
          </Text>
          {isRouteLoading && <Text style={styles.overlaySubtitle}>Calculating route...</Text>}
          {!isRouteLoading && routeInfo && (
            <Text style={styles.overlayRoute}>
              {routeInfo.distanceKm} km • {routeInfo.durationMin} min
            </Text>
          )}
        </View>
      )}

      <View style={styles.webNotice}>
        <Text style={styles.webNoticeText}>Web preview only. Real map is available on mobile.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 300,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EAF6EE",
    position: "relative",
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    fontWeight: "600",
  },
  routeLine: {
    position: "absolute",
    top: 96,
    left: "22%",
    right: "22%",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    borderStyle: "dashed",
  },
  markerWrap: {
    position: "absolute",
    top: 78,
    width: 96,
    marginLeft: -48,
    alignItems: "center",
  },
  pickupPosition: {
    left: "18%",
  },
  dropoffPosition: {
    left: "82%",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  pickupDot: {
    backgroundColor: colors.accent,
  },
  dropoffDot: {
    backgroundColor: colors.navy,
  },
  markerLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  overlayTitle: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlaySubtitle: {
    color: "#E2E8F0",
    fontSize: 12,
    marginTop: 2,
  },
  overlayRoute: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  webNotice: {
    position: "absolute",
    top: spacing.sm,
    alignSelf: "center",
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  webNoticeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
});
