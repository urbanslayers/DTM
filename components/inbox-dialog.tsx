"use client"

import { useState, useEffect } from "react"
import { inboxService } from "@/lib/inbox-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Mail, MailOpen, Trash2, Reply, Forward } from "lucide-react"
import { useAuth } from "./auth-provider"
import { useUser } from "./user-provider"

interface InboxMessage {
  id: string
  from: string
  to: string
  subject?: string
  body: string
  receivedAt: Date
  read: boolean
  type: "sms" | "mms"
}

interface InboxDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InboxDialog({ open, onOpenChange }: InboxDialogProps) {
  const { token } = useAuth();
  const { user } = useUser();
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)

  useEffect(() => {
    if (open) {
      setMessages([])
      setCurrentOffset(0)
      setHasMoreMessages(true)
      loadMessages(0)
    }
  }, [open])

  const loadMessages = async (offset: number, append: boolean = false) => {
    try {
      const params = new URLSearchParams({
        userId: user?.id || 'cmh3go54b0022ultkalaiq535', // Use demo user if no user context
        direction: 'incoming',
        limit: '50', // Database doesn't have the same 5 message limit
        offset: offset.toString(),
        reverse: 'true'
      });

      const res = await fetch(`/api/messaging/inbox?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      // Database messages have different structure than Telstra messages
      const dbMessages = (data.messages || []).map((msg: any) => {
        // Normalize the `to` field: it may be stored as an array or a string
        let toField: string = ''
        if (Array.isArray(msg.to)) {
          toField = msg.to.join(', ')
        } else if (typeof msg.to === 'string') {
          toField = msg.to
        } else if (msg.to && typeof msg.to === 'object') {
          try {
            toField = JSON.stringify(msg.to)
          } catch (e) {
            toField = String(msg.to)
          }
        }

        return {
          id: msg.id,
          from: msg.from,
          to: toField,
          subject: msg.subject || undefined,
          body: msg.content, // Database uses 'content' instead of 'body'
          receivedAt: new Date(msg.receivedAt),
          read: msg.read,
          type: msg.type === 'mms' ? "mms" : "sms", // normalize to lowercase
        }
      })

      // Sort messages by receivedAt in descending order (newest first)
      dbMessages.sort((a: InboxMessage, b: InboxMessage) => {
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      });

      if (append) {
        setMessages(prev => [...prev, ...dbMessages]);
      } else {
        setMessages(dbMessages);
      }

      // Database messages don't have the same pagination limits
      const hasMore = dbMessages.length === 50; // If we got exactly 50, there might be more
      if (!append) {
        setHasMoreMessages(hasMore);
      } else {
        setHasMoreMessages(hasMore);
      }
    } catch (err) {
      if (!append) {
        setMessages([]);
      }
      setHasMoreMessages(false);
    }
  }

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    const nextOffset = currentOffset + 50;
    await loadMessages(nextOffset, true);
    setCurrentOffset(nextOffset);
    setIsLoadingMore(false);
  }

  const markAsRead = async (messageId: string) => {
    // Optimistic UI update
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, read: true } : msg)))
    try {
      const ok = await inboxService.markAsRead(messageId)
      if (!ok) {
        // Revert if API failed
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, read: false } : msg)))
      }
    } catch (err) {
      console.warn('Failed to persist markAsRead', err)
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, read: false } : msg)))
    }
  }

  const markAllAsRead = async () => {
    if (messages.length === 0) return
    // Optimistic UI change
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
    try {
      const ok = await inboxService.markAllAsRead()
      if (!ok) {
        // If it failed, don't change UI
        setMessages((prev) => prev.map((m) => ({ ...m, read: false })))
      }
    } catch (err) {
      console.warn('Failed to persist markAllAsRead', err)
      setMessages((prev) => prev.map((m) => ({ ...m, read: false })))
    }
  }

  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null)
    }
  }

  const filteredMessages = messages.filter((msg) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      (msg.from && msg.from.toLowerCase().includes(q)) ||
      (msg.to && msg.to.toLowerCase().includes(q)) ||
      (msg.subject && msg.subject.toLowerCase().includes(q)) ||
      (msg.body && msg.body.toLowerCase().includes(q));

    const matchesTab =
      activeTab === "all" || (activeTab === "unread" && !msg.read) || (activeTab === "read" && msg.read);

    return matchesSearch && matchesTab;
  });

  const unreadCount = messages.filter((msg) => !msg.read).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Inbox ({messages.length} messages, {unreadCount} unread)
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Message List */}
          <div className="w-1/2 border-r border-border pr-4 bg-card">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={messages.length === 0}>
                  Mark all as read
                </Button>
              </div>

              <ScrollArea className="h-[45vh]">
                <div className="space-y-2">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No messages found</div>
                  ) : (
                    filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          selectedMessage?.id === message.id ? "bg-blue-50 border-blue-200" : ""
                        } ${!message.read ? "bg-blue-25 border-l-4 border-l-blue-500" : ""}`}
                        onClick={() => {
                          setSelectedMessage(message)
                          if (!message.read) {
                            markAsRead(message.id)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {message.read ? (
                              <MailOpen className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Mail className="w-4 h-4 text-blue-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{message.from}</span>
                              <span className="text-xs text-gray-500">To: {message.to || 'Unknown'}</span>
                            </div>
                            <Badge variant={message.type === "mms" ? "default" : "secondary"} className="ml-2">{message.type.toUpperCase()}</Badge>
                          </div>
                          <span className="text-xs text-gray-500">{message.receivedAt.toLocaleTimeString()}</span>
                        </div>
                        {message.subject && <div className="text-sm font-medium mb-1">{message.subject}</div>}
                        <div className="text-sm text-gray-600 truncate">{message.body}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Load More Button */}
                {hasMoreMessages && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={loadMoreMessages}
                      disabled={isLoadingMore}
                      variant="outline"
                      className="w-full"
                    >
                      {isLoadingMore ? "Loading..." : "Load More Messages"}
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Message Detail */}
          <div className="w-1/2 bg-card">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{selectedMessage.subject || `${selectedMessage.type} Message`}</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                      <Button variant="outline" size="sm">
                        <Forward className="w-3 h-3 mr-1" />
                        Forward
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMessage(selectedMessage.id)}>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>From: {selectedMessage.from}</div>
                    <div>To: {selectedMessage.to}</div>
                    <div>Received: {selectedMessage.receivedAt.toLocaleString()}</div>
                  </div>
                </div>

                <ScrollArea className="h-[35vh]">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
                  </div>
                </ScrollArea>
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
