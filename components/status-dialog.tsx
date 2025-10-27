"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Badge } from "./ui/badge"
import { authService } from "../lib/auth"
import { useAuth } from "./auth-provider"
import type { SystemStatus } from "../lib/types"

interface StatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StatusResponse {
  messages: SystemStatus[]
}

export function StatusDialog({ open, onOpenChange }: StatusDialogProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    if (open) {
      loadSystemStatus()
    }
  }, [open, token])

  const loadSystemStatus = async () => {
    const user = authService.getCurrentUser()
    if (!user || !token) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/system/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to load system status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>System Status</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : status?.messages && status.messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No status messages</p>
            ) : (
              status?.messages?.map(({ id, type, message, timestamp }: { id: string; type: string; message: string; timestamp: Date }) => (
                <div key={id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge className={getStatusColor(type)}>{type.toUpperCase()}</Badge>
                  <div className="flex-1">
                    <p className="text-sm">{message}</p>
                    <p className="text-xs text-gray-500 mt-1">{timestamp.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
