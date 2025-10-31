import type { MessageTemplate } from "./types"
import { authService } from "./auth"

class TemplateService {
  async getTemplates(): Promise<MessageTemplate[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const response = await fetch(`/api/templates?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.templates || [];
      }
    } catch (error) {
      console.error("[TemplateService] Error getting templates:", error);
    }

    return []
  }

  async addTemplate(name: string, content: string, category: "personal" | "company"): Promise<MessageTemplate | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify({
          name,
          content,
          category,
          userId: user.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.template;
      }
    } catch (error) {
      console.error("[TemplateService] Error adding template:", error);
    }

    return null
  }

  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    try {
      const templates = await this.getTemplates()
      return templates.find((template) => template.id === templateId) || null
    } catch (error) {
      console.error("[TemplateService] Error getting template:", error);
      return null
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[TemplateService] Error deleting template:", error);
      return false
    }
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        return data.template;
      }
    } catch (error) {
      console.error("[TemplateService] Error updating template:", error);
    }

    return null
  }
}

export const templateService = new TemplateService()
