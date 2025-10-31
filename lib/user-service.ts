import { authService } from "./auth"

class UserService {
  async searchUsers(query: string, limit: number = 20) {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const params = new URLSearchParams()
      params.set('search', query)
      params.set('limit', String(limit))

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.users || []
      }
    } catch (error) {
      console.error('[UserService] Error searching users:', error)
    }

    return []
  }
}

export const userService = new UserService()
