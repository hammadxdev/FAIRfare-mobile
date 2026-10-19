import React, { useMemo, useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { getRegionForPoints } from "../utils/mapRegion";
import { getLocationDisplayText } from "../utils/locationDisplay";
import { isValidLocation } from "../utils/routeGeometry.cjs";

const SELECTING_MODES = ["pickup", "destination"];

export default function MapPreview({
  pickup,
  dropoff,
  routeCoordinates = [],
  previewCoordinates = [],
  routeInfo = null,
  selectingMode = "pickup",
  onSelectingModeChange,
  onMapPress,
  onAdjustPickup,
  onAdjustLocation,
  isRouteLoading = false,
  fullScreen = false,
}) {
  const mapRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const region = useMemo(() => getRegionForPoints(pickup, dropoff), [pickup, dropoff]);
  const validPickup = useMemo(() => isValidLocation(pickup) ? { lat: Number(pickup.lat ?? pickup.latitude), lng: Number(pickup.lng ?? pickup.longitude) } : null, [pickup]);
  const validDropoff = useMemo(() => isValidLocation(dropoff) ? { lat: Number(dropoff.lat ?? dropoff.latitude), lng: Number(dropoff.lng ?? dropoff.longitude) } : null, [dropoff]);
  const validRouteCoordinates = useMemo(() => routeCoordinates.filter((point) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)), [routeCoordinates]);
  const validPreviewCoordinates = useMemo(() => previewCoordinates.filter((point) => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)), [previewCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !layoutReady) return;

    // Prefer fitting to the real route shape; fall back to just the two
    // markers (or the default region) when there's no route yet.
    const coordsToFit =
      validRouteCoordinates.length > 1
        ? validRouteCoordinates
        : validPickup && validDropoff
        ? [
            { latitude: validPickup.lat, longitude: validPickup.lng },
            { latitude: validDropoff.lat, longitude: validDropoff.lng },
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
  }, [layoutReady, region, validRouteCoordinates, validPickup, validDropoff]);

  const handlePress = (event) => {
    if (!onMapPress) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onMapPress({ lat: latitude, lng: longitude });
  };

  return (
    <View style={[styles.wrapper, fullScreen && styles.fullScreenWrapper]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onLayout={() => setLayoutReady(true)}
        onPress={handlePress}
      >
        {validPickup && (
          <Marker
            coordinate={{ latitude: validPickup.lat, longitude: validPickup.lng }}
            pinColor={colors.accent}
            title="Pickup"
            description={getLocationDisplayText(pickup)}
          />
        )}
        {validDropoff && (
          <Marker
            coordinate={{ latitude: validDropoff.lat, longitude: validDropoff.lng }}
            pinColor={colors.navy}
            title="Drop-off"
            description={getLocationDisplayText(dropoff)}
          />
        )}
        {routeCoordinates.length > 1 && validRouteCoordinates.length > 1 ? (
          <Polyline coordinates={validRouteCoordinates} strokeColor={colors.accent} strokeWidth={4} />
        ) : validPreviewCoordinates.length > 1 ? (
          <Polyline coordinates={validPreviewCoordinates} strokeColor={colors.muted} strokeWidth={3} lineDashPattern={[8, 8]} />
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

      {((selectingMode === "pickup" && pickup) || (selectingMode === "destination" && dropoff)) && (onAdjustLocation || onAdjustPickup) && (
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => onAdjustLocation ? onAdjustLocation(selectingMode) : onAdjustPickup()}
          activeOpacity={0.85}
          accessibilityLabel={`Adjust ${selectingMode} on map`}
        >
          <Text style={styles.adjustButtonText}>Adjust {selectingMode} on map</Text>
        </TouchableOpacity>
      )}

      {isRouteLoading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.loadingText}>Straight-line preview • calculating road route…</Text>
        </View>
      )}

      {!isRouteLoading && routeInfo?.geometryAvailable && (
        <View style={styles.routePill}>
          <Text style={styles.routePillText}>
            {routeInfo.distanceKm} km • {routeInfo.durationMin} min
          </Text>
        </View>
      )}
      {!isRouteLoading && routeInfo?.isPreview && (
        <View style={styles.previewPill}><Text style={styles.previewPillText}>Straight-line preview — not a road route</Text></View>
      )}
      {!isRouteLoading && routeInfo && !routeInfo.geometryAvailable && (
        <View style={styles.routePill}><Text style={styles.routePillText}>Road route unavailable</Text></View>
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
  fullScreenWrapper: {
    ...StyleSheet.absoluteFillObject,
    height: undefined,
    marginTop: 0,
    marginHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
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
  previewPill: { position: "absolute", bottom: spacing.sm, alignSelf: "center", backgroundColor: "rgba(17, 24, 39, 0.88)", borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  previewPillText: { color: colors.white, fontSize: 12, fontWeight: "700" },
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
  adjustButton: { position: "absolute", top: 54, right: spacing.sm, backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 9, elevation: 4 },
  adjustButtonText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
});
