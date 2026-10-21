import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { isValidLocation } from "../utils/routeGeometry.cjs";
import { DEFAULT_REGION } from "../utils/mapRegion";

const SELECTING_MODES = ["pickup", "destination"];

function point(value) {
  const latitude = Number(value?.lat ?? value?.latitude);
  const longitude = Number(value?.lng ?? value?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : null;
}

function points(values) {
  return (Array.isArray(values) ? values : []).map(point).filter(Boolean);
}

function signature(value) {
  return value ? `${value.latitude},${value.longitude}` : "none";
}

export default function MapPreview({ pickup, dropoff, routeCoordinates = [], routeInfo = null, selectingMode = "pickup", onSelectingModeChange, onMapPress, onAdjustPickup, onAdjustLocation, isRouteLoading = false, fullScreen = false, mapBottomOverlayRatio = 0.6 }) {
  const mapRef = useRef(null);
  const manualCameraDirtyRef = useRef(false);
  const programmaticCameraRef = useRef(false);
  const lastFitKeyRef = useRef(null);
  const lastTripKeyRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLayoutReady, setMapLayoutReady] = useState(false);
  const [mapLoadTimedOut, setMapLoadTimedOut] = useState(false);

  const validPickup = useMemo(() => isValidLocation(pickup) ? point(pickup) : null, [pickup]);
  const validDropoff = useMemo(() => isValidLocation(dropoff) ? point(dropoff) : null, [dropoff]);
  const validRouteCoordinates = useMemo(() => points(routeCoordinates), [routeCoordinates]);
  const hasConfirmedRoadRoute = routeInfo?.geometryAvailable === true && validRouteCoordinates.length > 1;
  const routeFitPoints = useMemo(
    () => (hasConfirmedRoadRoute ? [validPickup, validDropoff, ...validRouteCoordinates] : [validPickup, validDropoff]).filter(Boolean),
    [hasConfirmedRoadRoute, validPickup, validDropoff, validRouteCoordinates]
  );
  const tripKey = useMemo(
    () => [signature(validPickup), signature(validDropoff), hasConfirmedRoadRoute ? validRouteCoordinates.map(signature).join(";") : "no-road-route"].join("|"),
    [validPickup, validDropoff, hasConfirmedRoadRoute, validRouteCoordinates]
  );

  useEffect(() => {
    if (!mapReady || !mapLayoutReady) return undefined;
    const timer = setTimeout(() => setMapLoadTimedOut(false), 0);
    return () => clearTimeout(timer);
  }, [mapReady, mapLayoutReady]);

  const fitMap = useCallback(({ force = false } = {}) => {
    const map = mapRef.current;
    if (!map || !mapReady || !mapLayoutReady) return;
    if (!force && manualCameraDirtyRef.current && lastTripKeyRef.current === tripKey) return;
    const fitKey = `${tripKey}|overlay:${Math.round(Number(mapBottomOverlayRatio || 0.6) * 1000)}`;
    if (!force && lastFitKeyRef.current === fitKey) return;
    lastTripKeyRef.current = tripKey;
    lastFitKeyRef.current = fitKey;
    manualCameraDirtyRef.current = false;
    programmaticCameraRef.current = true;

    if (routeFitPoints.length === 0) {
      map.animateToRegion(DEFAULT_REGION, 450);
      return;
    }
    if (routeFitPoints.length === 1) {
      map.animateCamera({ center: routeFitPoints[0], zoom: 14 }, { duration: 450 });
      return;
    }
    map.fitToCoordinates(routeFitPoints, {
      edgePadding: {
        top: 120,
        right: 24,
        bottom: Math.max(160, Math.round(260 + Number(mapBottomOverlayRatio || 0.6) * 120)),
        left: 24,
      },
      animated: true,
    });
  }, [mapReady, mapLayoutReady, mapBottomOverlayRatio, routeFitPoints, tripKey]);

  useEffect(() => {
    fitMap();
  }, [fitMap]);

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent?.coordinate;
    const latitude = Number(coordinate?.latitude);
    const longitude = Number(coordinate?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && onMapPress) onMapPress({ lat: latitude, lng: longitude });
  };

  const handleRegionChangeComplete = (_region, details) => {
    if (!programmaticCameraRef.current || details?.isGesture) manualCameraDirtyRef.current = true;
    programmaticCameraRef.current = false;
  };

  const recenterMap = () => {
    manualCameraDirtyRef.current = false;
    lastFitKeyRef.current = null;
    fitMap({ force: true });
  };

  return (
    <View style={[styles.wrapper, fullScreen && styles.fullScreenWrapper]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onLayout={() => setMapLayoutReady(true)}
        onMapReady={() => { setMapReady(true); setMapLoadTimedOut(false); }}
        onError={() => { setMapReady(false); setMapLoadTimedOut(true); }}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChangeComplete}
        accessibilityLabel="Interactive Google Map"
      >
        {validPickup && <Marker coordinate={validPickup} pinColor={colors.accent} title="Pickup" />}
        {validDropoff && <Marker coordinate={validDropoff} pinColor={colors.navy} title="Drop-off" />}
        {hasConfirmedRoadRoute && <Polyline coordinates={validRouteCoordinates} strokeColor={colors.accent} strokeWidth={5} lineJoin="round" />}
      </MapView>

      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        {onSelectingModeChange && <View style={styles.modeToggle}>
          {SELECTING_MODES.map((mode) => <TouchableOpacity key={mode} style={[styles.modeButton, selectingMode === mode && styles.modeButtonActive]} onPress={() => onSelectingModeChange(mode)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Select ${mode === "pickup" ? "pickup" : "destination"} on map`}>
            <Text style={[styles.modeButtonText, selectingMode === mode && styles.modeButtonTextActive]}>{mode === "pickup" ? "Pickup" : "Destination"}</Text>
          </TouchableOpacity>)}
        </View>}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Recenter map">
          <Text style={styles.recenterText}>Recenter</Text>
        </TouchableOpacity>
        {((selectingMode === "pickup" && pickup) || (selectingMode === "destination" && dropoff)) && (onAdjustLocation || onAdjustPickup) && <TouchableOpacity style={styles.adjustButton} onPress={() => onAdjustLocation ? onAdjustLocation(selectingMode) : onAdjustPickup()} activeOpacity={0.85} accessibilityLabel={`Adjust ${selectingMode} on map`}>
          <Text style={styles.adjustText}>Adjust {selectingMode} on map</Text>
        </TouchableOpacity>}
        {!validPickup && !validDropoff && <View style={styles.emptyStatePill}><Text style={styles.emptyStateText}>Tap the map or search above to set pickup and destination</Text></View>}
        {mapLoadTimedOut && !mapReady && <View style={styles.statusPill}><Text style={styles.statusText}>Map could not load. Check your connection.</Text></View>}
        {isRouteLoading && <View style={styles.statusPill}><ActivityIndicator size="small" color={colors.white} /><Text style={styles.statusText}>Calculating road route…</Text></View>}
        {!isRouteLoading && routeInfo?.geometryAvailable && !hasConfirmedRoadRoute && <View style={styles.statusPill}><Text style={styles.statusText}>Route geometry unavailable</Text></View>}
        {!isRouteLoading && hasConfirmedRoadRoute && <View style={[styles.statusPill, styles.routePill]}><Text style={styles.statusText}>{routeInfo.distanceKm} km • {routeInfo.durationMin} min</Text></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 300, marginTop: spacing.lg, marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: "#E8F0E8" },
  fullScreenWrapper: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", minHeight: 0, flex: 1, marginTop: 0, marginHorizontal: 0, borderRadius: 0, borderWidth: 0 },
  map: { flex: 1, width: "100%", height: "100%" },
  modeToggle: { position: "absolute", top: 54, alignSelf: "center", flexDirection: "row", backgroundColor: "rgba(17,24,39,.88)", borderRadius: radius.full, padding: 4 },
  modeButton: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full },
  modeButtonActive: { backgroundColor: colors.accent },
  modeButtonText: { color: "#E2E8F0", fontSize: 12, fontWeight: "800" },
  modeButtonTextActive: { color: colors.white },
  recenterButton: { position: "absolute", top: 108, left: spacing.sm, backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 9, elevation: 4, ...shadow },
  recenterText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  adjustButton: { position: "absolute", top: 108, right: spacing.sm, backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 9, elevation: 4, ...shadow },
  adjustText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  emptyStatePill: { position: "absolute", bottom: 110, left: spacing.lg, right: spacing.lg, alignItems: "center", backgroundColor: "rgba(17,24,39,.86)", borderRadius: radius.md, padding: spacing.sm },
  emptyStateText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  statusPill: { position: "absolute", bottom: spacing.lg, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(17,24,39,.9)", borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  routePill: { backgroundColor: colors.accent },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "800" },
});
