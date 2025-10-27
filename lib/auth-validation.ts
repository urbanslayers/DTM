import { type NextRequest } from "next/server"
import { db } from "./database"

export interface AuthenticatedUser {
  id: string
  username: string
  role: string
  [key: string]: any
}

/**
 * Validates a Bearer token and returns the authenticated user
 */
export async function validateUserToken(request: NextRequest): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "No authorization header provided" }
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    // Check if it's a user token (format: "user_{userId}")
    if (token.startsWith("user_")) {
      const userId = token.substring(5) // Remove "user_" prefix

      // Get user by ID - database is already initialized
      const user = await db.getUserById ? await db.getUserById(userId) : null

      if (!user) {
        return { user: null, error: "Invalid user token" }
      }

      return { user }
    }

    // For backward compatibility, also accept "admin_token" for admin routes
    if (token === "admin_token") {
      // Try to get an admin user - this is a temporary fallback
      const adminUsers = await db.getUsersByRole ? await db.getUsersByRole("admin") : []
      if (adminUsers.length > 0) {
        return { user: adminUsers[0] }
      }
    }

    return { user: null, error: "Invalid token format" }
  } catch (error) {
    console.error("[AUTH VALIDATION] Error:", error)
    return { user: null, error: "Authentication error" }
  }
}

/**
 * Middleware function to require authentication for admin routes
 */
export async function requireAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  const { user, error } = await validateUserToken(request)

  if (!user) {
    return { user: null, error: error || "Authentication required" }
  }

  if (user.role !== "admin") {
    return { user: null, error: "Admin access required" }
  }

  return { user }
}
