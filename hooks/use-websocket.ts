"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import type { AdminAlert, SystemMetrics } from "@/lib/websocket-server"

interface UseWebSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, reconnection = true, reconnectionAttempts = 5, reconnectionDelay = 1000 } = options

  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect])

  const connect = () => {
    if (socket?.connected) return

    try {
      const newSocket = io({
        path: "/socket.io",
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        timeout: 10000, // Add connection timeout
        forceNew: true, // Force a new connection each time
        transports: ["websocket", "polling"],
      })

      newSocket.on("connect", () => {
        console.log("WebSocket connected")
        setConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      })

      newSocket.on("disconnect", (reason) => {
        console.log("WebSocket disconnected:", reason)
        setConnected(false)

        if (reason === "io server disconnect") {
          // Server initiated disconnect, try to reconnect
          attemptReconnect()
        }
      })

      newSocket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error)
        setConnectionError(`Connection failed: ${error.message}`)
        attemptReconnect()
      })

      // Admin-specific events
      newSocket.on("admin:alert:new", (alert: AdminAlert) => {
        setAlerts((prev) => [alert, ...prev.slice(0, 49)]) // Keep last 50 alerts
      })

      newSocket.on("admin:alerts:history", (alertHistory: AdminAlert[]) => {
        setAlerts(alertHistory)
      })

      newSocket.on("admin:metrics:update", (newMetrics: SystemMetrics) => {
        setMetrics(newMetrics)
      })

      setSocket(newSocket)
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error)
      setConnectionError("Failed to create connection")
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (socket) {
      socket.disconnect()
      setSocket(null)
    }

    setConnected(false)
    reconnectAttemptsRef.current = 0
  }

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= reconnectionAttempts) {
      setConnectionError("Max reconnection attempts reached")
      return
    }

    reconnectAttemptsRef.current++

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${reconnectionAttempts})`)
      connect()
    }, reconnectionDelay * reconnectAttemptsRef.current)
  }

  const authenticateAsAdmin = (token: string) => {
    if (socket) {
      socket.emit("admin:authenticate", token)
    }
  }

  const authenticateAsUser = (userId: string) => {
    if (socket) {
      socket.emit("user:authenticate", userId)
    }
  }

  const emitAdminAction = (action: string, data: any) => {
    if (socket && connected) {
      socket.emit(action, data)
    }
  }

  const clearAlerts = () => {
    setAlerts([])
  }

  const removeAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  return {
    socket,
    connected,
    alerts,
    metrics,
    connectionError,
    connect,
    disconnect,
    authenticateAsAdmin,
    authenticateAsUser,
    emitAdminAction,
    clearAlerts,
    removeAlert,
  }
}
