import type { Message } from "./types"
import { authService } from "./auth"

class MessagingService {
  private _pollTimer: number | null = null
  private _isPolling: boolean = false
  private _pollIntervalMs: number = 30 * 1000 // default 30s
  private _minIntervalMs: number = 15 * 1000 // don't poll faster than 15s
  private _maxIntervalMs: number = 5 * 60 * 1000 // backoff max 5 minutes
  private _snoozeUntil: number | null = null // timestamp till which polling is paused
  async sendMessage(
    to: string[],
    content: string,
    type: "sms" | "mms" = "sms",
    scheduledAt?: Date,
    templateName?: string,
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
    const validNumbers = to
      .filter((number) => this.isValidPhoneNumber(number))
      .map((number) => this.normalizePhoneNumber(number))
    if (validNumbers.length === 0) {
      console.error("[MessagingService] No valid phone numbers provided");
      return { success: false, error: "No valid phone numbers provided" }
    }

    console.log("[MessagingService] Valid recipients:", validNumbers.length);

    // Calculate credits needed
    const creditsNeeded = this.calculateCredits(content, type) * validNumbers.length
    if (user.credits < creditsNeeded) {
      console.error("[MessagingService] Insufficient credits:", { userCredits: user.credits, needed: creditsNeeded });
      return { success: false, error: "Insufficient credits" }
    }

    console.log("[MessagingService] Credits check passed, needed:", creditsNeeded);

    try {
      // Send via Next.js API routes which will call Telstra API with proper parameters
      const results = await Promise.all(
        validNumbers.map(async (number) => {
          console.log("[MessagingService] Sending to:", number);

          const endpoint = type === "sms" ? "/api/messaging/sms" : "/api/messaging/mms";
          const payload = {
            to: number,
            body: content,
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

      // For immediate messages, save to database via API
      if (!scheduledAt) {
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
              content,
              type,
              status: 'sent',
              credits: creditsNeeded,
              isTemplate: !!templateName,
              templateName,
              userId: user.id,
              from: user.personalMobile || null,
            }),
          });
        
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
        } catch (error) {
          console.error("[MessagingService] Failed to save message to database:", error);
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
    // Australian mobile number validation
    const cleaned = number.replace(/\s+/g, "")
    return /^(\+61|0)[4-5]\d{8}$/.test(cleaned)
  }

  private calculateCredits(content: string, type: "sms" | "mms"): number {
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
  }) {
    if (this._isPolling) return
    this._isPolling = true

    const onUpdate = options?.onUpdate
    const fetchSent = options?.fetchSent !== false
    const fetchInbox = options?.fetchInbox !== false

    if (options?.intervalMs) {
      const v = Math.max(this._minIntervalMs, Math.min(this._maxIntervalMs, options.intervalMs))
      this._pollIntervalMs = v
    }

    // Kick off the poll loop
    const pollOnce = async () => {
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
            const inboxUrl = `/api/messaging/inbox?userId=${encodeURIComponent(user.id)}&limit=50&filter=all`
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
    pollOnce().catch((e) => console.warn('[MessagingService] Poll loop start failed', e))
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
      });

      const response = await fetch(`/api/messaging/messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error("[MessagingService] Error getting scheduled messages:", error);
    }

    return []
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
