"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, X, AlertTriangle, CheckCircle, Info, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import type { AdminAlert } from "@/lib/websocket-server"

export function RealTimeAlerts() {
  const { connected, alerts, connectionError, authenticateAsAdmin, removeAlert, clearAlerts } = useWebSocket()

  const [unreadCount, setUnreadCount] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    // Authenticate as admin when component mounts
    authenticateAsAdmin("admin_token")
  }, [authenticateAsAdmin])

  useEffect(() => {
    // Update unread count when new alerts arrive
    setUnreadCount(alerts.length)
  }, [alerts])

  const getAlertIcon = (type: AdminAlert["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getAlertBadgeColor = (type: AdminAlert["type"]) => {
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

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  return (
    <div className="relative">
      {/* Connection Status - Only show if disconnected and there's an error */}
      {connectionError && !connected && (
        <div className="absolute -top-8 right-0 z-50">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            <WifiOff className="w-3 h-3" />
            Connection Error
          </div>
        </div>
      )}

      {/* Alert Bell Button */}
      <Button variant="outline" size="sm" onClick={() => setShowAlerts(!showAlerts)} className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Alerts Panel */}
      {showAlerts && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 shadow-lg z-40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Live Alerts
              </CardTitle>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAlerts} className="text-xs">
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {connectionError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Connection Error: {connectionError}</div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No alerts yet</div>
              ) : (
                <div className="space-y-2 p-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${getAlertBadgeColor(alert.type)}`}>
                            {alert.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                        </div>
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        {alert.metadata && (
                          <div className="text-xs text-gray-500 mt-2">
                            {Object.entries(alert.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeAlert(alert.id)} className="flex-shrink-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
