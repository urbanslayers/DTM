import type { User } from "./types"
import { authService } from "./auth"

class EmailService {
  async sendEmail(
    to: string[],
    subject: string,
    content: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: "User not authenticated" }
      }

      const response = await fetch('/api/messaging/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify({
          to,
          subject,
          content,
          userId: user.id
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || "Failed to send email" }
      }

      return { success: true }
    } catch (error) {
      console.error("[EmailService] Error sending email:", error)
      return { success: false, error: "Failed to send email" }
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const emailService = new EmailService()