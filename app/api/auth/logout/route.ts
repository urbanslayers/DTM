import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    await db.initialize()

    // Be defensive: request may have an empty body (e.g., clients calling without JSON)
    let body: any = {}
    try {
      body = await request.json()
    } catch (_) {
      body = {}
    }

    let { userId } = body || {}

    // Fallback: try to extract userId from a client-side auth header format `Bearer user_<id>`
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        if (token.startsWith('user_')) {
          userId = token.split('user_')[1]
        }
      }
    }

    if (!userId) {
      // No user id supplied — nothing to persist. Return success (idempotent logout).
      console.log(`[LOGOUT API] No userId provided on logout request`)
      return NextResponse.json({ success: true })
    }

    console.log(`[LOGOUT API] Logging out user: ${userId}`)

    // Verify the user actually exists before attempting any FK-bound writes.
    try {
      const existing = await db.getUserById(userId)
      if (existing) {
        // Log logout in system status (safe since user exists)
        await db.addSystemMessage(userId, "info", "User logged out")
      } else {
        // Unknown user id — skip the DB write to avoid FK errors.
        console.warn(`[LOGOUT API] userId ${userId} not found; skipping system status write`)
      }
    } catch (e) {
      // If anything goes wrong querying/creating the status, log and continue — logout should not fail.
      console.error(`[LOGOUT API] Warning: failed to record logout for user ${userId}:`, e)
    }

    // Clear any session data (in a real app, you'd invalidate tokens here)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[LOGOUT API] Error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    )
  }
}
