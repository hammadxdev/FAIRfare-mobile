import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../components/AppHeader";
import colors, { radius, spacing } from "../constants/colors";
import { getPreferences, updatePreferences } from "../services/api";
import SkeletonCard from "../components/skeleton/SkeletonCard";
import SkeletonBlock from "../components/skeleton/SkeletonBlock";

const VEHICLES = [
  ["BIKE", "Bike"], ["RICKSHAW", "Rickshaw"], ["ECONOMY_CAR", "Economy Car"],
  ["STANDARD_CAR", "Standard Car"], ["PREMIUM_CAR", "Premium Car"], ["OTHER", "Other"],
];
const PRIORITIES = [["CHEAPEST", "Cheapest fare"], ["FASTEST_PICKUP", "Faster pickup estimate (unverified)"], ["BALANCED", "Balanced"]];

function blankPreferences() { return { preferredVehicleType: null, avoidedVehicleTypes: [], typicalBudget: "", ridePriority: "BALANCED", currency: "PKR" }; }

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState(blankPreferences);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const value = await getPreferences(); setPreferences({ ...value, typicalBudget: value.typicalBudget == null ? "" : String(value.typicalBudget) }); }
    catch (err) { setError(err.response?.data?.message || "Unable to load preferences."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleAvoided = (vehicle) => setPreferences((current) => ({ ...current, avoidedVehicleTypes: current.avoidedVehicleTypes.includes(vehicle) ? current.avoidedVehicleTypes.filter((value) => value !== vehicle) : [...current.avoidedVehicleTypes, vehicle] }));
  const save = async () => {
    if (preferences.preferredVehicleType && preferences.avoidedVehicleTypes.includes(preferences.preferredVehicleType)) { setError("Your preferred vehicle cannot also be in the avoided list."); return; }
    setSaving(true); setError(null);
    try { const value = await updatePreferences({ ...preferences, typicalBudget: preferences.typicalBudget.trim() === "" ? null : Number(preferences.typicalBudget) }); setPreferences({ ...value, typicalBudget: value.typicalBudget == null ? "" : String(value.typicalBudget) }); Alert.alert("Preferences saved", "Your ride preferences have been updated."); }
    catch (err) { setError(err.response?.data?.errors?.join(" ") || err.response?.data?.message || "Unable to save preferences."); }
    finally { setSaving(false); }
  };

  return <View style={styles.flex}><AppHeader title="Settings" subtitle="Your account and app preferences" showLogo={false} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.section}>ACCOUNT</Text><View style={styles.card}><Text style={styles.label}>Name</Text><Text style={styles.value}>{user?.name}</Text><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email}</Text></View>
    <Text style={styles.section}>RIDE PREFERENCES</Text>
    {loading ? <SkeletonCard><SkeletonBlock width="48%" height={17} /><SkeletonBlock width="88%" height={14} style={{ marginTop: spacing.md }} /><SkeletonBlock width="72%" height={14} style={{ marginTop: spacing.sm }} /><SkeletonBlock width="100%" height={48} borderRadius={radius.md} style={{ marginTop: spacing.lg }} /></SkeletonCard> : <View style={styles.card}>
      <Text style={styles.fieldTitle}>Preferred vehicle</Text><View style={styles.options}>{[[null, "No preference"], ...VEHICLES].map(([value, label]) => <TouchableOpacity key={label} style={[styles.option, preferences.preferredVehicleType === value && styles.optionSelected]} onPress={() => setPreferences((current) => ({ ...current, preferredVehicleType: value }))}><Text style={[styles.optionText, preferences.preferredVehicleType === value && styles.optionTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
      <Text style={styles.fieldTitle}>Avoid vehicle types</Text><Text style={styles.muted}>Select any vehicle types you generally avoid.</Text><View style={styles.options}>{VEHICLES.map(([value, label]) => <TouchableOpacity key={value} style={[styles.option, preferences.avoidedVehicleTypes.includes(value) && styles.optionSelected]} onPress={() => toggleAvoided(value)}><Text style={[styles.checkbox, preferences.avoidedVehicleTypes.includes(value) && styles.checkboxSelected]}>{preferences.avoidedVehicleTypes.includes(value) ? "✓" : "□"}</Text><Text style={[styles.optionText, preferences.avoidedVehicleTypes.includes(value) && styles.optionTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
      <Text style={styles.fieldTitle}>Typical budget</Text><TextInput style={styles.input} value={preferences.typicalBudget} onChangeText={(value) => setPreferences((current) => ({ ...current, typicalBudget: value }))} placeholder="Optional amount" placeholderTextColor={colors.muted} keyboardType="numeric"/><Text style={styles.currency}>PKR</Text>
      <Text style={styles.fieldTitle}>Ride priority</Text>{PRIORITIES.map(([value, label]) => <TouchableOpacity key={value} style={styles.radioRow} onPress={() => setPreferences((current) => ({ ...current, ridePriority: value }))}><Text style={styles.radio}>{preferences.ridePriority === value ? "◉" : "○"}</Text><Text style={styles.radioLabel}>{label}</Text></TouchableOpacity>)}
      {error ? <Text style={styles.error}>{error}</Text> : null}<TouchableOpacity style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save Preferences</Text>}</TouchableOpacity>
    </View>}
    <Text style={styles.section}>APP</Text><View style={styles.card}><Text style={styles.value}>Fair Fare Version 1</Text></View><Text style={styles.section}>ACCOUNT ACTIONS</Text><TouchableOpacity style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
  </ScrollView></View>;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 }, section: { color: colors.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md }, card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm }, label: { color: colors.muted, fontSize: 12, marginTop: spacing.sm }, value: { color: colors.primary, fontSize: 16, fontWeight: "700", marginTop: 3 }, fieldTitle: { color: colors.primary, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.sm }, muted: { color: colors.muted, fontSize: 12 }, loading: { alignItems: "center", padding: spacing.xl }, options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }, option: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center" }, optionSelected: { borderColor: colors.accent, backgroundColor: "#F0FDF4" }, optionText: { color: colors.primary, fontSize: 13 }, optionTextSelected: { color: "#15803D", fontWeight: "800" }, checkbox: { color: colors.muted, marginRight: 5 }, checkboxSelected: { color: "#15803D" }, input: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 13, fontSize: 16, color: colors.primary, paddingRight: 54 }, currency: { color: colors.muted, position: "absolute", right: spacing.lg + 14, top: 252 }, radioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7 }, radio: { color: colors.accent, fontSize: 22, marginRight: spacing.sm }, radioLabel: { color: colors.primary, fontSize: 15 }, error: { color: colors.danger, marginTop: spacing.md, lineHeight: 18 }, save: { backgroundColor: colors.accent, borderRadius: radius.md, padding: 15, alignItems: "center", marginTop: spacing.md }, disabled: { opacity: 0.6 }, saveText: { color: colors.white, fontWeight: "800", fontSize: 16 }, logout: { backgroundColor: colors.card, borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, padding: 15, alignItems: "center" }, logoutText: { color: colors.danger, fontWeight: "800" } });
