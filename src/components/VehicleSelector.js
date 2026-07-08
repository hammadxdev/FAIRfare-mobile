import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import VehicleTypeCard from "./VehicleTypeCard";
import vehicles from "../constants/vehicles";
import colors, { spacing } from "../constants/colors";

export default function VehicleSelector({ selectedVehicle, onSelectVehicle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Choose ride type</Text>
      <Text style={styles.sublabel}>Compare fares for your selected vehicle</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {vehicles.map((vehicle) => (
          <VehicleTypeCard
            key={vehicle.type}
            vehicle={vehicle}
            selected={selectedVehicle === vehicle.type}
            onPress={() => onSelectVehicle(vehicle.type)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  sublabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.lg,
  },
});
