import React, { useState } from "react";
import { TouchableOpacity, View, Text, Image, StyleSheet } from "react-native";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { VEHICLE_FALLBACK_EMOJI } from "../constants/vehicles";

export default function VehicleTypeCard({ vehicle, selected = false, onPress }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(vehicle.image) && !imageFailed;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkBadgeText}>✓</Text>
        </View>
      )}

      <View style={styles.imageWrap}>
        {showImage ? (
          <Image
            source={vehicle.image}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={styles.emoji}>{VEHICLE_FALLBACK_EMOJI[vehicle.type] || "🚗"}</Text>
        )}
      </View>
      <Text style={[styles.title, selected && styles.titleSelected]}>{vehicle.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {vehicle.subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 122,
    minHeight: 148,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    position: "relative",
    ...shadow,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#F0FDF4",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  checkBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  imageWrap: {
    width: 90,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  image: {
    width: 90,
    height: 70,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  titleSelected: {
    color: "#15803D",
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
  },
});
