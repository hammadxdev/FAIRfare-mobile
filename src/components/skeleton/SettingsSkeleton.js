import React from "react";
import { View } from "react-native";
import SkeletonBlock from "./SkeletonBlock";
import colors, { radius, spacing } from "../../constants/colors";
export default function SettingsSkeleton() { return <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden" }}>{Array.from({ length: 4 }).map((_, index) => <View key={index} style={{ minHeight: 72, padding: spacing.md, flexDirection: "row", alignItems: "center", borderBottomWidth: index === 3 ? 0 : 1, borderBottomColor: colors.border }}><SkeletonBlock width={30} height={30} borderRadius={15} /><View style={{ flex: 1, marginLeft: spacing.md }}><SkeletonBlock width="48%" height={15} /><SkeletonBlock width="70%" height={12} style={{ marginTop: spacing.sm }} /></View><SkeletonBlock width={10} height={22} borderRadius={5} /></View>)}</View>; }
