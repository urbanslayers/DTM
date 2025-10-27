"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, Search, Edit, Trash2, CheckCircle, XCircle, Calendar, CreditCard } from "lucide-react"
import type { User } from "@/lib/types"

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all") // Updated default value to "all"
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    credits: 100,
  })

  useEffect(() => {
    loadUsers()
  }, [currentPage, searchTerm, roleFilter])

  // Remove debugging useEffect - it was causing noise

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        role: roleFilter,
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: "Bearer admin_token",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin_token",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({ username: "", email: "", password: "", role: "user", credits: 100 })
        loadUsers()
        alert(`User "${formData.username}" created successfully`)
      } else {
        const errorData = await response.json()
        alert(`Failed to create user: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to create user:", error)
      alert("Failed to create user. Please try again.")
    }
  }

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin_token",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Force reload users from database
        await loadUsers()
        // Clear editing state
        setEditingUser(null)
        alert(`User "${updates.username || 'Unknown'}" updated successfully`)
      } else {
        const errorData = await response.json()
        alert(`Failed to update user: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to update user:", error)
      alert("Failed to update user. Please try again.")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer admin_token",
          },
        })

        if (response.ok) {
          loadUsers()
          alert("User deleted successfully")
        } else {
          const errorData = await response.json()
          alert(`Failed to delete user: ${errorData.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error("Failed to delete user:", error)
        alert("Failed to delete user. Please try again.")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="credits">Initial Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: Number.parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreateUser} className="w-full">
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem> {/* Updated value to "all" */}
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                // Safely get date for key prop
                const lastLoginTime = user.lastLogin instanceof Date
                  ? user.lastLogin.getTime()
                  : (typeof user.lastLogin === 'string' ? new Date(user.lastLogin).getTime() : null)

                return (
                  <TableRow key={`${user.id}-${lastLoginTime || 'no-date'}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        {user.credits}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {user.lastLogin
                          ? (() => {
                              try {
                                const date = user.lastLogin instanceof Date
                                  ? user.lastLogin
                                  : new Date(user.lastLogin)
                                return date.toLocaleDateString()
                              } catch (error) {
                                console.error('Error formatting lastLogin date:', error, user.lastLogin)
                                return 'Invalid Date'
                              }
                            })()
                          : "Never"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {(() => {
                        try {
                          const date = user.createdAt instanceof Date
                            ? user.createdAt
                            : new Date(user.createdAt)
                          return date.toLocaleDateString()
                        } catch (error) {
                          console.error('Error formatting createdAt date:', error, user.createdAt)
                          return 'Invalid Date'
                        }
                      })()}
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user)
                        }}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={editingUser.username || ''}
                  onChange={(e) => {
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editingUser.email || ''}
                  onChange={(e) => {
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role || 'user'}
                  onValueChange={(value) => {
                    setEditingUser({ ...editingUser, role: value as "admin" | "user" })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credits</Label>
                <Input
                  type="number"
                  value={editingUser.credits || 0}
                  onChange={(e) => {
                    setEditingUser({ ...editingUser, credits: Number.parseInt(e.target.value) || 0 })
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingUser.isActive || false}
                  onChange={(e) => {
                    setEditingUser({ ...editingUser, isActive: e.target.checked })
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>
              <div className="text-sm text-gray-500">
                <div>Created: {(() => {
                  try {
                    const date = editingUser.createdAt instanceof Date
                      ? editingUser.createdAt
                      : new Date(editingUser.createdAt)
                    return date.toLocaleDateString()
                  } catch (error) {
                    return 'Invalid Date'
                  }
                })()}</div>
                <div>Last Login: {editingUser.lastLogin ? (() => {
                  try {
                    const date = editingUser.lastLogin instanceof Date
                      ? editingUser.lastLogin
                      : new Date(editingUser.lastLogin)
                    return date.toLocaleDateString()
                  } catch (error) {
                    return 'Invalid Date'
                  }
                })() : 'Never'}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={(e) => {
                  e.preventDefault()

                  if (!editingUser || !editingUser.id) {
                    alert('Error: No user selected for editing')
                    return
                  }

                  // Extract only the fields that should be updated
                  const updates = {
                    username: editingUser.username,
                    email: editingUser.email,
                    role: editingUser.role,
                    credits: editingUser.credits,
                    isActive: editingUser.isActive,
                  }

                  handleUpdateUser(editingUser.id, updates)
                }} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
