import type { InboxMessage } from "./types"
import { authService } from "./auth"

class InboxService {
  async getMessages(folder?: "personal" | "company"): Promise<InboxMessage[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const url = folder
        ? `/api/messaging/inbox?userId=${user.id}&folder=${folder}`
        : `/api/messaging/inbox?userId=${user.id}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error("[InboxService] Error getting messages:", error);
    }

    return []
  }

  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/messaging/inbox/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[InboxService] Error marking message as read:", error);
      return false
    }
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/messaging/inbox/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[InboxService] Error deleting message:", error);
      return false
    }
  }

  async searchMessages(query: string): Promise<InboxMessage[]> {
    try {
      const messages = await this.getMessages()
      const lowercaseQuery = query.toLowerCase()

      return messages.filter(
        (msg) =>
          msg.from.toLowerCase().includes(lowercaseQuery) ||
          msg.content.toLowerCase().includes(lowercaseQuery) ||
          (msg.subject && msg.subject.toLowerCase().includes(lowercaseQuery)),
      )
    } catch (error) {
      console.error("[InboxService] Error searching messages:", error);
      return []
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const messages = await this.getMessages()
      return messages.filter((msg) => !msg.read).length
    } catch (error) {
      console.error("[InboxService] Error getting unread count:", error);
      return 0
    }
  }
}

export const inboxService = new InboxService()
