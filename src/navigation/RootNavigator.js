import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/SplashScreen";
import TabNavigator from "./TabNavigator";
import ResultsScreen from "../screens/ResultsScreen";
import FareBreakdownScreen from "../screens/FareBreakdownScreen";
import colors from "../constants/colors";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          headerShown: true,
          title: "Compare Fares",
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
        }}
      />
      <Stack.Screen
        name="FareBreakdown"
        component={FareBreakdownScreen}
        options={{
          headerShown: true,
          title: "Fare Breakdown",
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
        }}
      />
    </Stack.Navigator>
  );
}
