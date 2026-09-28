import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonBlock from "./SkeletonBlock";
import SkeletonCard from "./SkeletonCard";
import colors, { radius, spacing } from "../../constants/colors";

function ProviderSkeleton() {
  return <SkeletonCard style={styles.providerCard}><View style={styles.header}><View style={styles.copy}><SkeletonBlock width="62%" height={18} /><SkeletonBlock width="44%" height={12} style={styles.gap} /><SkeletonBlock width="50%" height={12} style={styles.gap} /></View><View style={styles.fare}><SkeletonBlock width={78} height={11} /><SkeletonBlock width={92} height={23} style={styles.gap} /></View></View><View style={styles.panel}><SkeletonBlock width="45%" height={13} /><SkeletonBlock width="30%" height={17} /></View><View style={styles.panel}><SkeletonBlock width="52%" height={13} /><SkeletonBlock width="70%" height={12} style={styles.gap} /></View><SkeletonBlock height={44} borderRadius={radius.md} style={styles.button} /></SkeletonCard>;
}

export default function FareResultsSkeleton() {
  return <View accessibilityLabel="Loading fare results"><SkeletonCard style={styles.summary}><SkeletonBlock width="72%" height={15} /><SkeletonBlock width="60%" height={15} style={styles.gap} /><View style={styles.meta}><SkeletonBlock width="24%" height={12} /><SkeletonBlock width="24%" height={12} /><SkeletonBlock width="24%" height={12} /></View></SkeletonCard><SkeletonBlock width="52%" height={13} style={styles.section} /><ProviderSkeleton /><ProviderSkeleton /><ProviderSkeleton /></View>;
}
const styles = StyleSheet.create({ summary: { marginBottom: spacing.lg }, providerCard: { padding: spacing.lg }, header: { flexDirection: "row", justifyContent: "space-between" }, copy: { flex: 1 }, fare: { alignItems: "flex-end", marginLeft: spacing.sm }, gap: { marginTop: spacing.sm }, meta: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md }, panel: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, button: { marginTop: spacing.md, width: "100%" }, section: { marginBottom: spacing.sm } });
