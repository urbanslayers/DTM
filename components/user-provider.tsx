"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

type User = {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  credits: number
  createdAt: Date
  lastLogin?: Date
  isActive: boolean
}

type UserContextType = {
  user: User | null
  setUser: (user: User | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // For demo purposes, use the demo user
    // In a real app, this would come from authentication
    setUser({
      id: 'cmh3go54b0022ultkalaiq535',
      username: 'demo',
      email: 'demo@example.com',
      role: 'user',
      credits: 1000,
      createdAt: new Date(),
      isActive: true
    })
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within a UserProvider")
  return ctx
}
