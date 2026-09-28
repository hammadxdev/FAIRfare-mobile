import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonCard from "./SkeletonCard";
import SkeletonBlock from "./SkeletonBlock";
import { radius, spacing } from "../../constants/colors";
export default function HomeSkeleton() { return <View><SkeletonCard><SkeletonBlock width="55%" height={16} /><SkeletonBlock width="82%" height={14} style={styles.gap} /><SkeletonBlock width="82%" height={14} style={styles.gap} /></SkeletonCard><SkeletonBlock width="40%" height={14} style={styles.section} /><View style={styles.vehicleRow}>{[1, 2, 3].map((item) => <SkeletonBlock key={item} width="30%" height={74} borderRadius={radius.md} />)}</View><SkeletonBlock width="45%" height={14} style={styles.section} /><SkeletonCard><SkeletonBlock width="64%" height={16} /><SkeletonBlock width="78%" height={13} style={styles.gap} /><SkeletonBlock width="60%" height={13} style={styles.gap} /></SkeletonCard></View>; }
const styles = StyleSheet.create({ gap: { marginTop: spacing.sm }, section: { marginBottom: spacing.sm, marginTop: spacing.md }, vehicleRow: { flexDirection: "row", justifyContent: "space-between" } });
