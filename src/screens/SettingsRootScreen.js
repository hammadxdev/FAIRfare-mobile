import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../components/AppHeader";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { APP_NAME, APP_VERSION } from "../constants/appInfo";
import { getPreferences } from "../services/api";
import { formatPKR } from "../utils/formatCurrency";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsSkeleton from "../components/skeleton/SettingsSkeleton";
import ErrorState from "../components/ErrorState";

const VEHICLES = [["BIKE", "Bike"], ["RICKSHAW", "Rickshaw"], ["ECONOMY_CAR", "Economy Car"], ["STANDARD_CAR", "Standard Car"], ["PREMIUM_CAR", "Premium Car"], ["OTHER", "Other"]];
const PRIORITIES = { CHEAPEST: "Cheapest fare", FASTEST_PICKUP: "Faster simulated pickup estimate (unverified)", BALANCED: "Balanced" };
const vehicleLabel = (value) => VEHICLES.find(([key]) => key === value)?.[1] || "No preference";
const summary = (prefs, key) => {
  if (!prefs) return "Loading…";
  if (key === "preferred") return vehicleLabel(prefs.preferredVehicleType);
  if (key === "avoided") return prefs.avoidedVehicleTypes?.length ? prefs.avoidedVehicleTypes.map(vehicleLabel).join(", ") : "None";
  if (key === "budget") return prefs.typicalBudget ? formatPKR(prefs.typicalBudget) : "Not set";
  return PRIORITIES[prefs.ridePriority] || "Balanced";
};
function Section({ children }) { return <SettingsSection>{children}</SettingsSection>; }
function Row({ icon, title, value, onPress, last }) { return <TouchableOpacity style={[styles.row, last && styles.lastRow]} onPress={onPress} activeOpacity={0.72}><Text style={styles.rowIcon}>{icon}</Text><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowValue}>{value}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>; }

export default function SettingsRootScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setPreferences(await getPreferences()); } catch (err) { setError(err.response?.data?.message || "Unable to load preferences."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => {
    console.info("[NAV] Settings focused");
    return () => console.info("[NAV] Settings blurred");
  }, []));
  const displayName = user?.name || "Fair Fare user"; const initial = displayName.trim().charAt(0).toUpperCase() || "F";
  return <View style={styles.flex}><AppHeader title="Settings" subtitle="Manage your account and ride preferences" showLogo={false}/><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Section>PROFILE</Section><TouchableOpacity style={styles.profile} onPress={() => navigation.navigate("Profile")} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Open profile"><View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View><View style={styles.profileCopy}><Text style={styles.profileName}>{displayName}</Text><Text style={styles.profileEmail}>{user?.email || ""}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>
    <Section>RIDE PREFERENCES</Section>{loading && !preferences ? <SettingsSkeleton /> : error && !preferences ? <ErrorState title="Preferences unavailable" message={error} onRetry={load} /> : <View style={styles.group}><>{<Row icon="◉" title="Preferred vehicle" value={summary(preferences, "preferred")} onPress={() => navigation.navigate("PreferenceEditor", { mode: "preferred" })}/>}<Row icon="⊘" title="Avoid vehicle types" value={summary(preferences, "avoided")} onPress={() => navigation.navigate("PreferenceEditor", { mode: "avoided" })}/><Row icon="₨" title="Typical budget" value={summary(preferences, "budget")} onPress={() => navigation.navigate("PreferenceEditor", { mode: "budget" })}/><Row icon="⚖" title="Ride priority" value={summary(preferences, "priority")} onPress={() => navigation.navigate("PreferenceEditor", { mode: "priority" })} last/></></View>}{error && preferences ? <Text style={styles.error}>{error} Pull to retry.</Text> : null}
    <Section>APP & SUPPORT</Section><View style={styles.group}><Row icon="ⓘ" title="About Fair Fare" value="Learn how Fair Fare works" onPress={() => navigation.navigate("AboutFairFare")}/><Row icon="▤" title="Terms & Conditions" value="How the service works" onPress={() => navigation.navigate("Terms")}/><Row icon="▣" title="Privacy Policy" value="How information is handled" onPress={() => navigation.navigate("Privacy")}/><Row icon="?" title="Help & Support" value="Answers to common questions" onPress={() => navigation.navigate("HelpSupport")} last/></View>
    <Section>APP INFO</Section><View style={styles.info}><Text style={styles.infoTitle}>{APP_NAME}</Text><Text style={styles.infoVersion}>Version {APP_VERSION}</Text></View><Section>ACCOUNT</Section><TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.75}><Text style={styles.logoutIcon}>↪</Text><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
  </ScrollView></View>;
}
const styles = StyleSheet.create({ flex:{flex:1,backgroundColor:colors.background}, content:{paddingHorizontal:spacing.lg,paddingBottom:spacing.xl*2}, section:{color:colors.muted,fontWeight:"800",fontSize:11,letterSpacing:1.2,marginTop:spacing.lg,marginBottom:spacing.sm}, group:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:"hidden",...shadow}, row:{minHeight:72,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:colors.border}, lastRow:{borderBottomWidth:0}, rowIcon:{color:colors.forest,fontSize:21,width:34,textAlign:"center",marginRight:spacing.sm}, rowCopy:{flex:1}, rowTitle:{color:colors.primary,fontWeight:"700",fontSize:15}, rowValue:{color:colors.muted,fontSize:13,marginTop:4}, chevron:{color:colors.muted,fontSize:28,fontWeight:"300",marginLeft:spacing.sm}, loading:{minHeight:72,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:spacing.sm}, profile:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md,flexDirection:"row",alignItems:"center",...shadow}, avatar:{width:52,height:52,borderRadius:radius.full,backgroundColor:colors.paleGreen,alignItems:"center",justifyContent:"center",marginRight:spacing.md}, avatarText:{color:colors.forest,fontSize:21,fontWeight:"800"}, profileCopy:{flex:1}, profileName:{color:colors.primary,fontWeight:"800",fontSize:16}, profileEmail:{color:colors.muted,fontSize:13,marginTop:4}, error:{color:colors.danger,fontSize:13,marginTop:spacing.sm}, info:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md}, infoTitle:{color:colors.primary,fontWeight:"800",fontSize:15}, infoVersion:{color:colors.muted,marginTop:4,fontSize:13}, logout:{minHeight:56,borderWidth:1,borderColor:colors.dangerSoft,borderRadius:radius.md,backgroundColor:colors.dangerSurface,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:spacing.sm}, logoutIcon:{color:colors.danger,fontSize:19}, logoutText:{color:colors.danger,fontWeight:"800",fontSize:15} });
