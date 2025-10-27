import type { User } from "./types"
// Remove database import to prevent Prisma client from being bundled in browser

class AuthService {
  private currentUser: User | null = null

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = data.user

        // Store user data in browser storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user))
          localStorage.setItem('user', JSON.stringify(data.user))
        }

        return { success: true, user: data.user }
      } else {
        const errorData = await response.json()
        return { success: false, error: errorData.error_description || "Login failed" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer user_${this.currentUser?.id || 'unknown'}`,
        },
      })
    } catch (error) {
      console.error('[AUTH] Logout API call failed:', error)
    }

    // Clear browser storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('currentUser')
      localStorage.removeItem('user')
    }

    this.currentUser = null
  }

  getCurrentUser(): User | null {
    // If no internal user, check browser storage only (no database calls)
    if (typeof window !== 'undefined') {
      try {
        // Check sessionStorage first (more recent)
        const sessionUserStr = sessionStorage.getItem('currentUser')
        if (sessionUserStr) {
          return JSON.parse(sessionUserStr)
        }

        // Fall back to localStorage
        const localUserStr = localStorage.getItem('user')
        if (localUserStr) {
          return JSON.parse(localUserStr)
        }
      } catch (error) {
        console.error('[AUTH] Error parsing stored user data:', error)
      }
    }

    return this.currentUser
  }

  async updateUser(updates: Partial<User>): Promise<boolean> {
    if (!this.currentUser) return false

    try {
      const response = await fetch(`/api/admin/users/${this.currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${this.currentUser.id}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        this.currentUser = updatedUser

        // Update browser storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('currentUser', JSON.stringify(updatedUser))
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }

        return true
      }
    } catch (error) {
      console.error('[AUTH] Update user failed:', error)
    }

    return false
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null || (typeof window !== 'undefined' && !!(sessionStorage.getItem('currentUser') || localStorage.getItem('user')))
  }
}

export const authService = new AuthService()
