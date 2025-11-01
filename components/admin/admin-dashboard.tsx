"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, MessageSquare, TrendingUp, AlertTriangle, Activity, BarChart3, Settings, Moon, Sun, Bell } from "lucide-react"
import { UserManagement } from "./user-management"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { UsageMonitoring } from "./usage-monitoring"
// import { RealTimeAlerts } from "./real-time-alerts" // WebSocket server not implemented
import { LiveMetrics } from "./live-metrics"
import type { Analytics } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import { authService } from "@/lib/auth"
import { reportsService } from "@/lib/reports-service"

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser())
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
    // Set up a refresh interval every minute
    const interval = setInterval(loadAnalytics, 60000)
    return () => clearInterval(interval)
  }, [selectedPeriod]) // Reload when period changes

  const loadAnalytics = async () => {
    if (!currentUser) {
      setLoading(false)
      setAnalyticsError("Not authenticated")
      return
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      console.error("Access denied: Admin privileges required")
      setLoading(false)
      setAnalyticsError("Admin privileges required")
      return
    }

    try {
      setLoading(true)
      setAnalyticsError(null)
      
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`, {
        headers: {
          Authorization: `Bearer user_${currentUser.id}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        setAnalyticsError(null)
      } else if (response.status === 401) {
        console.error("Authentication failed for admin dashboard")
        setAnalyticsError("Authentication failed")
        // Redirect to home or show login
        router.push("/")
      } else {
        const error = await response.text()
        console.error("Failed to load analytics:", error)
        setAnalyticsError(`Failed to load analytics: ${error}`)
      }
    } catch (error) {
      console.error("Failed to load analytics:", error)
      setAnalyticsError(`Failed to load analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const data = await reportsService.getAllReports()
      // reportsService returns an array or an object with .reports
      setReports(Array.isArray(data) ? data : data.reports || [])
    } catch (e) {
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  const createReport = async (opts?: { startDate?: string; endDate?: string }) => {
    setReportsLoading(true)
    try {
      // Default to last 90 days (inclusive)
      const end = opts?.endDate ? new Date(opts.endDate) : new Date()
      const start = opts?.startDate ? new Date(opts.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

      const params = {
        startDate: start.toISOString().substring(0, 10),
        endDate: end.toISOString().substring(0, 10),
      }

      const created = await reportsService.createReport(params)
      // If the API queues the report, refresh the list to show it
      await fetchReports()

      // Optionally show a basic alert with the queued report id
      const id = created?.reportId || created?.id
      if (id) {
        alert(`Report queued (id: ${id})`)
      } else {
        alert('Report request submitted')
      }
    } catch (err) {
      console.error('Failed to create report', err)
      alert('Failed to create report')
    } finally {
      setReportsLoading(false)
      setShowCreateDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    )
  }

  // Check if user is admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need administrator privileges to access this page.</p>
          <Button onClick={() => router.push("/")} className="bg-purple-600 hover:bg-purple-700">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-900 px-6 py-4 border-b border-purple-300 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-purple-100">Desktop Messaging Administration</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications placeholder - WebSocket not implemented yet */}
            <Button variant="outline" size="sm" className="text-white hover:bg-white/20" disabled>
              <Bell className="w-4 h-4" />
            </Button>
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-white hover:bg-white/20"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 mr-1" /> : <Moon className="w-4 h-4 mr-1" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="secondary"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => router.push("/")}
            >
              Home
            </Button>
            <Button
              variant="secondary"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => {
                // For now, redirect to user settings since admin-specific settings aren't implemented yet
                // In a real app, this would open an admin settings dialog
                alert("Redirecting to user settings...");
                // This would be better as a proper redirect or settings dialog
              }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 dark:bg-gray-900">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-purple-100 dark:bg-purple-900">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <Activity className="w-4 h-4" />
              Live Metrics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <Activity className="w-4 h-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.overview.totalMessages.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics?.overview.smsCount} SMS, {analytics?.overview.mmsCount} MMS
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.overview.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">+{analytics?.overview.newUsers} new this week</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Delivery Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.overview.deliveryRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics?.overview.deliveredCount} delivered, {analytics?.overview.failedCount} failed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">API Calls</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.overview.totalAPICalls.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{analytics?.overview.avgResponseTime}ms avg response</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Top Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topEndpoints.map((endpoint, index) => (
                      <div key={endpoint.endpoint} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">{index + 1}</Badge>
                          <code className="text-sm text-gray-900 dark:text-gray-100">{endpoint.endpoint}</code>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{endpoint.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Top Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topUsers.map((user: { userId: string; username: string; messageCount: number }, index: number) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">{index + 1}</Badge>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{user.username}</span>
                        </div>
                        <span className="text-sm text-purple-700 dark:text-purple-200">{user.messageCount} messages</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <AlertTriangle className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">API Status</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Error Rate</span>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">{analytics?.overview.errorRate}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Time</span>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{analytics?.overview.avgResponseTime}ms</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live">
            <LiveMetrics />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard 
              analytics={analytics}
              period={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              loading={loading}
              error={analyticsError}
            />
          </TabsContent>

          <TabsContent value="monitoring">
            <UsageMonitoring />
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button onClick={fetchReports} disabled={reportsLoading}>
                    {reportsLoading ? "Loading..." : "Fetch All Reports"}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowCreateDialog(true)}>
                    Create Report
                  </Button>
                </div>
                {reports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        <TableHead className="text-gray-900 dark:text-gray-100">ID</TableHead>
                        <TableHead className="text-gray-900 dark:text-gray-100">Status</TableHead>
                        <TableHead className="text-gray-900 dark:text-gray-100">Created</TableHead>
                        <TableHead className="text-gray-900 dark:text-gray-100">Type</TableHead>
                        <TableHead className="text-gray-900 dark:text-gray-100">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report: any) => (
                        <TableRow key={report.id || report.reportId} className="border-gray-200 dark:border-gray-700">
                          <TableCell className="text-gray-900 dark:text-gray-100">{report.id || report.reportId}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{report.status || "-"}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{report.createdAt ? new Date(report.createdAt).toLocaleString() : "-"}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{report.type || "-"}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            {/* Download link - proxies to new server route which returns JSON or a file download */}
                            {report.id || report.reportId ? (
                              <a
                                href={`/api/messaging/reports/${report.id || report.reportId}`}
                                className="text-blue-600 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground">No reports loaded yet.</div>
                )}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Report</DialogTitle>
                    </DialogHeader>
                    {/* TODO: Add form fields for report creation */}
                    <div className="text-muted-foreground">Report creation form coming soon.</div>
                    <DialogFooter>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => createReport()} type="button">Create Report (last 90 days)</Button>
                        <Button onClick={() => setShowCreateDialog(false)} type="button">Close</Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
