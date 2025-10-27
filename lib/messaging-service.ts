import type { Message } from "./types"
import { authService } from "./auth"

class MessagingService {
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
            }),
          });
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

  async getSentMessages(): Promise<Message[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await this.getAllocatedPhoneNumbers(user.id)

      const params = new URLSearchParams({
        userId: user.id,
        status: 'sent,delivered,failed',
        phoneNumbers: allocatedNumbers.join(','),
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
      console.error("[MessagingService] Error getting sent messages:", error);
    }

    return []
  }

  async getScheduledMessages(): Promise<Message[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await this.getAllocatedPhoneNumbers(user.id)

      const params = new URLSearchParams({
        userId: user.id,
        status: 'scheduled',
        phoneNumbers: allocatedNumbers.join(','),
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
