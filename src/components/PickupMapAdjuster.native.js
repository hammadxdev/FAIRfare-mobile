import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import MapView, { UrlTile } from "react-native-maps";
import colors, { radius, spacing } from "../constants/colors";
import { formatReverseGeocode } from "../utils/locationFormatting.cjs";

export default function PickupMapAdjuster({ visible, mode = "pickup", initialLocation, onReverseGeocode, onCancel, onConfirm }) {
  const [region, setRegion] = useState(null);
  const [preview, setPreview] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [reverseGeocodeError, setReverseGeocodeError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadTimedOut, setMapLoadTimedOut] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!visible || !Number.isFinite(initialLocation?.lat) || !Number.isFinite(initialLocation?.lng)) return;
    setRegion({ latitude: initialLocation.lat, longitude: initialLocation.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 });
    setPreview(initialLocation);
    setReverseGeocodeError(null);
    setMapReady(false);
    setMapLoadTimedOut(false);
    const timer = setTimeout(() => setMapLoadTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [visible, initialLocation]);

  async function handleRegionChangeComplete(nextRegion) {
    if (!nextRegion || !onReverseGeocode) return;
    const lat = nextRegion.latitude;
    const lng = nextRegion.longitude;
    const requestId = ++requestRef.current;
    setRegion(nextRegion);
    setLoading(true);
    setReverseGeocodeError(null);
    try {
      const result = await onReverseGeocode(lat, lng);
      if (requestRef.current !== requestId) return;
      const formatted = formatReverseGeocode(result);
      if (!formatted.name && !formatted.address) throw new Error("Address unavailable");
      setPreview({ ...formatted, lat, lng, source: "map-adjustment" });
    } catch (error) {
      if (requestRef.current === requestId) {
        setPreview({ name: "Selected point", address: "Address unavailable", lat, lng, source: "map-adjustment", unresolved: true });
        setReverseGeocodeError("Could not resolve this point. Move the map or cancel without saving.");
      }
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        {region && <MapView style={styles.map} mapType="none" initialRegion={region} onLayout={() => {}} onMapReady={() => { setMapReady(true); setMapLoadTimedOut(false); }} onMapLoaded={() => { setMapReady(true); setMapLoadTimedOut(false); }} onRegionChangeComplete={handleRegionChangeComplete}>
          <UrlTile urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
        </MapView>}
        {mapLoadTimedOut && !mapReady && <View pointerEvents="none" style={styles.mapErrorPill}><Text style={styles.mapErrorText}>Map tiles are taking too long to load. Check your connection.</Text></View>}
        {region && <Text style={styles.attribution}>© OpenStreetMap contributors © CARTO</Text>}
        <View pointerEvents="none" style={styles.centerPin}><View style={styles.pin} /></View>
        <View style={styles.topBar}><Text style={styles.title}>Adjust {mode === "destination" ? "destination" : "pickup"}</Text><Text style={styles.subtitle}>Move the map under the pin</Text></View>
        <View style={styles.bottomCard}>
          <Text style={styles.label}>{mode === "destination" ? "Destination point" : "Pickup point"}</Text>
          <Text style={styles.name} numberOfLines={1}>{preview?.name || `Selected ${mode === "destination" ? "destination" : "pickup"} point`}</Text>
          <Text style={styles.address} numberOfLines={2}>{preview?.secondaryAddress || preview?.address || "Address unavailable"}</Text>
          {reverseGeocodeError && <Text style={styles.error}>{reverseGeocodeError}</Text>}
          {loading && <ActivityIndicator color={colors.accent} style={styles.loader} />}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.confirm, (loading || reverseGeocodeError || preview?.unresolved) && styles.confirmDisabled]} disabled={loading || Boolean(reverseGeocodeError) || Boolean(preview?.unresolved)} onPress={() => onConfirm(preview)}>{mode === "destination" ? <Text style={styles.confirmText}>Confirm destination</Text> : <Text style={styles.confirmText}>Confirm pickup</Text>}</TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  map: { flex: 1, width: "100%", height: "100%" },
  mapErrorPill: { position: "absolute", top: spacing.xl, left: spacing.lg, right: spacing.lg, alignItems: "center", backgroundColor: "rgba(17, 24, 39, 0.88)", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mapErrorText: { color: colors.white, fontSize: 12, fontWeight: "600", textAlign: "center" },
  attribution: { position: "absolute", right: 4, top: 4, backgroundColor: "rgba(255, 255, 255, 0.78)", color: "#334155", fontSize: 9, paddingHorizontal: 3, paddingVertical: 1 },
  centerPin: { position: "absolute", top: "50%", left: "50%", marginLeft: -13, marginTop: -30, alignItems: "center" },
  pin: { width: 26, height: 26, borderRadius: 14, backgroundColor: colors.accent, borderWidth: 4, borderColor: colors.white, elevation: 5 },
  topBar: { position: "absolute", top: 54, left: spacing.lg, right: spacing.lg, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, elevation: 4 },
  title: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: 3 },
  bottomCard: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.card, elevation: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  name: { color: colors.primary, fontWeight: "800", fontSize: 16, marginTop: 4 },
  address: { color: colors.muted, marginTop: 3 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  loader: { position: "absolute", right: spacing.lg, top: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  cancel: { flex: 1, alignItems: "center", padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  confirm: { flex: 1, alignItems: "center", padding: spacing.md, backgroundColor: colors.accent, borderRadius: radius.md },
  confirmDisabled: { opacity: 0.5 },
  cancelText: { color: colors.primary, fontWeight: "800" },
  confirmText: { color: colors.white, fontWeight: "800" },
});
