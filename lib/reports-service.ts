import { telstraAPI } from "./telstra-api";

class ReportsService {
  /**
   * Create a new report (POST /messages/report)
   * @param params - Optional parameters for report creation (e.g., date range, message type)
   */
  async createReport(params?: Record<string, any>) {
    // This assumes the backend /api/messages/report endpoint proxies to Telstra's API
    const response = await fetch("/api/messaging/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(telstraAPI as any).getAuthHeaders?.() || {},
      },
      body: params ? JSON.stringify(params) : undefined,
    });
    return response.json();
  }

  /**
   * Fetch a specific report by ID (GET /messages/report/{reportId})
   * @param reportId - The ID of the report to fetch
   */
  async getReport(reportId: string) {
    const response = await fetch(`/api/messaging/reports/${reportId}`, {
      headers: {
        ...(telstraAPI as any).getAuthHeaders?.() || {},
      },
    });
    return response.json();
  }

  /**
   * Fetch all reports (GET /messages/report)
   */
  async getAllReports() {
    const response = await fetch("/api/messaging/reports", {
      headers: {
        ...(telstraAPI as any).getAuthHeaders?.() || {},
      },
    }
  )
    return response.json();
  }
}

export const reportsService = new ReportsService();