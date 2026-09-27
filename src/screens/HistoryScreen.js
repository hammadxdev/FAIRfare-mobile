import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { getHistory } from "../services/api";

function dateLabel(value) { return new Date(value).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
function distanceLabel(meters) { return meters == null ? "Distance unavailable" : `${(meters / 1000).toFixed(1)} km`; }
function durationLabel(seconds) { return seconds == null ? "Duration unavailable" : `~${Math.round(seconds / 60)} min`; }

function HistoryCard({ item, onDetails, onCompare }) {
  return <View style={styles.card}><Text style={styles.route} numberOfLines={1}>{item.pickup.label} → {item.destination.label}</Text><Text style={styles.date}>{dateLabel(item.searchedAt)}</Text><View style={styles.stats}><Text style={styles.stat}>{distanceLabel(item.route?.distanceMeters)}</Text><Text style={styles.stat}>{durationLabel(item.route?.durationSeconds)}</Text></View><Text style={styles.options}>{item.quotes?.length || 0} ride options compared</Text><View style={styles.actions}><TouchableOpacity onPress={onDetails} accessibilityLabel="View comparison details" style={styles.secondaryButton}><Text style={styles.secondaryText}>View details</Text></TouchableOpacity><TouchableOpacity onPress={onCompare} accessibilityLabel="Compare this route again" style={styles.primaryButton}><Text style={styles.primaryText}>Compare again</Text></TouchableOpacity></View></View>;
}

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = React.useState([]); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState(null);
  const load = React.useCallback(async () => { setLoading(true); try { setItems((await getHistory()).data || []); setError(null); } catch { setError("We couldn't load your comparison history."); } finally { setLoading(false); } }, []);
  React.useEffect(() => { load(); }, [load]);
  const openHome = (item) => navigation.getParent()?.navigate("MainTabs", { screen: "Home", params: { compareAgain: item } });
  if (error) return <View style={styles.flex}><AppHeader title="Ride History" subtitle="Your previous fare comparisons" showLogo={false} /><ErrorState title="History unavailable" message={error} onRetry={load} /></View>;
  if (loading && !items.length) return <View style={styles.flex}><AppHeader title="Ride History" subtitle="Your previous fare comparisons" showLogo={false} /><View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}>Loading your comparisons…</Text></View></View>;
  return <View style={styles.flex}><AppHeader title="Ride History" subtitle="Your previous fare comparisons" showLogo={false} />{!items.length ? <View style={styles.empty}><EmptyState title="No comparisons yet" message="Compare a ride and it will appear here." /><TouchableOpacity onPress={() => navigation.getParent()?.navigate("MainTabs", { screen: "Home" })} style={styles.emptyButton}><Text style={styles.primaryText}>Compare a ride</Text></TouchableOpacity></View> : <FlatList data={items} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.content} refreshing={loading} onRefresh={load} renderItem={({ item }) => <HistoryCard item={item} onDetails={() => navigation.getParent()?.navigate("HistoryDetail", { historyId: item.id })} onCompare={() => openHome(item)} />} />}</View>;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingTop: spacing.sm }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm }, muted: { color: colors.muted }, empty: { flex: 1, alignItems: "center", justifyContent: "center" }, card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow }, route: { color: colors.primary, fontSize: 16, fontWeight: "800" }, date: { color: colors.muted, fontSize: 12, marginTop: 6 }, stats: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg }, stat: { color: colors.primary, fontSize: 14, fontWeight: "700" }, options: { color: colors.muted, fontSize: 12, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }, actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }, secondaryButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center", justifyContent: "center" }, secondaryText: { color: colors.forest, fontWeight: "800", fontSize: 12 }, primaryButton: { flex: 1, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.white, fontWeight: "800", fontSize: 12 }, emptyButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 } });
