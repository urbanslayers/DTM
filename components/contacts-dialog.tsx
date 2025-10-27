"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Search, Edit, Trash2, Users, User } from "lucide-react"
import { contactService } from "@/lib/contact-service"
import type { Contact } from "@/lib/types"

interface ContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingContact?: Contact
}

export function ContactsDialog({ open, onOpenChange, editingContact: externalEditingContact }: ContactsDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    category: "personal" as "company" | "personal",
  })

  useEffect(() => {
    if (open) {
      if (externalEditingContact) {
        // If editing an external contact, set it up for editing
        setEditingContact(externalEditingContact)
        setFormData({
          name: externalEditingContact.name,
          phoneNumber: externalEditingContact.phoneNumber,
          email: externalEditingContact.email || "",
          category: externalEditingContact.category,
        })
        setShowAddForm(true)
      } else {
        loadContacts()
      }
    }
  }, [open, externalEditingContact])

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setEditingContact(null)
      setShowAddForm(false)
      resetForm()
    }
  }, [open])

  const loadContacts = async () => {
    const contactsData = await contactService.getContacts()
    setContacts(contactsData)
  }

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phoneNumber.trim()) {
      alert("Please enter name and phone number")
      return
    }

    const result = await contactService.addContact(
      formData.name,
      formData.phoneNumber,
      formData.category,
      formData.email || undefined,
    )

    if (result) {
      await loadContacts()
      resetForm()
      setShowAddForm(false)
    }
  }

  const handleEditContact = async () => {
    if (!editingContact || !formData.name.trim() || !formData.phoneNumber.trim()) {
      alert("Please enter name and phone number")
      return
    }

    const result = await contactService.updateContact(
      editingContact.id,
      {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email || undefined,
        category: formData.category,
      }
    )

    if (result) {
      await loadContacts()
      resetForm()
      setShowAddForm(false)
      setEditingContact(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      email: "",
      category: "personal",
    })
    setEditingContact(null)
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to delete contact "${contactName}"?`)) {
      return
    }

    const success = await contactService.deleteContact(contactId)
    if (success) {
      await loadContacts()
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      searchQuery === "" ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "company" && contact.category === "company") ||
      (activeTab === "personal" && contact.category === "personal")

    return matchesSearch && matchesTab
  })

  // Compute contact counts by category
  const companyContacts = contacts.filter(contact => contact.category === "company")
  const personalContacts = contacts.filter(contact => contact.category === "personal")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contact Management ({contacts.length} contacts)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>

          {/* Add/Edit Contact Form */}
          {(showAddForm || editingContact) && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-4">{editingContact ? "Edit Contact" : "Add New Contact"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name">Name *</Label>
                  <Input
                    id="contact-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone Number *</Label>
                  <Input
                    id="contact-phone"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="04xxxxxxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as "company" | "personal" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={editingContact ? handleEditContact : handleAddContact}>
                  {editingContact ? "Update Contact" : "Add Contact"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                    setEditingContact(null)
                    onOpenChange(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Contact Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({contacts.length})</TabsTrigger>
              <TabsTrigger value="company">Company ({companyContacts.length})</TabsTrigger>
              <TabsTrigger value="personal">Personal ({personalContacts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[40vh]">
                <div className="space-y-2">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchQuery ? "No contacts found matching your search" : "No contacts yet"}
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          {contact.category === "company" ? (
                            <Users className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.phoneNumber}</div>
                            {contact.email && <div className="text-sm text-gray-500">{contact.email}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={contact.category === "company" ? "default" : "secondary"}>
                            {contact.category}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingContact(contact)
                              setFormData({
                                name: contact.name,
                                phoneNumber: contact.phoneNumber,
                                email: contact.email || "",
                                category: contact.category,
                              })
                              setShowAddForm(true)
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id, contact.name)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
