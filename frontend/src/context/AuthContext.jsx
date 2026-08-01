// Why this exists: login state (who's logged in, their role, their
// org) is needed all over the app — ProtectedRoute, the nav, every
// dashboard. Context means that lives in one place instead of being
// re-fetched or prop-drilled through every page.
//
// Depends on: services/authService.js, services/api.js
// Depended on by: ProtectedRoute, Login, Register, and anything that
// needs to know who's logged in (via the useAuth hook below).
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "../services/authService";
import { saveToken, clearToken, getToken, setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  // Why a separate `initializing` flag from a per-action `loading`:
  // `initializing` covers the ONE-TIME "do we already have a valid
  // session from a previous visit" check on first mount — routes
  // shouldn't render (and ProtectedRoute shouldn't redirect to
  // /login) until that's resolved, or a page reload would flash the
  // login screen before /me comes back.
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    clearToken();
    setUser(null);
    setOrganization(null);
  }, []);

  // Runs once on mount: if a token is already in localStorage (from
  // a previous visit), verify it's still valid by calling /me rather
  // than trusting a stale localStorage user object. This is also
  // what makes "automatic login persistence" work — refresh the
  // page, still logged in.
  useEffect(() => {
    async function hydrate() {
      const token = getToken();
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const data = await authService.fetchMe();
        setUser(data.user);
        setOrganization(data.organization || null);
      } catch {
        clearSession(); // token expired/invalid — don't keep it around
      } finally {
        setInitializing(false);
      }
    }
    hydrate();
  }, [clearSession]);

  // Registers this session's logout logic with the axios interceptor
  // in api.js, so a 401 from ANY request (not just an explicit logout
  // click) clears the session automatically — e.g. the token expired
  // mid-session on a protected page.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  async function login(credentials) {
    const data = await authService.login(credentials);
    saveToken(data.token);
    setUser(data.user);
    setOrganization(data.organization || null);
    return data; // caller (Login page) uses data.user.role for redirect
  }

  async function registerVolunteer(fields) {
    const data = await authService.registerVolunteer(fields);
    saveToken(data.token);
    setUser(data.user);
    setOrganization(null);
    return data;
  }

  async function registerOrganizer(fields) {
    const data = await authService.registerOrganizer(fields);
    saveToken(data.token);
    setUser(data.user);
    setOrganization(data.organization || null);
    return data;
  }

  function logout() {
    clearSession();
  }

  const value = {
    user,
    organization,
    isAuthenticated: !!user,
    initializing,
    login,
    registerVolunteer,
    registerOrganizer,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
