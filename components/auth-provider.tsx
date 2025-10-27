"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

// Utility to fetch the token from your API route
async function fetchAuthToken(): Promise<{ token: string | null; expiresIn: number }> {
  const response = await fetch("/api/auth/token", { method: "POST" })
  if (!response.ok) return { token: null, expiresIn: 0 }
  const data = await response.json()
  return {
    token: data.access_token || null,
    expiresIn: data.expires_in || 3600, // seconds
  }
}

type AuthContextType = {
  token: string | null
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  const getAndSetToken = useCallback(async () => {
    const { token, expiresIn } = await fetchAuthToken()
    setToken(token)
    // Set timer to refresh 5 minutes before expiry
    if (refreshTimer) clearTimeout(refreshTimer)
    if (token && expiresIn) {
      const refreshInMs = Math.max((expiresIn - 300) * 1000, 60 * 1000) // at least 1 min
      const timer = setTimeout(getAndSetToken, refreshInMs)
      setRefreshTimer(timer)
    }
  }, []) // Remove refreshTimer from dependencies

  useEffect(() => {
    getAndSetToken()
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [])

  const refreshToken = useCallback(async () => {
    await getAndSetToken()
  }, [getAndSetToken])

  return (
    <AuthContext.Provider value={{ token, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
} 