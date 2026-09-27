import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import AIChatScreen from "../screens/AIChatScreen";
import SettingsScreen from "../screens/SettingsRootScreen";
import HistoryScreen from "../screens/HistoryScreen";
import colors from "../constants/colors";

const Tab = createBottomTabNavigator();
const TAB_ICONS = { Home: "🏠", History: "🕘", "AI Chat": "✦", Settings: "⚙️" };

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  useEffect(() => {
    console.info("[NAV] navigator mounted");
    return () => console.info("[NAV] navigator unmounted");
  }, []);
  return <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 62 + bottomPadding, paddingBottom: bottomPadding, paddingTop: 6 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600", lineHeight: 13, marginTop: 2, includeFontPadding: false },
    // React Navigation supplies `href` for web tab buttons. Keep the custom
    // button a press target so a tab switch cannot become a document request.
    tabBarButton: ({ href: _href, onPress, ...props }) => (
      <TouchableOpacity
        {...props}
        onPress={(event) => {
          if (route.name === "Settings") console.info("[NAV] Settings pressed");
          onPress?.(event);
        }}
        style={[props.style, styles.tabBarButton]}
      />
    ),
    tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, lineHeight: Platform.OS === "android" ? 24 : 22, includeFontPadding: false, textAlign: "center", opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[route.name] || "•"}</Text>,
  })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="AI Chat" component={AIChatScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>;
}

const styles = StyleSheet.create({ tabBarButton: { outlineStyle: "none" } });
