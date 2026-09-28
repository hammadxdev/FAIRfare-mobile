import React from "react";
import { View } from "react-native";
import SkeletonBlock from "./SkeletonBlock";
import { radius, spacing } from "../../constants/colors";
export default function ConversationListSkeleton({ count = 5 }) { return <View>{Array.from({ length: count }).map((_, index) => <View key={index} style={{ minHeight: 64, marginBottom: 6, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm }}><SkeletonBlock width={34} height={34} borderRadius={radius.full} /><View style={{ flex: 1, marginLeft: 10 }}><SkeletonBlock width={index % 2 ? "70%" : "55%"} height={14} /><SkeletonBlock width="38%" height={11} style={{ marginTop: 6 }} /></View><SkeletonBlock width={18} height={22} borderRadius={5} /></View>)}</View>; }
