import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/rules", "GET", Math.random() * 100 + 50, 200)

    const rules = await db.getRulesByUserId(userId)

    return NextResponse.json({ rules })
  } catch (error) {
    console.error("[RULES API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, condition, action, enabled, userId } = body

    if (!userId || !name || !condition || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/rules", "POST", Math.random() * 100 + 50, 201)

    const rule = await db.addRule({
      userId,
      name,
      condition,
      action,
      enabled: enabled !== undefined ? enabled : true,
    })

    await db.addSystemMessage(userId, "success", `Rule "${name}" created successfully`)

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("[RULES API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
