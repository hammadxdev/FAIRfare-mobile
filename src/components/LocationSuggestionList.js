import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import colors from "../constants/colors";

export default function LocationSuggestionList({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View>
      {suggestions.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.item,
            index === suggestions.length - 1 && styles.lastItem,
            pressed && styles.itemPressed,
          ]}
        >
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#FFFFFF",
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
