"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Settings, Shield, Bell, Database, Globe } from "lucide-react"

export function SystemSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-gray-600">Configure system-wide settings and preferences</p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
              <Input id="rate-limit" type="number" defaultValue="1000" />
            </div>
            <div>
              <Label htmlFor="timeout">Request Timeout (seconds)</Label>
              <Input id="timeout" type="number" defaultValue="30" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable API Throttling</Label>
              <p className="text-sm text-gray-600">Automatically throttle requests during high load</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require 2FA for Admin Users</Label>
              <p className="text-sm text-gray-600">Force two-factor authentication for admin accounts</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable IP Whitelisting</Label>
              <p className="text-sm text-gray-600">Restrict API access to specific IP addresses</p>
            </div>
            <Switch />
          </div>
          <div>
            <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
            <Input id="session-timeout" type="number" defaultValue="24" className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Alerts for System Errors</Label>
              <p className="text-sm text-gray-600">Send email notifications for critical system errors</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Daily Usage Reports</Label>
              <p className="text-sm text-gray-600">Send daily usage summary reports to administrators</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div>
            <Label htmlFor="alert-email">Alert Email Address</Label>
            <Input id="alert-email" type="email" defaultValue="admin@telstra.com" />
          </div>
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Backup</Label>
              <p className="text-sm text-gray-600">Automatically backup database daily</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retention">Data Retention (days)</Label>
              <Input id="retention" type="number" defaultValue="365" />
            </div>
            <div>
              <Label htmlFor="cleanup">Auto Cleanup Interval (days)</Label>
              <Input id="cleanup" type="number" defaultValue="30" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
