import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import colors, { radius, spacing } from "../constants/colors";
import { formatReverseGeocode } from "../utils/locationFormatting.cjs";

export default function PickupMapAdjuster({ visible, mode = "pickup", initialLocation, onReverseGeocode, onCancel, onConfirm }) {
  const [region, setRegion] = useState(null);
  const [preview, setPreview] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [reverseGeocodeError, setReverseGeocodeError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadTimedOut, setMapLoadTimedOut] = useState(false);
  const [moving, setMoving] = useState(false);
  const [resolvedCenter, setResolvedCenter] = useState(null);
  const requestRef = useRef(0);
  const centerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!visible || !Number.isFinite(Number(initialLocation?.lat)) || !Number.isFinite(Number(initialLocation?.lng))) return undefined;
    setRegion({ latitude: Number(initialLocation.lat), longitude: Number(initialLocation.lng), latitudeDelta: 0.004, longitudeDelta: 0.004 });
    setPreview(initialLocation);
    setReverseGeocodeError(null);
    setMapReady(false);
    setMapLoadTimedOut(false);
    setMoving(false);
    setResolvedCenter(null);
    centerRef.current = { lat: Number(initialLocation.lat), lng: Number(initialLocation.lng) };
    requestRef.current += 1;
    const timer = setTimeout(() => setMapLoadTimedOut(true), 10000);
    return () => { clearTimeout(timer); clearTimeout(debounceRef.current); requestRef.current += 1; };
  }, [visible, initialLocation]);

  async function handleRegionChangeComplete(nextRegion) {
    if (!nextRegion || !onReverseGeocode) return;
    const latitude = Number(nextRegion.latitude);
    const longitude = Number(nextRegion.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const requestId = ++requestRef.current;
    clearTimeout(debounceRef.current);
    setRegion(nextRegion);
    centerRef.current = { lat: latitude, lng: longitude };
    setMoving(false);
    setResolvedCenter(null);
    setLoading(true);
    setReverseGeocodeError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await onReverseGeocode(latitude, longitude);
        if (requestRef.current !== requestId || centerRef.current?.lat !== latitude || centerRef.current?.lng !== longitude) return;
        const formatted = formatReverseGeocode(result);
        const location = { ...formatted, lat: latitude, lng: longitude, source: "map-adjustment" };
        setResolvedCenter(location);
        setPreview({ ...location, name: location.name || "Selected point", address: location.address || "Address unavailable", unresolved: !(location.name || location.address) });
      } catch (_error) {
        if (requestRef.current === requestId) {
          setResolvedCenter({ lat: latitude, lng: longitude });
          setPreview({ name: "Selected point", address: "Address unavailable", lat: latitude, lng: longitude, source: "map-adjustment", unresolved: false });
          setReverseGeocodeError("Address unavailable. You can still confirm these coordinates.");
        }
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 350);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {region && <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onMapReady={() => { setMapReady(true); setMapLoadTimedOut(false); }}
          onError={() => { setMapReady(false); setMapLoadTimedOut(true); }}
          onRegionChange={() => { setMoving(true); setResolvedCenter(null); }}
          onRegionChangeComplete={handleRegionChangeComplete}
          accessibilityLabel="Interactive Google Map adjustment"
        />}
        <View pointerEvents="none" style={styles.centerPin}><View style={styles.pin} /></View>
        <View style={styles.topBar}><Text style={styles.title}>Adjust {mode === "destination" ? "destination" : "pickup"}</Text><Text style={styles.subtitle}>Move the map under the pin</Text></View>
        {!mapReady && mapLoadTimedOut && <View style={styles.mapErrorPill}><Text style={styles.mapErrorText}>Map could not load. Check your connection.</Text></View>}
        <View style={styles.bottomCard}>
          <Text style={styles.label}>{mode === "destination" ? "Destination point" : "Pickup point"}</Text>
          <Text style={styles.name} numberOfLines={1}>{preview?.name || `Selected ${mode === "destination" ? "destination" : "pickup"} point`}</Text>
          <Text style={styles.address} numberOfLines={2}>{preview?.secondaryAddress || preview?.address || "Address unavailable"}</Text>
          {reverseGeocodeError && <Text style={styles.unavailable}>{reverseGeocodeError}</Text>}
          {loading && <ActivityIndicator color={colors.accent} style={styles.loader} />}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onCancel} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.confirm, (moving || loading || !resolvedCenter || preview?.lat !== centerRef.current?.lat || preview?.lng !== centerRef.current?.lng) && styles.confirmDisabled]} disabled={moving || loading || !resolvedCenter || preview?.lat !== centerRef.current?.lat || preview?.lng !== centerRef.current?.lng} onPress={() => onConfirm({ ...preview, lat: centerRef.current.lat, lng: centerRef.current.lng })} accessibilityRole="button"><Text style={styles.confirmText}>Confirm {mode === "destination" ? "destination" : "pickup"}</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  map: { flex: 1, width: "100%", height: "100%" },
  mapErrorPill: { position: "absolute", top: spacing.xl, left: spacing.lg, right: spacing.lg, alignItems: "center", backgroundColor: "rgba(17, 24, 39, 0.88)", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mapErrorText: { color: colors.white, fontSize: 12, fontWeight: "600", textAlign: "center" },
  centerPin: { position: "absolute", top: "50%", left: "50%", marginLeft: -13, marginTop: -30, alignItems: "center" },
  pin: { width: 26, height: 26, borderRadius: 14, backgroundColor: colors.accent, borderWidth: 4, borderColor: colors.white, elevation: 5 },
  topBar: { position: "absolute", top: 54, left: spacing.lg, right: spacing.lg, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, elevation: 4 },
  title: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: 3 },
  bottomCard: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.card, elevation: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  name: { color: colors.primary, fontWeight: "800", fontSize: 16, marginTop: 4 },
  address: { color: colors.muted, marginTop: 3 },
  unavailable: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  loader: { position: "absolute", right: spacing.lg, top: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  cancel: { flex: 1, alignItems: "center", padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  confirm: { flex: 1, alignItems: "center", padding: spacing.md, backgroundColor: colors.accent, borderRadius: radius.md },
  confirmDisabled: { opacity: 0.5 },
  cancelText: { color: colors.primary, fontWeight: "800" },
  confirmText: { color: colors.white, fontWeight: "800" },
});
