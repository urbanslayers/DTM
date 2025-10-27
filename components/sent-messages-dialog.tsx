"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Send, RefreshCw, Eye, Download } from "lucide-react"
import { useAuth } from "./auth-provider"
import { authService } from "@/lib/auth"

interface SentMessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SentMessagesDialog({ open, onOpenChange }: SentMessagesDialogProps) {
  const { token } = useAuth();
  const [sentApiMessages, setSentApiMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      fetchSentMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchSentMessages = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await getAllocatedPhoneNumbers(user.id);

      const params = new URLSearchParams({
        userId: user.id,
        status: 'sent,delivered,failed,queued,pending,scheduled',
        phoneNumbers: allocatedNumbers.join(','),
      });

      const res = await fetch(`/api/messaging/messages?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      // Database messages have different structure - map them to expected format
      const dbMessages = (data.messages || []).map((msg: any) => ({
        messageId: msg.id,
        to: msg.to,
        from: msg.from,
        messageContent: msg.content,
        status: msg.status || 'sent',
        createTimestamp: msg.createdAt,
        sentTimestamp: msg.sentAt,
        receivedTimestamp: msg.deliveredAt,
      }));

      setSentApiMessages(dbMessages);
    } catch (err) {
      setSentApiMessages([]);
    }
  };

  const getAllocatedPhoneNumbers = async (userId: string): Promise<string[]> => {
    try {
      // Get user details to get personal mobile
      const userResponse = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer user_${userId}`,
        },
      });

      if (!userResponse.ok) return [];

      const userData = await userResponse.json();
      const allocatedNumbers: string[] = [];

      // Add user's personal mobile if available
      if (userData.personalMobile) {
        allocatedNumbers.push(userData.personalMobile);
      }

      // Get company contacts' phone numbers (treating company contacts as group members)
      const contactsResponse = await fetch(`/api/contacts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer user_${userId}`,
        },
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        const companyContacts = contactsData.contacts.filter((contact: any) => contact.category === 'company');
        companyContacts.forEach((contact: any) => {
          allocatedNumbers.push(contact.phoneNumber);
        });
      }

      return allocatedNumbers;
    } catch (error) {
      console.error("Error getting allocated phone numbers:", error);
      return [];
    }
  };

  const filteredMessages = sentApiMessages.filter((message) => {
    const matchesSearch =
      searchQuery === "" ||
      (message.to && message.to.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (message.messageContent && message.messageContent.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || message.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate status counts from real API data
  const totalSent = sentApiMessages.length;
  const deliveredCount = sentApiMessages.filter(m => m.status === "delivered").length;
  const pendingCount = sentApiMessages.filter(m => ["queued", "pending", "scheduled"].includes(m.status)).length;
  const failedCount = sentApiMessages.filter(m => ["failed", "cancelled", "expired"].includes(m.status)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Sent Messages ({sentApiMessages.length} total)
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Message List */}
          <div className="w-2/3 space-y-4 bg-card">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({totalSent})</SelectItem>
                  <SelectItem value="delivered">Delivered ({deliveredCount})</SelectItem>
                  <SelectItem value="sent">Sent ({totalSent - failedCount - pendingCount})</SelectItem>
                  <SelectItem value="failed">Failed ({failedCount})</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchSentMessages}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Message List */}
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2">
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {searchQuery || statusFilter !== "all"
                      ? "No messages found matching your criteria"
                      : "No sent messages yet"}
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.messageId}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedMessage?.messageId === message.messageId ? "bg-blue-50 border-blue-200" : ""
                      }`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            message.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : message.status === "sent"
                              ? "bg-blue-100 text-blue-800"
                              : message.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }>{message.status?.toUpperCase()}</Badge>
                          <Badge variant="secondary">SMS</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {message.sentTimestamp
                            ? new Date(message.sentTimestamp).toLocaleString()
                            : message.createTimestamp
                            ? new Date(message.createTimestamp).toLocaleString()
                            : ""}
                        </div>
                      </div>
                      <div className="text-sm mb-1">
                        <span className="font-medium">To:</span> {message.to}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{message.messageContent}</div>
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
                  <h3 className="font-medium mb-2">Message Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className={`ml-2 ${
                        selectedMessage.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : selectedMessage.status === "sent"
                          ? "bg-blue-100 text-blue-800"
                          : selectedMessage.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {selectedMessage.status?.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">From:</span> {selectedMessage.from}
                    </div>
                    <div>
                      <span className="font-medium">To:</span> {selectedMessage.to}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {selectedMessage.createTimestamp ? new Date(selectedMessage.createTimestamp).toLocaleString() : ""}
                    </div>
                    {selectedMessage.sentTimestamp && (
                      <div>
                        <span className="font-medium">Sent:</span> {new Date(selectedMessage.sentTimestamp).toLocaleString()}
                      </div>
                    )}
                    {selectedMessage.receivedTimestamp && (
                      <div>
                        <span className="font-medium">Delivered:</span> {new Date(selectedMessage.receivedTimestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Message Content</h4>
                  <ScrollArea className="h-32">
                    <div className="text-sm p-3 bg-gray-50 rounded whitespace-pre-wrap">{selectedMessage.messageContent}</div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-3 h-3 mr-1" />
                    View Delivery Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="w-3 h-3 mr-1" />
                    Export Details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a message to view details
              </div>
            )}
          </div>

          {/* Message Status Summary Cards (dynamic) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 w-full">
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <div className="text-2xl font-bold">{totalSent}</div>
                  <div className="text-sm text-gray-600">Total Sent</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <div className="text-2xl font-bold">{deliveredCount}</div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <div className="text-2xl font-bold">{failedCount}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

