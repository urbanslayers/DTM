"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Filter, Activity, Clock, AlertCircle } from "lucide-react"
import { authService } from "@/lib/auth"

export function UsageMonitoring() {
  const [usageData, setUsageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState("")
  const [dateRange, setDateRange] = useState("7d")

  useEffect(() => {
    loadUsageData()
  }, [selectedUser, dateRange])

  const loadUsageData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedUser) params.append("userId", selectedUser)
      if (dateRange !== "all") {
        const days = Number.parseInt(dateRange.replace("d", ""))
        const startDate = new Date(Date.now() - days * 86400000).toISOString()
        params.append("startDate", startDate)
      }

      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        throw new Error("Not authenticated")
      }

      if (currentUser.role !== 'admin') {
        throw new Error("Admin privileges required")
      }

      const response = await fetch(`/api/admin/usage?${params}`, {
        headers: {
          Authorization: `Bearer user_${currentUser.id}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      } else {
        throw new Error(`API returned ${response.status}`)
      }
    } catch (error) {
      console.error("Failed to load usage data:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      // Set default data structure on error
      setUsageData({
        messages: { total: 0, sms: 0, mms: 0, delivered: 0, failed: 0 },
        apiCalls: { total: 0, successful: 0, errors: 0, avgResponseTime: 0 },
        credits: { used: 0, remaining: null },
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Ensure we have a valid data structure
  const safeUsageData = usageData || {
    messages: { total: 0, sms: 0, mms: 0, delivered: 0, failed: 0 },
    apiCalls: { total: 0, successful: 0, errors: 0, avgResponseTime: 0 },
    credits: { used: 0, remaining: null },
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading usage data</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Monitoring</h2>
          <p className="text-gray-600">Monitor API usage and system performance</p>
        </div>
        <div className="flex gap-2">
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by user..."
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeUsageData.messages?.total?.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground">
              {safeUsageData.messages?.sms || 0} SMS, {safeUsageData.messages?.mms || 0} MMS
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeUsageData.apiCalls?.total?.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground">
              {safeUsageData.apiCalls?.avgResponseTime?.toFixed(0) || 0}ms avg response
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeUsageData.credits?.used || 0}</div>
            {safeUsageData.credits?.remaining !== null && safeUsageData.credits?.remaining !== undefined && (
              <div className="text-xs text-muted-foreground">{safeUsageData.credits.remaining} remaining</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Delivery Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${safeUsageData.messages?.total > 0 ? (safeUsageData.messages.delivered / safeUsageData.messages.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {safeUsageData.messages?.total > 0 ? ((safeUsageData.messages.delivered / safeUsageData.messages.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed Messages</span>
                <Badge>{safeUsageData.messages?.failed || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${safeUsageData.apiCalls?.total > 0 ? (safeUsageData.apiCalls.successful / safeUsageData.apiCalls.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {safeUsageData.apiCalls?.total > 0 ? ((safeUsageData.apiCalls.successful / safeUsageData.apiCalls.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Count</span>
                <Badge>{safeUsageData.apiCalls?.errors || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
