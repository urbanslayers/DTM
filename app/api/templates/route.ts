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
    await db.logAPICall(userId, "/api/templates", "GET", Math.random() * 100 + 50, 200)

    const templates = await db.getTemplatesByUserId(userId)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("[TEMPLATES API] Error:", error)
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
    const { name, content, category, userId } = body

    if (!userId || !name || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/templates", "POST", Math.random() * 100 + 50, 201)

    const template = await db.addTemplate({
      userId,
      name,
      content,
      category: category || "personal",
    })

    await db.addSystemMessage(userId, "success", `Template "${name}" created successfully`)

    return NextResponse.json({ template })
  } catch (error) {
    console.error("[TEMPLATES API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
