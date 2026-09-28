import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearSession, getSession, setSessionAtomic } from "../services/authStorage";
import { authLogin, authRegister, authMe, authRefresh, authLogout, updateProfile as updateProfileRequest, configureAuth, setAuthSigningOut, resetSessionExpiryNotification } from "../services/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null); const [isLoading, setLoading] = useState(true); const [sessionNotice, setSessionNotice] = useState(null);
  const save = useCallback(async (next) => { const complete = { ...next, expiresAt: next.expiresAt || (next.expiresIn ? Date.now() + next.expiresIn * 1000 : undefined) }; await setSessionAtomic(complete); setSessionState(complete); resetSessionExpiryNotification(); return complete; }, []);
  const signOut = useCallback(async (options = {}) => { const current = await getSession(); if (options.reason === "SESSION_EXPIRED") setSessionNotice("Your session has expired. Please sign in again."); setAuthSigningOut(true); try { if (!options.silent) await authLogout(current?.refreshToken); } catch {} finally { await clearSession(); setSessionState(null); setAuthSigningOut(false); } }, []);
  const refresh = useCallback(async () => { const current = await getSession(); if (!current?.refreshToken) throw new Error("No refresh session"); const next = await authRefresh(current.refreshToken); return save({ ...current, ...next, user: next.user || current.user }); }, [save]);
  useEffect(() => { configureAuth({ getSession, refresh, signOut }); (async () => { try { const current = await getSession(); if (!current) return; try { const user = await authMe(); setSessionState({ ...current, user }); } catch (error) { try { setSessionState(await refresh()); } catch (refreshError) { if (refreshError?.response?.status === 401 || refreshError?.code === "SESSION_EXPIRED") { await clearSession(); setSessionState(null); } else { setSessionState(current); setSessionNotice("We could not restore your session. Check your connection and retry."); } } } } catch { setSessionState(null); } finally { setLoading(false); } })(); }, [refresh, signOut]);
  const login = useCallback(async (email, password) => save(await authLogin(email, password)), [save]);
  const updateProfile = useCallback(async (name) => {
    const current = await getSession();
    const user = await updateProfileRequest(name);
    if (current) await save({ ...current, user });
    return user;
  }, [save]);
  const register = useCallback(async (name, email, password) => authRegister(name, email, password), []);
  return <AuthContext.Provider value={{ user: session?.user || null, isLoading, isAuthenticated: Boolean(session?.accessToken && session?.user), login, register, updateProfile, logout: signOut, sessionNotice, dismissSessionNotice: () => setSessionNotice(null) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
