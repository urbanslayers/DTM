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
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/contacts", "GET", Math.random() * 100 + 50, 200)

    // If the requesting user is an admin, return all contacts; otherwise return scoped contacts
    let contacts: any[] = []
    try {
      const requestingUser = await db.getUserById(userId)
      if (requestingUser && requestingUser.role === 'admin') {
        contacts = await db.getAllContacts()
      } else {
        contacts = await db.getContactsByUserId(userId)
      }
    } catch (e) {
      console.warn('[CONTACTS API] Could not determine user role, falling back to scoped contacts', e)
      contacts = await db.getContactsByUserId(userId)
    }

    if (category && category !== "all") {
      contacts = contacts.filter((contact: any) => contact.category === category)
    }

    // Include users created via the admin dashboard as potential contacts.
    // We map users (excluding the requesting user) that have a phone number into contact-shaped objects
    // so they appear in the contacts list without needing a separate contact row.
    try {
      const allUsers = await db.getAllUsers()
      const userContacts = allUsers
        .filter((u: any) => u.id !== userId && !!u.personalMobile)
        .map((u: any) => ({
          id: `user:${u.id}`,
          userId: u.id,
          name: u.displayName || u.username,
          phoneNumber: u.personalMobile,
          email: u.email || undefined,
          category: 'company',
          // createdAt intentionally undefined for synthetic entries
        }))

      // Merge DB contacts with user-derived contacts, but avoid duplicates by phoneNumber
      const existingPhones = new Set(contacts.map((c: any) => c.phoneNumber))
      userContacts.forEach((uc: any) => {
        if (!existingPhones.has(uc.phoneNumber)) contacts.push(uc)
      })

      // If a category filter is present and not 'all', reapply it so synthetic users respect it
      if (category && category !== 'all') {
        contacts = contacts.filter((contact: any) => contact.category === category)
      }
    } catch (e) {
      console.warn('[CONTACTS API] Could not merge admin users into contacts list', e)
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      contacts = contacts.filter((contact: any) =>
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phoneNumber.includes(search) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("[CONTACTS API] Error:", error)
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
    const { name, phoneNumber, email, category, userId } = body

    if (!userId || !name || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/contacts", "POST", Math.random() * 100 + 50, 201)

    const contact = await db.addContact({
      userId,
      name,
      phoneNumber,
      email,
      category: category || "personal",
    })

    await db.addSystemMessage(userId, "success", `Contact "${name}" added successfully`)

    return NextResponse.json({ contact })
  } catch (error) {
    console.error("[CONTACTS API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
