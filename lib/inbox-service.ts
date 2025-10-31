import type { InboxMessage } from "./types"
import { authService } from "./auth"

class InboxService {
  async getMessages(
    offset: number = 0,
    limit: number = 50,
    folder?: "personal" | "company",
  ): Promise<{ messages: InboxMessage[]; totalCount: number }> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return { messages: [], totalCount: 0 }

      const params = new URLSearchParams({
        userId: user.id,
        offset: offset.toString(),
        limit: limit.toString(),
      })

      if (folder) {
        params.set('folder', folder)
      }

      const url = `/api/messaging/inbox?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer user_${user.id}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const messages = data.messages || []
        const totalCount = Number(data.totalCount ?? data.paging?.totalCount ?? messages.length)
        return { messages, totalCount }
      }
    } catch (error) {
      console.error("[InboxService] Error getting messages:", error)
    }

    return { messages: [], totalCount: 0 }
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

  async markAllAsRead(): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/messaging/inbox/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[InboxService] Error marking all messages as read:", error);
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
      const { messages } = await this.getMessages()
      const lowercaseQuery = query.toLowerCase()

      return messages.filter(
        (msg) =>
          msg.from.toLowerCase().includes(lowercaseQuery) ||
          msg.content.toLowerCase().includes(lowercaseQuery) ||
          (msg.subject && msg.subject.toLowerCase().includes(lowercaseQuery)),
      )
    } catch (error) {
      console.error("[InboxService] Error searching messages:", error)
      return []
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const { messages } = await this.getMessages()
      return messages.filter((msg) => !msg.read).length
    } catch (error) {
      console.error("[InboxService] Error getting unread count:", error)
      return 0
    }
  }
}

export const inboxService = new InboxService()
