import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import type { Rule } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const updates = body

    // Log API call
    await db.logAPICall("system", "/api/rules/[id]", "PUT", Math.random() * 100 + 50, 200)

    const rule = await db.updateRule(params.id, updates)

    if (rule) {
      await db.addSystemMessage(rule.userId, "success", `Rule "${rule.name}" updated successfully`)
      return NextResponse.json({ rule })
    } else {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[RULE API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Log API call
    await db.logAPICall("system", "/api/rules/[id]", "DELETE", Math.random() * 100 + 50, 200)

    // Get rule first to get userId for system message
    const allRules = await db.getAllRules()
    const rule = allRules.find((r: Rule) => r.id === params.id)

    if (rule && await db.deleteRule(params.id)) {
      await db.addSystemMessage(rule.userId, "success", `Rule "${rule.name}" deleted successfully`)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[RULE API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
