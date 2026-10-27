import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import AIChatScreen from "../screens/AIChatScreen";
import SettingsScreen from "../screens/SettingsRootScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SavedRoutesScreen from "../screens/SavedRoutesScreen";
import colors from "../constants/colors";

const Tab = createBottomTabNavigator();
const TAB_ICONS = { Home: "home-variant-outline", Saved: "bookmark-outline", History: "history", "AI Chat": "message-text-outline", Settings: "cog-outline" };

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  useEffect(() => {
    console.info("[NAV] navigator mounted");
    return () => console.info("[NAV] navigator unmounted");
  }, []);
  return <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    animation: "fade",
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.outlineVariant, height: 66 + bottomPadding, paddingBottom: bottomPadding, paddingTop: 7, elevation: 8, shadowColor: "#0F172A", shadowOpacity: .08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
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
    tabBarIcon: ({ focused, color }) => <MaterialCommunityIcons name={TAB_ICONS[route.name] || "circle-outline"} size={focused ? 24 : 22} color={color} />,
  })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Saved" component={SavedRoutesScreen} options={{ title: "Saved" }} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="AI Chat" component={AIChatScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>;
}

const styles = StyleSheet.create({ tabBarButton: { outlineStyle: "none" } });
