"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Phone, 
  Mail, 
  Settings, 
  Save, 
  X, 
  Shield, 
  Bell,
  Smartphone,
  Globe
} from "lucide-react"
import { authService } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"

interface UserSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdate?: (user: UserType) => void
}

export function UserSettingsDialog({ open, onOpenChange, onUserUpdate }: UserSettingsDialogProps) {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  // Form state
  const [formData, setFormData] = useState({
    personalMobile: "",
    email: "",
    displayName: "",
    timezone: "Australia/Sydney",
    language: "en",
  })

  useEffect(() => {
    if (open) {
      loadUserData()
    }
  }, [open])

  const loadUserData = () => {
    const user = authService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
      setFormData({
        personalMobile: user.personalMobile || "",
        email: user.email || "",
        displayName: user.displayName || user.username,
        timezone: user.timezone || "Australia/Sydney",
        language: user.language || "en",
      })
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Validate personal mobile number (Australian format)
      if (formData.personalMobile && !/^(\+61|0)[4-5]\d{8}$/.test(formData.personalMobile.replace(/\s+/g, ""))) {
        alert("Please enter a valid Australian mobile number")
        return
      }

      // Update user data using authService
      if (currentUser) {
        const success = await authService.updateUser({
          personalMobile: formData.personalMobile,
          email: formData.email,
          displayName: formData.displayName,
          timezone: formData.timezone,
          language: formData.language,
        })
        
        if (success) {
          // Update local state to reflect changes
          const updated = authService.getCurrentUser()
          setCurrentUser(updated)
          if (onUserUpdate && updated) onUserUpdate(updated)
          alert("Settings saved successfully!")
        } else {
          alert("Failed to save settings")
        }
      }
    } catch (error) {
      alert("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    loadUserData()
  }

  if (!currentUser) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            User Settings
          </DialogTitle>
          <DialogDescription>
            Manage your profile, messaging preferences, and notification settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Messaging
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={currentUser.username}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>
                    {currentUser.role.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    Credits: {currentUser.credits}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Messaging Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="personalMobile">Personal Mobile Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <Input
                      id="personalMobile"
                      value={formData.personalMobile}
                      onChange={(e) => setFormData({ ...formData, personalMobile: e.target.value })}
                      placeholder="+61412345678 or 0412345678"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This number will appear as "PersonalMobile" in the From dropdown
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Scheduled messages are sent in GMT/UTC time as required by Telstra API
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                      <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                      <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                      <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                      <SelectItem value="Australia/Adelaide">Australia/Adelaide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 