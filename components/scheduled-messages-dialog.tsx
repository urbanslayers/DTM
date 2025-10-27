"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Clock, Edit, Trash2, Send, Calendar } from "lucide-react"
import { messagingService } from "@/lib/messaging-service"
import type { Message } from "@/lib/types"

interface ScheduledMessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMessage?: Message
}

export function ScheduledMessagesDialog({ open, onOpenChange, selectedMessage: externalSelectedMessage }: ScheduledMessagesDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  useEffect(() => {
    if (open) {
      loadMessages()
    }
  }, [open])

  useEffect(() => {
    if (externalSelectedMessage) {
      setSelectedMessage(externalSelectedMessage)
    }
  }, [externalSelectedMessage])

  const loadMessages = async () => {
    const messagesData = await messagingService.getScheduledMessages()
    setMessages(messagesData)
  }

  const filteredMessages = messages.filter((message) => {
    return (
      searchQuery === "" ||
      message.to.some((recipient) => recipient.includes(searchQuery)) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const getTimeUntilSend = (scheduledAt: Date) => {
    const now = new Date()
    const diff = scheduledAt.getTime() - now.getTime()

    if (diff <= 0) return "Overdue"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Scheduled Messages ({messages.length} pending)
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Message List */}
          <div className="w-2/3 space-y-4 bg-card">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search scheduled messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Message List */}
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {searchQuery ? "No scheduled messages found matching your search" : "No scheduled messages"}
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedMessage?.id === message.id ? "bg-blue-50 border-blue-200" : ""
                      }`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800">SCHEDULED</Badge>
                          <Badge variant={message.type === "mms" ? "default" : "secondary"}>
                            {message.type.toUpperCase()}
                          </Badge>
                          {message.templateName && <Badge variant="outline">Template: {message.templateName}</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {message.scheduledAt && getTimeUntilSend(message.scheduledAt)}
                        </div>
                      </div>
                      <div className="text-sm mb-1">
                        <span className="font-medium">To:</span> {message.to.join(", ")}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{message.content}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          Recipients: {message.to.length} • Credits: {message.credits}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {message.scheduledAt?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message Detail */}
          <div className="w-1/3 border-l border-border pl-4 bg-card">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-2">Scheduled Message Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2 bg-orange-100 text-orange-800">SCHEDULED</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {selectedMessage.type.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">From:</span> {selectedMessage.from}
                    </div>
                    <div>
                      <span className="font-medium">Recipients:</span> {selectedMessage.to.length}
                    </div>
                    <div>
                      <span className="font-medium">Credits:</span> {selectedMessage.credits}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {selectedMessage.createdAt.toLocaleString()}
                    </div>
                    {selectedMessage.scheduledAt && (
                      <>
                        <div>
                          <span className="font-medium">Scheduled For:</span>{" "}
                          {selectedMessage.scheduledAt.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Time Until Send:</span>{" "}
                          {getTimeUntilSend(selectedMessage.scheduledAt)}
                        </div>
                      </>
                    )}
                    {selectedMessage.templateName && (
                      <div>
                        <span className="font-medium">Template:</span> {selectedMessage.templateName}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recipients</h4>
                  <ScrollArea className="h-24">
                    <div className="space-y-1">
                      {selectedMessage.to.map((recipient, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          {recipient}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Message Content</h4>
                  <ScrollArea className="h-32">
                    <div className="text-sm p-3 bg-gray-50 rounded whitespace-pre-wrap">{selectedMessage.content}</div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Send className="w-3 h-3 mr-1" />
                    Send Now
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit Schedule
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Cancel Message
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a message to view details
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
