import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { getRegionForPoints } from "../utils/mapRegion";

const SELECTING_MODES = ["pickup", "dropoff"];

export default function MapPreview({
  pickup,
  dropoff,
  routeCoordinates = [],
  routeInfo = null,
  selectingMode = "pickup",
  onSelectingModeChange,
  onMapPress,
  isRouteLoading = false,
}) {
  const mapRef = useRef(null);
  const region = useMemo(() => getRegionForPoints(pickup, dropoff), [pickup, dropoff]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Prefer fitting to the real route shape; fall back to just the two
    // markers (or the default region) when there's no route yet.
    const coordsToFit =
      routeCoordinates.length > 1
        ? routeCoordinates
        : pickup && dropoff
        ? [
            { latitude: pickup.lat, longitude: pickup.lng },
            { latitude: dropoff.lat, longitude: dropoff.lng },
          ]
        : null;

    if (coordsToFit) {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion(region, 450);
    }
  }, [region, routeCoordinates, pickup, dropoff]);

  const handlePress = (event) => {
    if (!onMapPress) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onMapPress({ lat: latitude, lng: longitude });
  };

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={handlePress}
      >
        {pickup && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            pinColor={colors.accent}
            title="Pickup"
            description={pickup.name}
          />
        )}
        {dropoff && (
          <Marker
            coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
            pinColor={colors.navy}
            title="Drop-off"
            description={dropoff.name}
          />
        )}
        {routeCoordinates.length > 1 ? (
          <Polyline coordinates={routeCoordinates} strokeColor={colors.accent} strokeWidth={4} />
        ) : pickup && dropoff ? (
          <Polyline
            coordinates={[
              { latitude: pickup.lat, longitude: pickup.lng },
              { latitude: dropoff.lat, longitude: dropoff.lng },
            ]}
            strokeColor={colors.accent}
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        ) : null}
      </MapView>

      {!pickup && !dropoff && (
        <View style={styles.emptyStatePill}>
          <Text style={styles.emptyStateText}>Tap the map or search above to set pickup and drop-off</Text>
        </View>
      )}

      {onSelectingModeChange && (
        <View style={styles.modeToggle}>
          {SELECTING_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeButton, selectingMode === mode && styles.modeButtonActive]}
              activeOpacity={0.8}
              onPress={() => onSelectingModeChange(mode)}
            >
              <Text style={[styles.modeButtonText, selectingMode === mode && styles.modeButtonTextActive]}>
                {mode === "pickup" ? "Pickup" : "Destination"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isRouteLoading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      )}

      {!isRouteLoading && routeInfo && (
        <View style={styles.routePill}>
          <Text style={styles.routePillText}>
            {routeInfo.distanceKm} km • {routeInfo.durationMin} min
          </Text>
        </View>
      )}
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
  },
  map: {
    flex: 1,
  },
  modeToggle: {
    position: "absolute",
    top: spacing.sm,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    borderRadius: radius.full,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  loadingPill: {
    position: "absolute",
    bottom: spacing.sm,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  routePill: {
    position: "absolute",
    bottom: spacing.sm,
    alignSelf: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    ...shadow,
  },
  routePillText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyStatePill: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyStateText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
