import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import AppErrorBoundary from "./src/components/AppErrorBoundary";

export default function App() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}><AppErrorBoundary><AuthProvider><NavigationContainer><StatusBar style="dark" /><RootNavigator /></NavigationContainer></AuthProvider></AppErrorBoundary></View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, minHeight: "100%", width: "100%" } });
