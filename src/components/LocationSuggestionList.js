import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import colors from "../constants/colors";
import { getLocationSecondaryText } from "../utils/locationDisplay";

function distanceLabel(item) {
  if (!Number.isFinite(item.distanceMeters)) return "";
  return item.distanceMeters < 1000 ? `${Math.round(item.distanceMeters)} m away` : `${(item.distanceMeters / 1000).toFixed(1)} km away`;
}

function matchLabel(item) {
  if (item.isHistory || item.matchStrength === "history") return "Recent location";
  if (item.matchStrength === "strong") return "Best match";
  if (item.matchStrength === "related") return "Related match";
  return "Partial match";
}

function suggestionKey(item, index, usedKeys) {
  const base = item?.id || item?.placeId || `${item?.name || item?.description || "location"}-${item?.lat ?? ""}-${item?.lng ?? ""}`;
  const key = String(base);
  if (!usedKeys.has(key)) {
    usedKeys.add(key);
    return key;
  }
  const uniqueKey = `${key}-${index}`;
  usedKeys.add(uniqueKey);
  return uniqueKey;
}

export default function LocationSuggestionList({ suggestions, onSelect, onRemove }) {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
  if (safeSuggestions.length === 0) return null;
  const usedKeys = new Set();

  return (
    <View>
      {safeSuggestions.map((item, index) => (
        <Pressable
          key={suggestionKey(item, index, usedKeys)}
          onPress={() => onSelect?.(item)}
          style={({ pressed }) => [
            styles.item,
            index === safeSuggestions.length - 1 && styles.lastItem,
            pressed && styles.itemPressed,
          ]}
        >
          <View style={styles.copy}>
            <Text style={styles.name} numberOfLines={1}>{item.name || item.description || "Unnamed location"}</Text>
            <Text style={styles.address} numberOfLines={1}>{[matchLabel(item), getLocationSecondaryText(item) || item.address, distanceLabel(item)].filter(Boolean).join(" · ")}</Text>
          </View>
          {item.isHistory && onRemove ? <Pressable
            onPress={(event) => { event.stopPropagation?.(); onRemove(item); }}
            hitSlop={8}
            style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name || "recent location"} from recents`}
          ><Text style={styles.removeText}>×</Text></Pressable> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: "#F1F5F9",
  },
  copy: { flex: 1, minWidth: 0, paddingRight: 8 },
  removeButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  removeButtonPressed: { backgroundColor: "#FEE2E2" },
  removeText: { color: colors.muted, fontSize: 23, lineHeight: 24, fontWeight: "500" },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  address: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
