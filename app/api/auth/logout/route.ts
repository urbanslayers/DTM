import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    await db.initialize()

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "User ID is required" },
        { status: 400 }
      )
    }

    console.log(`[LOGOUT API] Logging out user: ${userId}`)

    // Log logout
    await db.addSystemMessage(userId, "info", "User logged out")

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
