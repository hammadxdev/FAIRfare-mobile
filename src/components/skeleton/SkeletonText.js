import React from "react";
import SkeletonBlock from "./SkeletonBlock";

export default function SkeletonText({ width = "70%", height = 14, style }) {
  return <SkeletonBlock width={width} height={height} borderRadius={height / 2} style={style} />;
}
