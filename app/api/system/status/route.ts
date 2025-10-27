import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract user ID from token (format: "user_${userId}")
    const token = authHeader.replace("Bearer ", "")
    const userIdMatch = token.match(/^user_(.+)$/)
    if (!userIdMatch) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
    }
    const userId = userIdMatch[1]

    // Log API call
    await db.logAPICall(userId, "/api/system/status", "GET", Math.random() * 100 + 50, 200)

    const systemStatusMessages = await db.getSystemStatusMessages(userId)

    return NextResponse.json({
      status: {
        messages: systemStatusMessages,
      },
    })
  } catch (error) {
    console.error("Failed to fetch system status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
