import type { Message } from "./types"
import { authService } from "./auth"

class MessagingService {
  private _pollTimer: number | null = null
  private _isPolling: boolean = false
  private _pollIntervalMs: number = 15 * 1000 // default 5s
  private _minIntervalMs: number = 15 * 1000 // don't poll faster than 15s
  private _maxIntervalMs: number = 5 * 60 * 1000 // backoff max 5 minutes
  private _snoozeUntil: number | null = null // timestamp till which polling is paused

  private async replaceTemplateVariables(content: string, userId?: string): Promise<string> {
    const { variableProcessor } = await import('./variable-processor');
    
    // Get user data if userId is provided
    let userData = null;
    if (userId) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          headers: {
            'Authorization': `Bearer user_${userId}`,
          },
        });
        if (response.ok) {
          userData = await response.json();
        }
      } catch (error) {
        console.error("[MessagingService] Error fetching user data for variables:", error);
      }
    }

    // Process the template with our variable processor
    return await variableProcessor.processTemplate(
      content,
      userData,
      undefined, // No campaign data in this context
      {
        // Add any message-specific custom variables here
        message_id: `msg-${Date.now()}`,
        sent_date: new Date().toLocaleDateString(),
        sent_time: new Date().toLocaleTimeString(),
      }
    );
  }
  async sendMessage(
    to: string[],
    content: string,
    type: "sms" | "mms" | "email" = "sms",
    scheduledAt?: Date,
    templateName?: string,
    subject?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log("[MessagingService] Starting sendMessage with:", {
      to: to.length + " recipients",
      contentLength: content.length,
      type,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : "immediate",
      templateName
    });

    const user = authService.getCurrentUser()
    if (!user) {
      console.error("[MessagingService] User not authenticated");
      return { success: false, error: "User not authenticated" }
    }

    console.log("[MessagingService] User authenticated:", user.username);

    // Validate and normalize phone numbers
    // Replace template variables in the content
    const processedContent = await this.replaceTemplateVariables(content, user.id);

    // Validate and normalize phone numbers
    const validNumbers = to
      .filter((number) => this.isValidPhoneNumber(number))
      .map((number) => this.normalizePhoneNumber(number))
    if (validNumbers.length === 0) {
      console.error("[MessagingService] No valid phone numbers provided");
      return { success: false, error: "No valid phone numbers provided" }
    }

    console.log("[MessagingService] Valid recipients:", validNumbers.length);

    // Calculate credits needed
    const creditsNeeded = this.calculateCredits(processedContent, type) * validNumbers.length
    if (user.credits < creditsNeeded) {
      console.error("[MessagingService] Insufficient credits:", { userCredits: user.credits, needed: creditsNeeded });
      return { success: false, error: "Insufficient credits" }
    }

    console.log("[MessagingService] Credits check passed, needed:", creditsNeeded);

    try {
      // Handle email differently from SMS/MMS
      if (type === "email") {
        // For email, send to all recipients at once
        const emailEndpoint = "/api/messaging/email";
        const emailPayload = {
          to: validNumbers,
          content,
          subject: subject || "New Message",
          userId: user.id
        };

        const response = await fetch(emailEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer user_${user.id}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          return { success: true, messageId: `email-${Date.now()}` };
        }
        return { success: false, error: result.error || "Failed to send email" };
      }

      // For SMS/MMS, send via Next.js API routes which will call Telstra API with proper parameters
      const results = await Promise.all(
        validNumbers.map(async (number) => {
          console.log("[MessagingService] Sending to:", number);

          const endpoint = type === "sms" ? "/api/messaging/sms" : "/api/messaging/mms";
          const payload = {
            to: number,
            body: processedContent,
            from: user.personalMobile,
            ...(scheduledAt ? { scheduledAt } : {}), // Pass scheduledAt to API route
          };

          console.log("[MessagingService] Calling API endpoint:", endpoint);
          console.log("[MessagingService] Payload:", payload);

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer user_${user.id}`,
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();
          console.log("[MessagingService] API response:", result);

          if (response.ok) {
            return { success: true, data: result };
          } else {
            console.error("[MessagingService] API error:", result);
            return { success: false, error: result.error || "Failed to send message" };
          }
        }),
      );

      // Check if all messages were sent successfully
      const failedMessages = results.filter((result) => !result.success)
      if (failedMessages.length > 0) {
        console.error("[MessagingService] Failed messages:", failedMessages.length, "out of", validNumbers.length);
        return { success: false, error: `Failed to send ${failedMessages.length} out of ${validNumbers.length} messages` }
      }

      console.log("[MessagingService] All messages sent successfully");

      const messageStatus = scheduledAt ? 'scheduled' : 'sent'

      try {
        // Include the sender's number when saving to DB so the messages API can
        // reliably match sent messages to the user's allocated/send-from numbers.
        await fetch('/api/messaging/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer user_${user.id}`,
          },
          body: JSON.stringify({
            to: validNumbers,
            content: processedContent,
            type,
            status: messageStatus,
            credits: creditsNeeded,
            isTemplate: !!templateName,
            templateName,
            userId: user.id,
            from: user.personalMobile || null,
            scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
          }),
        });
      } catch (error) {
        console.error("[MessagingService] Failed to save message to database:", error);
      }

      if (!scheduledAt) {
        // After saving the sent message, trigger a provider sync to pick up any
        // provider-side records (e.g. provider inbox echoes or replies) so the
        // inbox view updates promptly. Fire-and-forget but attempt to call.
        try {
          fetch('/api/messaging/sync-provider', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer user_${user.id}`,
            },
            body: JSON.stringify({ userId: user.id, limit: 50 }),
          }).catch((e) => console.warn('[MessagingService] sync-provider call failed', e))
        } catch (e) {
          console.warn('[MessagingService] sync-provider invocation failed', e)
        }
      }

      // TODO: Notify message sent via WebSocket (server-side only)
      // wsManager.notifyMessageSent(user.id, { ... })

      const action = scheduledAt ? "scheduled" : "sent"
      console.log(`[MessagingService] Message ${action} successfully`);
      return { success: true, messageId: `msg-${Date.now()}` }
    } catch (error) {
      console.error("[MessagingService] Error sending message:", error);
      return { success: false, error: "Failed to send message via API" }
    }
  }

  private async updateAccountBalance() {
    const user = authService.getCurrentUser()
    if (!user) return

    try {
      const response = await fetch('/api/account/balance', {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newCredits = result.data.credits.sms
          // Update user credits via API
          await fetch(`/api/admin/users/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer user_${user.id}`,
            },
            body: JSON.stringify({ credits: newCredits }),
          });
        }
      }
    } catch (error) {
      console.error("[MessagingService] Error updating account balance:", error);
    }
  }

  async getMessageStatus(messageId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(`/api/messaging/status?messageId=${encodeURIComponent(messageId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return { success: true, status: result.status };
      } else {
        return { success: false, error: result.error || "Failed to get message status" };
      }
    } catch (error) {
      console.error("[MessagingService] Error getting message status:", error);
      return { success: false, error: "Network error" };
    }
  }

  async getInbox(): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const response = await fetch('/api/messaging/inbox?limit=50&filter=all', {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return { success: true, messages: result.messages };
      } else {
        return { success: false, error: result.error || "Failed to get inbox" };
      }
    } catch (error) {
      console.error("[MessagingService] Error getting inbox:", error);
      return { success: false, error: "Network error" };
    }
  }

  private normalizePhoneNumber(number: string): string {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, "")

    // If it starts with 0, replace with +61
    if (cleaned.startsWith("0")) {
      return "+61" + cleaned.substring(1)
    }

    // If it doesn't start with +, assume it's Australian and add +61
    if (!cleaned.startsWith("+")) {
      return "+61" + cleaned
    }

    return cleaned
  }

  private isValidPhoneNumber(number: string): boolean {
    // Check if it's an email address for email type messages
    if (number.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(number);
    }
    // Australian mobile number validation
    const cleaned = number.replace(/\s+/g, "")
    return /^(\+61|0)[4-5]\d{8}$/.test(cleaned)
  }

  private calculateCredits(content: string, type: "sms" | "mms" | "email"): number {
    if (type === "mms") {
      return 3 // MMS costs more
    }

    // SMS: 1 credit per 160 characters
    return Math.ceil(content.length / 160)
  }

  parseRecipients(recipientString: string): string[] {
    return recipientString
      .split(/[;,\n]/)
      .map((num) => num.trim())
      .filter((num) => num.length > 0)
  }

  async getSentMessages(offset: number = 0, limit: number = 50): Promise<{ messages: Message[]; totalCount: number }> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return { messages: [], totalCount: 0 }

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await this.getAllocatedPhoneNumbers(user.id)

      const params = new URLSearchParams({
        userId: user.id,
        status: 'sent,delivered,failed',
        phoneNumbers: allocatedNumbers.join(','),
        matchFromOnly: 'true',
        offset: offset.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/messaging/messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // API now returns { messages: [...], totalCount }
        return { messages: data.messages || [], totalCount: Number(data.totalCount || (data.messages || []).length) };
      }
    } catch (error) {
      console.error("[MessagingService] Error getting sent messages:", error);
    }

    return { messages: [], totalCount: 0 }
  }

  /**
   * Start polling sent/received messages while the app is idle.
   * - onUpdate is called each successful poll with { sent?: Message[], inbox?: any[] }
   * - options.intervalMs: preferred interval (will be clamped between min/max)
   * - options.fetchInbox/fetchSent: booleans to enable specific fetches
   */
  startPollingMessages(options?: {
    onUpdate?: (payload: { sent?: Message[]; inbox?: any[] }) => void
    intervalMs?: number
    fetchSent?: boolean
    fetchInbox?: boolean
    direction?: "incoming" | "outgoing"
  }) {
    if (this._isPolling) return
    this._isPolling = true

    const onUpdate = options?.onUpdate
    const fetchSent = options?.fetchSent !== false
    const fetchInbox = options?.fetchInbox !== false
    const direction = options?.direction || "incoming"

    if (options?.intervalMs) {
      const v = Math.max(this._minIntervalMs, Math.min(this._maxIntervalMs, options.intervalMs))
      this._pollIntervalMs = v
    }

    // Kick off the poll loop
    const pollOnce = async (direction: "incoming" | "outgoing") => {
      if (!this._isPolling) return

      // If snoozed due to Retry-After, skip until expiry
      if (this._snoozeUntil && Date.now() < this._snoozeUntil) {
        const waitMs = this._snoozeUntil - Date.now()
        this._pollTimer = window.setTimeout(pollOnce, Math.max(waitMs, this._minIntervalMs))
        return
      }

      try {
        const user = authService.getCurrentUser()
        if (!user) {
          // No user; stop polling
          this.stopPollingMessages()
          return
        }

        const results: { sent?: Message[]; inbox?: any[] } = {}

        // Fetch sent messages with raw response handling so we can read headers
        if (fetchSent) {
          try {
            const allocatedNumbers = await this.getAllocatedPhoneNumbers(user.id)
            const params = new URLSearchParams({
              userId: user.id,
              status: 'sent,delivered,failed',
              phoneNumbers: allocatedNumbers.join(','),
              matchFromOnly: 'true',
              offset: '0',
              limit: '50',
            })

            const response = await fetch(`/api/messaging/messages?${params.toString()}`, {
              headers: { Authorization: `Bearer user_${user.id}` },
            })

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
              if (retryAfter > 0) {
                // Respect server suggested retry
                this._snoozeUntil = Date.now() + retryAfter * 1000
                console.warn('[MessagingService][poll] 429 received, snoozing until', new Date(this._snoozeUntil))
              } else {
                // Exponential backoff
                this._pollIntervalMs = Math.min(this._pollIntervalMs * 2, this._maxIntervalMs)
                console.warn('[MessagingService][poll] 429 received, backing off to', this._pollIntervalMs)
              }
            } else if (response.ok) {
              const data = await response.json()
              results.sent = data.messages || []
              // reset poll interval toward default on success
              this._pollIntervalMs = Math.max(this._minIntervalMs, Math.min(this._pollIntervalMs, 30 * 1000))
            } else {
              console.warn('[MessagingService][poll] Unexpected response', response.status)
            }
          } catch (e) {
            console.warn('[MessagingService][poll] Failed to fetch sent messages', e)
            // on error, jitter the next interval a bit
            this._pollIntervalMs = Math.min(this._pollIntervalMs * 1.5, this._maxIntervalMs)
          }
        }

        // Fetch inbox
        if (fetchInbox) {
          try {
            // Include userId in the query so the server returns DB-backed inbox messages
            // (which are sorted by receivedAt desc). If userId is omitted the API falls
            // back to the Telstra provider which can return a different order.
            const inboxUrl = `/api/messaging/inbox?userId=${encodeURIComponent(user.id)}&limit=50&filter=all&direction=incoming`
            const response = await fetch(inboxUrl, {
              headers: { Authorization: `Bearer user_${user.id}` },
            })

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
              if (retryAfter > 0) {
                this._snoozeUntil = Date.now() + retryAfter * 1000
                console.warn('[MessagingService][poll] Inbox 429 received, snoozing until', new Date(this._snoozeUntil))
              } else {
                this._pollIntervalMs = Math.min(this._pollIntervalMs * 2, this._maxIntervalMs)
                console.warn('[MessagingService][poll] Inbox 429 received, backing off to', this._pollIntervalMs)
              }
            } else if (response.ok) {
              const data = await response.json()
              results.inbox = data.messages || data.inbox || []
            } else {
              console.warn('[MessagingService][poll] Inbox unexpected response', response.status)
            }
          } catch (e) {
            console.warn('[MessagingService][poll] Failed to fetch inbox', e)
          }
        }

        // If we got results, call update callback
        if (onUpdate && (results.sent || results.inbox)) {
          try {
            onUpdate(results)
          } catch (e) {
            console.warn('[MessagingService][poll] onUpdate handler threw', e)
          }
        }
      } catch (e) {
        console.error('[MessagingService][poll] Unexpected error', e)
      } finally {
        // Schedule next poll respecting current interval (apply a small jitter)
        if (this._isPolling) {
          const jitter = Math.floor(Math.random() * 1000)
          const next = Math.max(this._minIntervalMs, Math.min(this._pollIntervalMs + jitter, this._maxIntervalMs))
          this._pollTimer = window.setTimeout(pollOnce, next)
        }
      }
    }

    // Start immediately
    pollOnce(direction).catch((e) => console.warn('[MessagingService] Poll loop start failed', e))
  }

  stopPollingMessages() {
    this._isPolling = false
    if (this._pollTimer) {
      clearTimeout(this._pollTimer)
      this._pollTimer = null
    }
    this._snoozeUntil = null
  }

  async getScheduledMessages(offset: number = 0, limit: number = 50): Promise<Message[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await this.getAllocatedPhoneNumbers(user.id)

      const params = new URLSearchParams({
        userId: user.id,
        status: 'scheduled',
        phoneNumbers: allocatedNumbers.join(','),
        matchFromOnly: 'true',
        offset: offset.toString(),
        limit: limit.toString(),
        format: 'raw',
      });

      const response = await fetch(`/api/messaging/messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const toArray = (val: any): string[] => {
          if (!val) return []
          if (Array.isArray(val)) return val.map(String)
          if (typeof val === 'string') {
            const trimmed = val.trim()
            if (!trimmed) return []
            if (trimmed.startsWith('[')) {
              try {
                const parsed = JSON.parse(trimmed)
                return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
              } catch (e) {
                return [trimmed]
              }
            }
            if (trimmed.includes(',')) {
              return trimmed.split(',').map((p) => p.trim()).filter(Boolean)
            }
            return [trimmed]
          }
          try {
            return [String(val)]
          } catch (e) {
            return []
          }
        }

        const toDate = (value: string | Date | null | undefined): Date | undefined => {
          if (!value) return undefined
          return value instanceof Date ? value : new Date(value)
        }

        return (data.messages || []).map((msg: any) => ({
          id: msg.id,
          userId: msg.userId,
          to: toArray(msg.to),
          from: msg.from || undefined,
          content: msg.content,
          type: msg.type || 'sms',
          status: msg.status || 'scheduled',
          credits: typeof msg.credits === 'number' ? msg.credits : 0,
          isTemplate: !!msg.isTemplate,
          createdAt: toDate(msg.createdAt) || new Date(),
          sentAt: toDate(msg.sentAt),
          deliveredAt: toDate(msg.deliveredAt),
          scheduledAt: toDate(msg.scheduledAt),
          templateName: msg.templateName || undefined,
        }))
      }
    } catch (error) {
      console.error("[MessagingService] Error getting scheduled messages:", error);
    }

    return []
  }

  async updateScheduledMessage(
    messageId: string,
    updates: {
      to?: string[]
      content?: string
      status?: Message['status']
      scheduledAt?: Date
      templateName?: string
      type?: Message['type']
    },
  ): Promise<boolean> {
    const user = authService.getCurrentUser()
    if (!user) return false

    const payload: Record<string, any> = {
      messageId,
      userId: user.id,
    }

    if (updates.to) payload.to = updates.to
    if (typeof updates.content === 'string') payload.content = updates.content
    if (updates.status) payload.status = updates.status
    if (updates.scheduledAt) payload.scheduledAt = updates.scheduledAt.toISOString()
    if (typeof updates.templateName === 'string') payload.templateName = updates.templateName
    if (updates.type) payload.type = updates.type

    try {
      const response = await fetch('/api/messaging/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify(payload),
      })

      return response.ok
    } catch (error) {
      console.error('[MessagingService] Failed to update scheduled message:', error)
      return false
    }
  }

  private async getAllocatedPhoneNumbers(userId: string): Promise<string[]> {
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
      console.error("[MessagingService] Error getting allocated phone numbers:", error);
      return [];
    }
  }
}

export const messagingService = new MessagingService()
