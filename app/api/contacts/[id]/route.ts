import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import { validateUserToken } from "@/lib/auth-validation"
import type { Contact } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await validateUserToken(request)
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    // Get the contact to check ownership
    const contact = await db.getContactById(params.id)
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    // Check if user owns the contact or is admin
    if (user.role !== "admin" && contact.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const updates = body

    // Log API call with correct user ID
    await db.logAPICall(user.id, "/api/contacts/[id]", "PUT", Math.random() * 100 + 50, 200)

    const updatedContact = await db.updateContact(params.id, updates)

    if (updatedContact) {
      await db.addSystemMessage(contact.userId, "success", `Contact "${updatedContact.name}" updated successfully`)
      return NextResponse.json({ contact: updatedContact })
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
    const { user, error } = await validateUserToken(request)
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    // Get contact first to get userId for system message and check ownership
    const contact = await db.getContactById(params.id)
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    // Check if user owns the contact or is admin
    if (user.role !== "admin" && contact.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Log API call with correct user ID
    await db.logAPICall(user.id, "/api/contacts/[id]", "DELETE", Math.random() * 100 + 50, 200)

    if (await db.deleteContact(params.id)) {
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
