import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import type { Contact } from "@/lib/types"

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
    await db.logAPICall("system", "/api/contacts/[id]", "PUT", Math.random() * 100 + 50, 200)

    const contact = await db.updateContact(params.id, updates)

    if (contact) {
      await db.addSystemMessage(contact.userId, "success", `Contact "${contact.name}" updated successfully`)
      return NextResponse.json({ contact })
    } else {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[CONTACT API] Error:", error)
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
    await db.logAPICall("system", "/api/contacts/[id]", "DELETE", Math.random() * 100 + 50, 200)

    // Get contact first to get userId for system message
    const allContacts = await db.getAllContacts()
    const contact = allContacts.find((c: Contact) => c.id === params.id)

    if (contact && await db.deleteContact(params.id)) {
      await db.addSystemMessage(contact.userId, "success", `Contact "${contact.name}" deleted successfully`)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[CONTACT API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
