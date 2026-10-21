import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { clearSession, getSession, setSessionAtomic } from "../services/authStorage";
import { AUTH_RESTORE_TIMEOUT_MS, authLogin, authRegister, authMe, authRefresh, authLogout, updateProfile as updateProfileRequest, configureAuth, setAuthSigningOut, resetSessionExpiryNotification } from "../services/api";
import { createOperationGate, isRefreshAuthFailure, shouldRevalidate, withTimeout } from "../services/authRetry.cjs";

const AuthContext = createContext(null);
const FOREGROUND_REVALIDATION_MS = 60_000;

function invalidatedError() { return Object.assign(new Error("Authentication operation was invalidated"), { code: "AUTH_OPERATION_INVALIDATED" }); }

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
      // Only remove the value this operation wrote. A newer login may already
      // have replaced it while the stale request was finishing.
      const stored = await getSession().catch(() => null);
      if (stored?.accessToken === complete.accessToken && stored?.refreshToken === complete.refreshToken) await clearSession();
      throw invalidatedError();
    }
    setSessionState(complete);
    resetSessionExpiryNotification();
    return complete;
  }, []);

  const signOut = useCallback(async (options = {}) => {
    const logoutGeneration = gateRef.current.invalidate();
    lastValidatedAtRef.current = 0;
    if (options.reason === "SESSION_EXPIRED") setSessionNotice({ title: "Session expired", message: "Your session has expired. Please sign in again.", action: "Continue" });
    else setSessionNotice(null);
    setAuthSigningOut(true);
    let current = null;
    try { current = options.session || await getSession(); } catch {}
    try { if (!options.silent) await authLogout(current?.refreshToken); } catch {}
    finally {
      // A newer login supersedes this logout. Do not let the old request clear
      // or replace the newer session when its network operation completes.
      if (gateRef.current.isCurrent(logoutGeneration)) {
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
    if (!current.accessToken || !current.refreshToken) { await signOut({ reason: "SESSION_EXPIRED", silent: true, session: current }); return "expired"; }
    try {
      const user = await withTimeout(authMe({ authDeadlineMs: AUTH_RESTORE_TIMEOUT_MS, timeout: AUTH_RESTORE_TIMEOUT_MS }), AUTH_RESTORE_TIMEOUT_MS + 250, "AUTH_RESTORE_TIMEOUT");
      if (!gateRef.current.isCurrent(generation)) return "invalidated";
      lastValidatedAtRef.current = Date.now();
      setSessionState({ ...current, user });
      setSessionNotice(null);
      return "valid";
    } catch (error) {
      if (!gateRef.current.isCurrent(generation)) return "invalidated";
      if (error?.code === "SESSION_EXPIRED" || isRefreshAuthFailure(error?.cause)) { await signOut({ reason: "SESSION_EXPIRED", silent: true, session: current }); return "expired"; }
      if (error?.code === "AUTH_RESTORE_TIMEOUT") gateRef.current.invalidate();
      setSessionState(current);
      if (showNotice) setSessionNotice({ title: "Connection unavailable", message: "We could not verify your session. Check your connection and retry.", action: "Retry" });
      return "transient";
    }
  }, [signOut]);

  const restoreSession = useCallback(async () => {
    if (restorePromiseRef.current) return restorePromiseRef.current;
    const task = (async () => { try { await validateStoredSession(); } catch { setSessionState(null); } finally { setLoading(false); } })();
    restorePromiseRef.current = task;
    try { return await task; } finally { restorePromiseRef.current = null; }
  }, [validateStoredSession]);

  const retrySession = useCallback(async () => {
    setRetrying(true); setSessionNotice(null); lastValidatedAtRef.current = 0;
    try { await validateStoredSession(); } finally { setRetrying(false); }
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

  const login = useCallback(async (email, password) => {
    const generation = gateRef.current.invalidate();
    return save(await authLogin(email, password), generation);
  }, [save]);
  const updateProfile = useCallback(async (name) => { const current = await getSession(); const user = await updateProfileRequest(name); if (current) await save({ ...current, user }); return user; }, [save]);
  const register = useCallback(async (name, email, password) => authRegister(name, email, password), []);
  return <AuthContext.Provider value={{ user: session?.user || null, isLoading, isRetrying, isAuthenticated: Boolean(session?.accessToken && session?.user), login, register, updateProfile, logout: signOut, retrySession, sessionNotice, dismissSessionNotice: () => setSessionNotice(null) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
