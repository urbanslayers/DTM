
// IMPORTANT: This module is client-side only.
import "client-only";

class ApiClient {
  private baseURL = "/api";

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown error occurred" }));
        return { success: false, error: errorData.error || `Request failed with status ${response.status}` };
      }

      if (response.status === 204) {
        return { success: true, data: undefined };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error(`[ApiClient] Request to ${endpoint} failed:`, error);
      return { success: false, error: error.message || "A network error occurred." };
    }
  }

  async sendSMS(to: string[], body: string, options?: { scheduledAt?: Date; templateName?: string }) {
    return this.makeRequest("/messaging/sms", {
      method: "POST",
      body: JSON.stringify({ to, content: body, ...options }),
    });
  }

  async sendMMS(to: string[], body: string, options?: { subject?: string; media?: any[] }) {
    return this.makeRequest("/messaging/mms", {
      method: "POST",
      body: JSON.stringify({ to, content: body, ...options }),
    });
  }

  async getMessageStatus(messageId: string) {
    return this.makeRequest(`/messaging/status/${messageId}`);
  }

  async getMessages() {
    return this.makeRequest("/messaging/messages");
  }

  async getDeliveryReports(messageId: string) {
    return this.makeRequest(`/messaging/reports/${messageId}`);
  }
  
  async getAccountBalance() {
      return this.makeRequest("/account/balance");
  }
}

export const apiClient = new ApiClient();
