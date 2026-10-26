import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { clearSession, getSession, setSessionAtomic } from "../services/authStorage";
import { AUTH_RESTORE_TIMEOUT_MS, requestEmailOtp as requestEmailOtpApi, verifyEmailOtp as verifyEmailOtpApi, authMe, authRefresh, authLogout, updateProfile as updateProfileRequest, configureAuth, setAuthSigningOut, resetSessionExpiryNotification } from "../services/api";
import { createOperationGate, isRefreshAuthFailure, shouldRevalidate, withTimeout } from "../services/authRetry.cjs";

const AuthContext = createContext(null);
const FOREGROUND_REVALIDATION_MS = 60_000;
function invalidatedError() { return Object.assign(new Error("Authentication operation was invalidated"), { code: "AUTH_OPERATION_INVALIDATED" }); }
function accessTokenExpiryMillis(token) {
  try {
    const segment = String(token || "").split(".")[1];
    if (!segment) return null;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const encoded = segment.replace(/-/g, "+").replace(/_/g, "/");
    let accumulator = 0; let bits = 0; let binary = "";
    for (const character of encoded) {
      if (character === "=") break;
      const value = alphabet.indexOf(character);
      if (value < 0) return null;
      accumulator = (accumulator << 6) | value;
      bits += 6;
      if (bits >= 8) { bits -= 8; binary += String.fromCharCode((accumulator >> bits) & 255); }
      accumulator &= (1 << bits) - 1;
    }
    const json = decodeURIComponent(Array.from(binary, (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
    const expiration = Number(JSON.parse(json).exp);
    return Number.isFinite(expiration) && expiration > 0 ? expiration * 1000 : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [isRetrying, setRetrying] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(null);
  const gateRef = useRef(createOperationGate());
  const restorePromiseRef = useRef(null);
  const foregroundPromiseRef = useRef(null);
  const lastValidatedAtRef = useRef(0);

  const save = useCallback(async (next, generation = gateRef.current.current()) => {
    if (!gateRef.current.isCurrent(generation)) throw invalidatedError();
    const complete = { ...next, expiresAt: next.expiresAt || (next.expiresIn ? Date.now() + next.expiresIn * 1000 : undefined) };
    await setSessionAtomic(complete);
    if (!gateRef.current.isCurrent(generation)) {
      const stored = await getSession().catch(() => null);
      if (stored?.accessToken === complete.accessToken && stored?.refreshToken === complete.refreshToken) await clearSession();
      throw invalidatedError();
    }
    setSessionState(complete);
    resetSessionExpiryNotification();
    return complete;
  }, []);

  const signOut = useCallback(async (options = {}) => {
    const generation = gateRef.current.invalidate();
    lastValidatedAtRef.current = 0;
    let current = null;
    try { current = options.session || await getSession(); } catch {}
    if (options.reason === "SESSION_EXPIRED") setSessionNotice({ title: "Session expired", message: "Verify your email to sign in again. Your saved account data remains attached to that email.", action: "Continue" });
    else setSessionNotice(null);
    setAuthSigningOut(true);
    try { if (!options.silent && current?.refreshToken) await authLogout(current.refreshToken); } catch {}
    finally {
      if (gateRef.current.isCurrent(generation)) {
        await clearSession();
        setSessionState(null);
        setLoading(false);
        setRetrying(false);
      }
      setAuthSigningOut(false);
    }
  }, []);

  const refresh = useCallback(async (options = {}) => {
    const generation = gateRef.current.current();
    const current = await getSession();
    if (!current?.refreshToken) throw new Error("No refresh session");
    const next = await authRefresh(current.refreshToken, options);
    if (!gateRef.current.isCurrent(generation)) throw invalidatedError();
    return save({ ...current, ...next, user: next.user || current.user }, generation);
  }, [save]);

  const validateStoredSession = useCallback(async ({ showNotice = true } = {}) => {
    const generation = gateRef.current.current();
    const current = await getSession();
    if (!current) { if (gateRef.current.isCurrent(generation)) setSessionState(null); return "none"; }
    if (!current.accessToken || !current.refreshToken) {
      await signOut({ reason: "SESSION_EXPIRED", silent: true, session: current });
      return "expired";
    }
    try {
      const user = await withTimeout(authMe({ authDeadlineMs: AUTH_RESTORE_TIMEOUT_MS, timeout: AUTH_RESTORE_TIMEOUT_MS }), AUTH_RESTORE_TIMEOUT_MS + 250, "AUTH_RESTORE_TIMEOUT");
      if (!gateRef.current.isCurrent(generation)) return "invalidated";
      lastValidatedAtRef.current = Date.now();
      setSessionState({ ...current, user });
      setSessionNotice(null);
      return "valid";
    } catch (error) {
      if (!gateRef.current.isCurrent(generation)) return "invalidated";
      if (error?.code === "SESSION_EXPIRED" || isRefreshAuthFailure(error?.cause)) {
        await signOut({ reason: "SESSION_EXPIRED", silent: true, session: current });
        return "expired";
      }
      if (error?.code === "AUTH_RESTORE_TIMEOUT") gateRef.current.invalidate();
      setSessionState(current);
      if (showNotice) setSessionNotice({ title: "Connection unavailable", message: "We could not verify your saved session. Check your connection and retry.", action: "Retry" });
      return "transient";
    }
  }, [signOut]);

  const restoreSession = useCallback(async () => {
    if (restorePromiseRef.current) return restorePromiseRef.current;
    const task = (async () => {
      try { await validateStoredSession(); }
      catch { setSessionNotice({ title: "Session unavailable", message: "We could not read your saved session. Retry or verify your email to continue.", action: "Retry" }); }
      finally { setLoading(false); }
    })();
    restorePromiseRef.current = task;
    try { return await task; } finally { restorePromiseRef.current = null; }
  }, [validateStoredSession]);

  const retrySession = useCallback(async () => {
    setRetrying(true); setSessionNotice(null); lastValidatedAtRef.current = 0;
    try { await validateStoredSession(); }
    catch { setSessionNotice({ title: "Connection unavailable", message: "We could not restore your saved session. Check your connection and retry.", action: "Retry" }); }
    finally { setRetrying(false); }
  }, [validateStoredSession]);

  useEffect(() => { configureAuth({ getSession, refresh, signOut }); restoreSession(); }, [refresh, restoreSession, signOut]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || isLoading || !session?.accessToken) return;
      if (!shouldRevalidate(lastValidatedAtRef.current, Date.now(), FOREGROUND_REVALIDATION_MS) || foregroundPromiseRef.current) return;
      foregroundPromiseRef.current = validateStoredSession().catch(() => "transient").finally(() => { foregroundPromiseRef.current = null; });
    });
    return () => subscription.remove();
  }, [isLoading, session?.accessToken, validateStoredSession]);

  const requestEmailOtp = useCallback(async (email) => requestEmailOtpApi(email.trim().toLowerCase()), []);
  const verifyEmailOtp = useCallback(async (email, code) => {
    const generation = gateRef.current.invalidate();
    const result = await verifyEmailOtpApi(email.trim().toLowerCase(), code);
    await save(result, generation);
    return result;
  }, [save]);
  const updateProfile = useCallback(async (name) => {
    const current = await getSession();
    const user = await updateProfileRequest(name);
    if (current) await save({ ...current, user });
    return user;
  }, [save]);
  const isAuthenticated = Boolean(session?.accessToken && session?.user);
  return <AuthContext.Provider value={{ user: session?.user || null, isLoading, isRetrying, isAuthenticated, requestEmailOtp, verifyEmailOtp, updateProfile, logout: signOut, retrySession, sessionNotice, dismissSessionNotice: () => setSessionNotice(null) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
