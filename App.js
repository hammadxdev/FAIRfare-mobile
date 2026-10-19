import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import AppErrorBoundary from "./src/components/AppErrorBoundary";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary><AuthProvider><NavigationContainer><StatusBar style="dark" /><RootNavigator /></NavigationContainer></AuthProvider></AppErrorBoundary>
    </SafeAreaProvider>
  );
}
