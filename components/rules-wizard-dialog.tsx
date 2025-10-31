"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Settings, Trash2, Edit } from "lucide-react"
import type { Rule } from "@/lib/types"
import { rulesService } from "@/lib/rules-service"

interface RulesWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rules?: Rule[]
  editingRuleId?: string
  onRuleUpdate?: () => void
}

export function RulesWizardDialog({ open, onOpenChange, rules: externalRules, editingRuleId, onRuleUpdate }: RulesWizardDialogProps) {
  const [rules, setRules] = useState<Rule[]>(externalRules || [])
  useEffect(() => {
    if (!open) {
      // Reset editing state when dialog closes
      setEditingRule(null)
      setShowAddForm(false)
      resetForm()
    }
  }, [open])

  useEffect(() => {
    if (externalRules !== undefined) {
      setRules(externalRules)
    }
  }, [externalRules])

  useEffect(() => {
    if (editingRuleId && open) {
      const ruleToEdit = rules.find(rule => rule.id === editingRuleId)
      if (ruleToEdit) {
        setEditingRule(ruleToEdit)
        setFormData({
          name: ruleToEdit.name,
          conditionType: ruleToEdit.condition.type,
          conditionValue: ruleToEdit.condition.value,
          actionType: ruleToEdit.action.type,
          actionValue: ruleToEdit.action.value,
          isActive: ruleToEdit.enabled,
        })
        setShowAddForm(true)
      }
    }
  }, [editingRuleId, rules, open])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    conditionType: "contains" as "contains" | "from" | "time" | "keyword",
    conditionValue: "",
    actionType: "reply" as "forward" | "reply" | "delete" | "folder",
    actionValue: "",
    isActive: true,
  })

  const handleAddRule = async () => {
    if (!formData.name.trim() || !formData.conditionValue.trim()) {
      alert("Please enter rule name and condition")
      return
    }

    try {
      if (editingRule) {
        // Update existing rule via API
        const updatedRule = await rulesService.updateRule(editingRule.id, {
          name: formData.name,
          condition: {
            type: formData.conditionType,
            value: formData.conditionValue,
          },
          action: {
            type: formData.actionType,
            value: formData.actionValue,
          },
          enabled: formData.isActive,
        })

        if (updatedRule) {
          // Update local state
          setRules((prev) => prev.map((rule) => (rule.id === editingRule.id ? updatedRule : rule)))
        }
      } else {
        // Create new rule via API
        const newRule = await rulesService.addRule(
          formData.name,
          {
            type: formData.conditionType,
            value: formData.conditionValue,
          },
          {
            type: formData.actionType,
            value: formData.actionValue,
          }
        )

        if (newRule) {
          // Update local state
          setRules((prev) => [...prev, newRule])
        }
      }

      resetForm()
      setShowAddForm(false)
      if (onRuleUpdate) {
        onRuleUpdate()
      }
    } catch (error) {
      console.error("Error saving rule:", error)
      alert("Failed to save rule. Please try again.")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      conditionType: "contains",
      conditionValue: "",
      actionType: "reply",
      actionValue: "",
      isActive: true,
    })
    setEditingRule(null)
  }

  const toggleRule = async (ruleId: string) => {
    console.log('Toggling rule:', ruleId)
    try {
      const success = await rulesService.toggleRule(ruleId)
      if (success) {
        // Update local state to reflect the change
        setRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)))
        if (onRuleUpdate) {
          onRuleUpdate()
        }
      }
    } catch (error) {
      console.error("Error toggling rule:", error)
      alert("Failed to toggle rule. Please try again.")
    }
  }

  const deleteRule = async (ruleId: string) => {
    console.log('Deleting rule:', ruleId)
    try {
      const success = await rulesService.deleteRule(ruleId)
      if (success) {
        // Update local state
        setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
        if (onRuleUpdate) {
          onRuleUpdate()
        }
      }
    } catch (error) {
      console.error("Error deleting rule:", error)
      alert("Failed to delete rule. Please try again.")
    }
  }

  const getConditionText = (rule: Rule) => {
    return `${rule.condition.type} "${rule.condition.value}"`
  }

  const getActionText = (rule: Rule) => {
    if (rule.action.type === "forward") return `Forward to ${rule.action.value}`
    if (rule.action.type === "reply") return `Auto-reply: "${rule.action.value.substring(0, 50)}..."`
    if (rule.action.type === "delete") return "Delete message"
    if (rule.action.type === "folder") return `Move to folder: ${rule.action.value}`
    return "No action"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Rules Wizard - Inbox Automation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Create rules to automatically handle incoming messages based on conditions you set.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </div>

          {/* Add/Edit Rule Form */}
          {(showAddForm || editingRule) && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-4">{editingRule ? "Edit Rule" : "Create New Rule"}</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter rule name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition-type">Condition Type</Label>
                    <Select
                      value={formData.conditionType}
                      onValueChange={(value) => setFormData({ ...formData, conditionType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="from">From contains</SelectItem>
                        <SelectItem value="contains">Message contains</SelectItem>
                        <SelectItem value="keyword">Keyword matches</SelectItem>
                        <SelectItem value="time">Time-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condition-value">Condition Value *</Label>
                    <Input
                      id="condition-value"
                      value={formData.conditionValue}
                      onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                      placeholder="Enter condition value"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action-type">Action Type</Label>
                    <Select
                      value={formData.actionType}
                      onValueChange={(value) => setFormData({ ...formData, actionType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reply">Auto Reply</SelectItem>
                        <SelectItem value="forward">Forward to Email</SelectItem>
                        <SelectItem value="delete">Delete Message</SelectItem>
                        <SelectItem value="folder">Move to Folder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.actionType !== "delete" && (
                    <div>
                      <Label htmlFor="action-value">
                        {formData.actionType === "forward" ? "Email Address" : formData.actionType === "folder" ? "Folder Name" : "Reply Message"} *
                      </Label>
                      {formData.actionType === "reply" ? (
                        <Textarea
                          id="action-value"
                          value={formData.actionValue}
                          onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                          placeholder="Enter reply message"
                          className="h-20"
                        />
                      ) : (
                        <Input
                          id="action-value"
                          value={formData.actionValue}
                          onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                          placeholder={formData.actionType === "forward" ? "Enter email address" : "Enter folder name"}
                          type={formData.actionType === "forward" ? "email" : "text"}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Rule is active</Label>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddRule}>{editingRule ? "Update Rule" : "Create Rule"}</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                    setEditingRule(null)
                    onOpenChange(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-4">
            <h3 className="font-medium">
              Active Rules ({rules.filter((r) => r.enabled).length} of {rules.length})
            </h3>

            <ScrollArea className="h-[40vh]">
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No rules created yet. Click "New Rule" to get started.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch checked={rule.enabled} onCheckedChange={(checked) => toggleRule(rule.id)} />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Edit button clicked for rule:', rule.id)

                              setEditingRule(rule)
                              setFormData({
                                name: rule.name,
                                conditionType: rule.condition.type,
                                conditionValue: rule.condition.value,
                                actionType: rule.action.type,
                                actionValue: rule.action.value,
                                isActive: rule.enabled,
                              })
                              setShowAddForm(true)
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">When:</span> {getConditionText(rule)}
                        </div>
                        <div>
                          <span className="font-medium">Then:</span> {getActionText(rule)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => {
            setEditingRule(null)
            setShowAddForm(false)
            resetForm()
            onOpenChange(false)
          }}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
