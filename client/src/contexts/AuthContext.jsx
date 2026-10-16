import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((requestError) => {
        if (!active) return;
        setUser(null);
        if (requestError.status !== 401) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleUnauthorized = () => {
      setUser(null);
      setError("");
      setLoading(false);
    };
    window.addEventListener("sthira:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener("sthira:unauthorized", handleUnauthorized);
    };
  }, []);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    setUser(data.user);
    setError("");
    return data.user;
  }

  async function register(name, email, password) {
    const data = await registerRequest(name, email, password);
    setUser(data.user);
    setError("");
    return data.user;
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    setUser(null);
    setError("");
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
