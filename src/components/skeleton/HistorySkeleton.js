import React from "react";
import { View } from "react-native";
import SkeletonCard from "./SkeletonCard";
import SkeletonBlock from "./SkeletonBlock";
import { spacing } from "../../constants/colors";
export default function HistorySkeleton({ count = 4 }) { return <View>{Array.from({ length: count }).map((_, index) => <SkeletonCard key={index}><SkeletonBlock width="82%" height={17} /><SkeletonBlock width="42%" height={12} style={{ marginTop: spacing.sm }} /><View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg }}><SkeletonBlock width="24%" height={13} /><SkeletonBlock width="25%" height={13} /></View><SkeletonBlock width="100%" height={1} style={{ marginTop: spacing.md }} /><View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}><SkeletonBlock width="48%" height={44} borderRadius={16} /><SkeletonBlock width="48%" height={44} borderRadius={16} /></View></SkeletonCard>)}</View>; }
