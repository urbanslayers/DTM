"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, FileText, Copy } from "lucide-react"
import { templateService } from "@/lib/template-service"
import type { MessageTemplate } from "@/lib/types"

interface LibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseTemplate?: (template: MessageTemplate) => void
}

export function LibraryDialog({ open, onOpenChange, onUseTemplate }: LibraryDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [activeTab, setActiveTab] = useState("templates")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "personal" as "personal" | "company",
  })

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    const templatesData = await templateService.getTemplates()
    setTemplates(templatesData)
  }

  const handleAddTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      alert("Please enter template name and content")
      return
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const result = await templateService.updateTemplate(editingTemplate.id, {
          name: formData.name,
          content: formData.content,
          category: formData.category,
        })

        if (result) {
          await loadTemplates()
          resetForm()
          setShowAddForm(false)
          setEditingTemplate(null)
        }
      } else {
        // Create new template
        const result = await templateService.addTemplate(formData.name, formData.content, formData.category)

        if (result) {
          await loadTemplates()
          resetForm()
          setShowAddForm(false)
        }
      }
    } catch (error) {
      console.error("Error saving template:", error)
      alert("Failed to save template. Please try again.")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      content: "",
      category: "personal",
    })
    setEditingTemplate(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Template content copied to clipboard!")
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab =
      activeTab === "templates" ||
      (activeTab === "company" && template.category === "company") ||
      (activeTab === "personal" && template.category === "personal")

    return matchesSearch && matchesTab
  })

  const companyTemplates = templates.filter((t) => t.category === "company")
  const personalTemplates = templates.filter((t) => t.category === "personal")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Message Library ({templates.length} templates)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>

          {/* Add/Edit Template Form */}
          {(showAddForm || editingTemplate) && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-4">{editingTemplate ? "Edit Template" : "Create New Template"}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as "personal" | "company" })}
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
                <div>
                  <Label htmlFor="template-content">Message Content *</Label>
                  <Textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter your message template..."
                    className="h-24"
                  />
                  <div className="text-xs text-gray-500 mt-1">Characters: {formData.content.length}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddTemplate}>{editingTemplate ? "Update Template" : "Save Template"}</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Template Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
              <TabsTrigger value="saved">Saved Messages</TabsTrigger>
              <TabsTrigger value="media">Media Files</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4">
              <ScrollArea className="h-[40vh]">
                <div className="space-y-3">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchQuery ? "No templates found matching your search" : "No templates yet"}
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge variant={template.category === "company" ? "default" : "secondary"}>
                              {template.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {onUseTemplate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  onUseTemplate(template)
                                  onOpenChange(false)
                                }}
                              >
                                Use
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(template.content)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template)
                                setFormData({
                                  name: template.name,
                                  content: template.content,
                                  category: template.category,
                                })
                                setShowAddForm(true)
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete template "${template.name}"?`)) {
                                  const success = await templateService.deleteTemplate(template.id)
                                  if (success) {
                                    await loadTemplates()
                                  } else {
                                    alert("Failed to delete template")
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">{template.content}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Created: {template.createdAt.toLocaleDateString()} • Characters: {template.content.length}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Saved Messages</h3>
                <p className="text-sm">Saved messages functionality coming soon!</p>
                <p className="text-xs text-gray-400 mt-2">Messages you save will appear here for quick access.</p>
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-4">
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Media Files</h3>
                <p className="text-sm">Media files functionality coming soon!</p>
                <p className="text-xs text-gray-400 mt-2">Images, videos, and audio files you upload will appear here.</p>
              </div>
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
