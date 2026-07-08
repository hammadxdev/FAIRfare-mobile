import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import WorkingProgressScreen from "../screens/WorkingProgressScreen";
import colors from "../constants/colors";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "🏠",
  History: "🕘",
  Offers: "🏷️",
  Settings: "⚙️",
};

export default function TabNavigator() {
  // Two separate causes of a clipped tab label, both fixed here:
  // 1) A fixed tabBarStyle.height/paddingBottom bypasses react-navigation's
  //    automatic safe-area handling, so on devices with a bottom inset
  //    (iPhone home indicator, Android gesture bar) the label was squeezed
  //    against — or clipped behind — the inset. Insets are used explicitly.
  // 2) Color emoji glyphs (used as the tab icon) render with extra vertical
  //    metrics beyond their nominal fontSize on Android, especially with
  //    includeFontPadding's default extra leading — this can push the
  //    label's Text partially out of the tab item's box. Explicit lineHeight
  //    + includeFontPadding:false on Android removes that extra slack.
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 13,
          marginTop: 2,
          includeFontPadding: false,
        },
        tabBarIcon: ({ focused }) => (
          <Text
            style={{
              fontSize: 20,
              lineHeight: Platform.OS === "android" ? 24 : 22,
              includeFontPadding: false,
              textAlign: "center",
              opacity: focused ? 1 : 0.5,
            }}
          >
            {TAB_ICONS[route.name] || "•"}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History">{() => <WorkingProgressScreen title="History" />}</Tab.Screen>
      <Tab.Screen name="Offers">{() => <WorkingProgressScreen title="Offers" />}</Tab.Screen>
      <Tab.Screen name="Settings">{() => <WorkingProgressScreen title="Settings" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
