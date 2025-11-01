"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Activity, Users, MessageSquare, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import type { SystemMetrics } from "@/lib/websocket-server"
import { authService } from "@/lib/auth"

export function LiveMetrics() {
  const { connected, metrics, authenticateAsAdmin } = useWebSocket()
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([])

  // Get current user from auth service
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      setAuthError("Not authenticated")
      return
    }

    if (currentUser.role !== 'admin') {
      setAuthError("Admin privileges required")
      return
    }

    // Authenticate with the user's token
    authenticateAsAdmin(`user_${currentUser.id}`)
  }, [authenticateAsAdmin])

  useEffect(() => {
    if (metrics) {
      setMetricsHistory((prev) => {
        const newHistory = [...prev, metrics]
        // Keep only last 20 data points for the chart
        return newHistory.slice(-20)
      })
    }
  }, [metrics])

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="w-3 h-3 text-green-600" />
    } else if (current < previous) {
      return <TrendingDown className="w-3 h-3 text-red-600" />
    }
    return null
  }

  const previousMetrics = metricsHistory[metricsHistory.length - 2]

  if (authError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Connecting to live metrics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live System Metrics</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">
            Last updated: {metrics ? formatTime(metrics.timestamp) : "Never"}
          </span>
        </div>
      </div>

      {/* Current Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
              {previousMetrics && getTrendIcon(metrics?.activeUsers || 0, previousMetrics.activeUsers)}
            </div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages/Min</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics?.messagesPerMinute || 0}</div>
              {previousMetrics && getTrendIcon(metrics?.messagesPerMinute || 0, previousMetrics.messagesPerMinute)}
            </div>
            <p className="text-xs text-muted-foreground">Last minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls/Min</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics?.apiCallsPerMinute || 0}</div>
              {previousMetrics && getTrendIcon(metrics?.apiCallsPerMinute || 0, previousMetrics.apiCallsPerMinute)}
            </div>
            <p className="text-xs text-muted-foreground">{metrics?.avgResponseTime.toFixed(0)}ms avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics?.errorRate.toFixed(1)}%</div>
              <Badge variant={metrics && metrics.errorRate > 5 ? "destructive" : "secondary"}>
                {metrics && metrics.errorRate > 5 ? "HIGH" : "OK"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Last minute</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metricsHistory}>
                <XAxis dataKey="timestamp" tickFormatter={formatTime} interval="preserveStartEnd" />
                <YAxis />
                <Line type="monotone" dataKey="messagesPerMinute" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metricsHistory}>
                <XAxis dataKey="timestamp" tickFormatter={formatTime} interval="preserveStartEnd" />
                <YAxis />
                <Line type="monotone" dataKey="apiCallsPerMinute" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">System Load</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (metrics?.systemLoad || 0) > 80
                        ? "bg-red-500"
                        : (metrics?.systemLoad || 0) > 60
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(metrics?.systemLoad || 0, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{metrics?.systemLoad.toFixed(0)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Response Time</span>
              <Badge variant={metrics && metrics.avgResponseTime > 1000 ? "destructive" : "secondary"}>
                {metrics?.avgResponseTime.toFixed(0)}ms
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Connection Status</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
