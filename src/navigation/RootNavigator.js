import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/SplashScreen";
import TabNavigator from "./TabNavigator";
import ResultsScreen from "../screens/ResultsScreen";
import HistoryDetailScreen from "../screens/HistoryDetailScreen";
import colors from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import SavedRoutesScreen from "../screens/SavedRoutesScreen";
import PreferenceEditorScreen from "../screens/PreferenceEditorScreen";
import { AboutScreen, AccountDetailsScreen, HelpScreen, PrivacyScreen, TermsScreen } from "../screens/SupportScreens";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoading, isAuthenticated, sessionNotice, dismissSessionNotice } = useAuth();
  useEffect(() => {
    console.info(`[AUTH] loading=${isLoading}`);
  }, [isLoading]);
  useEffect(() => {
    console.info(`[AUTH] authenticated=${isAuthenticated}`);
  }, [isAuthenticated]);
  if (isLoading) return <SplashScreen />;
  return (<>
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "MainTabs" : "Auth"}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? <Stack.Group navigationKey="anonymous"><Stack.Screen name="Auth" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /><Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} /><Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /></Stack.Group> : <Stack.Group navigationKey="authenticated">
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
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ headerShown: true, title: "Past comparison", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      <Stack.Screen name="SavedRoutes" component={SavedRoutesScreen} options={{ headerShown: true, title: "Saved Trips", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} /></Stack.Group>}
      <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} options={{ headerShown: true, title: "Account details", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      <Stack.Screen name="PreferenceEditor" component={PreferenceEditorScreen} options={({ route }) => ({ headerShown: true, title: route.params?.mode === "preferred" ? "Preferred vehicle" : route.params?.mode === "avoided" ? "Avoid vehicle types" : route.params?.mode === "budget" ? "Typical budget" : "Ride priority", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary })} />
      <Stack.Screen name="AboutFairFare" component={AboutScreen} options={{ headerShown: true, title: "About Fair Fare", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: true, title: "Terms & Conditions", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: true, title: "Privacy Policy", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      <Stack.Screen name="HelpSupport" component={HelpScreen} options={{ headerShown: true, title: "Help & Support", headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.primary }} />
      </Stack.Navigator>
      <Modal transparent visible={Boolean(sessionNotice)} animationType="fade"><View style={styles.backdrop}><View style={styles.dialog}><Text style={styles.title}>Session expired</Text><Text style={styles.message}>{sessionNotice}</Text><TouchableOpacity style={styles.button} onPress={dismissSessionNotice}><Text style={styles.buttonText}>Sign in</Text></TouchableOpacity></View></View></Modal>
  </>);
}

const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.42)", alignItems: "center", justifyContent: "center", padding: 24 }, dialog: { width: "100%", backgroundColor: colors.card, borderRadius: 22, padding: 24 }, title: { color: colors.primary, fontSize: 20, fontWeight: "800" }, message: { color: colors.muted, lineHeight: 21, marginVertical: 14 }, button: { backgroundColor: colors.accent, borderRadius: 16, padding: 15, alignItems: "center" }, buttonText: { color: colors.white, fontWeight: "800" } });
