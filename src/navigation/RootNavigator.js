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
import NameSetupScreen from "../screens/NameSetupScreen";
import SavedRoutesScreen from "../screens/SavedRoutesScreen";
import PreferenceEditorScreen from "../screens/PreferenceEditorScreen";
import { AboutScreen, HelpScreen, PrivacyScreen, TermsScreen } from "../screens/SupportScreens";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
export default function RootNavigator() {
  const { isLoading, isAuthenticated, user, isRetrying, retrySession, sessionNotice, dismissSessionNotice } = useAuth();
  useEffect(() => { if (__DEV__) console.info(`[AUTH] loading=${isLoading}`); }, [isLoading]);
  useEffect(() => { if (__DEV__) console.info(`[AUTH] authenticated=${isAuthenticated}`); }, [isAuthenticated]);
  if (isLoading) return <SplashScreen />;
  const needsName = isAuthenticated && !String(user?.name || "").trim();
  const appKey = needsName ? "profile-setup" : "fairfare-app";
  return <><Stack.Navigator key={isAuthenticated ? appKey : "email-auth"} initialRouteName={isAuthenticated ? (needsName ? "NameSetup" : "MainTabs") : "Auth"} screenOptions={{ headerShown:false, animation:"fade", contentStyle:{backgroundColor:colors.background}, headerShadowVisible:false, headerTintColor:colors.primary, headerTitleStyle:{fontSize:18,fontWeight:"900"}, headerBackTitle:"Back" }}>
    {!isAuthenticated ? <Stack.Screen name="Auth" component={LoginScreen} /> : needsName ? <Stack.Screen name="NameSetup" component={NameSetupScreen} /> : <Stack.Group navigationKey="fairfare-app">
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{headerShown:true,title:"Past comparison",headerStyle:{backgroundColor:colors.surface}}} />
      <Stack.Screen name="SavedRoutes" component={SavedRoutesScreen} options={{headerShown:true,title:"Saved Trips",headerStyle:{backgroundColor:colors.surface}}} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{headerShown:true,title:"Profile",headerStyle:{backgroundColor:colors.surface}}} />
      <Stack.Screen name="PreferenceEditor" component={PreferenceEditorScreen} options={({route})=>({headerShown:true,title:route.params?.mode==="preferred"?"Preferred vehicle":route.params?.mode==="avoided"?"Avoid vehicle types":route.params?.mode==="budget"?"Typical budget":"Ride priority",headerStyle:{backgroundColor:colors.surface}})} />
      <Stack.Screen name="AboutFairFare" component={AboutScreen} options={{headerShown:true,title:"About FareFare",headerStyle:{backgroundColor:colors.card},headerTintColor:colors.primary}} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{headerShown:true,title:"Terms & Conditions",headerStyle:{backgroundColor:colors.card},headerTintColor:colors.primary}} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{headerShown:true,title:"Privacy Policy",headerStyle:{backgroundColor:colors.card},headerTintColor:colors.primary}} />
      <Stack.Screen name="HelpSupport" component={HelpScreen} options={{headerShown:true,title:"Help & Support",headerStyle:{backgroundColor:colors.card},headerTintColor:colors.primary}} />
    </Stack.Group>}
  </Stack.Navigator><Modal transparent visible={Boolean(sessionNotice)} animationType="fade"><View style={styles.backdrop}><View style={styles.dialog}><Text style={styles.title}>{sessionNotice?.title||"Session issue"}</Text><Text style={styles.message}>{sessionNotice?.message||sessionNotice}</Text><TouchableOpacity style={styles.button} onPress={sessionNotice?.action==="Retry"?retrySession:dismissSessionNotice} disabled={isRetrying}><Text style={styles.buttonText}>{isRetrying?"Retrying…":(sessionNotice?.action||"Continue")}</Text></TouchableOpacity></View></View></Modal></>;
}
const styles=StyleSheet.create({backdrop:{flex:1,backgroundColor:"rgba(15,23,42,.42)",alignItems:"center",justifyContent:"center",padding:24},dialog:{width:"100%",backgroundColor:colors.card,borderRadius:22,padding:24},title:{color:colors.primary,fontSize:20,fontWeight:"800"},message:{color:colors.muted,lineHeight:21,marginVertical:14},button:{backgroundColor:colors.accent,borderRadius:16,padding:15,alignItems:"center"},buttonText:{color:colors.white,fontWeight:"800"}});
