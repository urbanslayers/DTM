import type { Rule } from "./types"
import { authService } from "./auth"

class RulesService {
  async getRules(): Promise<Rule[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const response = await fetch(`/api/rules?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.rules || [];
      }
    } catch (error) {
      console.error("[RulesService] Error getting rules:", error);
    }

    return []
  }

  async addRule(name: string, condition: Rule["condition"], action: Rule["action"]): Promise<Rule | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify({
          name,
          condition,
          action,
          enabled: true,
          userId: user.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.rule;
      }
    } catch (error) {
      console.error("[RulesService] Error adding rule:", error);
    }

    return null
  }

  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        return data.rule;
      }
    } catch (error) {
      console.error("[RulesService] Error updating rule:", error);
    }

    return null
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[RulesService] Error deleting rule:", error);
      return false
    }
  }

  async toggleRule(ruleId: string): Promise<boolean> {
    try {
      const rules = await this.getRules()
      const rule = rules.find((r) => r.id === ruleId)

      if (rule) {
        const updated = await this.updateRule(ruleId, { enabled: !rule.enabled })
        return updated !== null
      }
    } catch (error) {
      console.error("[RulesService] Error toggling rule:", error);
    }

    return false
  }
}

export const rulesService = new RulesService()
