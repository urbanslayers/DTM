"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: () => void
}

export function LoginDialog({ open, onOpenChange, onLoginSuccess }: LoginDialogProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user session/token in localStorage or session storage
        console.log("[LOGIN DIALOG] Login response data:", data)
        console.log("[LOGIN DIALOG] User data from response:", data.user)
        console.log("[LOGIN DIALOG] User role from response:", data.user?.role)

        if (data.user) {
          // Store the complete user data including role
          const userData = {
            ...data.user,
            role: data.user.role || 'user' // Ensure role is set, default to 'user' if not provided
          };
          
          localStorage.setItem("user", JSON.stringify(userData));
          console.log('[LOGIN DIALOG] Stored user data in localStorage:', userData);
          
          // Also store in session storage for immediate access
          sessionStorage.setItem('currentUser', JSON.stringify(userData));
        }

        onLoginSuccess()
        onOpenChange(false)
      } else {
        console.error("[LOGIN DIALOG] Login failed:", data)
        setError(data.error_description || "Login failed")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("Login error:", err)
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Desktop Messaging Login
          </DialogTitle>
          <DialogDescription>
            Enter your credentials to access the messaging system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "LOGIN"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
