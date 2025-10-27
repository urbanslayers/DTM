import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import type { MessageTemplate } from "@/lib/types"

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
    await db.logAPICall("system", "/api/templates/[id]", "PUT", Math.random() * 100 + 50, 200)

    const template = await db.updateTemplate(params.id, updates)

    if (template) {
      await db.addSystemMessage(template.userId, "success", `Template "${template.name}" updated successfully`)
      return NextResponse.json({ template })
    } else {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[TEMPLATE API] Error:", error)
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
    await db.logAPICall("system", "/api/templates/[id]", "DELETE", Math.random() * 100 + 50, 200)

    // Get template first to get userId for system message
    const allTemplates = await db.getAllTemplates()
    const template = allTemplates.find((t: MessageTemplate) => t.id === params.id)

    if (template && await db.deleteTemplate(params.id)) {
      await db.addSystemMessage(template.userId, "success", `Template "${template.name}" deleted successfully`)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[TEMPLATE API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
