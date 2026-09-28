import React from "react";
import { View } from "react-native";
import SkeletonCard from "./SkeletonCard";
import SkeletonBlock from "./SkeletonBlock";
import { radius, spacing } from "../../constants/colors";
export default function SavedRoutesSkeleton({ count = 3 }) { return <View>{Array.from({ length: count }).map((_, index) => <SkeletonCard key={index}><SkeletonBlock width="48%" height={18} /><SkeletonBlock width="26%" height={11} style={{ marginTop: spacing.sm }} /><SkeletonBlock width="82%" height={14} style={{ marginTop: spacing.lg }} /><SkeletonBlock width="65%" height={14} style={{ marginTop: spacing.sm }} /><SkeletonBlock width="100%" height={42} borderRadius={radius.md} style={{ marginTop: spacing.lg }} /></SkeletonCard>)}</View>; }
