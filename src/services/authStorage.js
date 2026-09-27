import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "fairfare.auth.session";

function webStorage() {
  return typeof globalThis !== "undefined" && globalThis.localStorage
    ? globalThis.localStorage
    : null;
}

async function readValue() {
  if (Platform.OS === "web") return webStorage()?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function removeValue() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}

export async function getSession() {
  const value = await readValue();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    // A damaged browser/native value must not prevent the app from starting.
    await removeValue();
    return null;
  }
}

export async function setSession(session) {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") {
    webStorage()?.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

export async function setSessionAtomic(session) {
  if (!session?.accessToken || !session?.refreshToken) throw new Error("Invalid session");
  return setSession(session);
}

export async function clearSession() {
  await removeValue();
}
