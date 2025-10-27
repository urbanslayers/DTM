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

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/contacts", "GET", Math.random() * 100 + 50, 200)

    let contacts = await db.getContactsByUserId(userId)

    if (category && category !== "all") {
      contacts = contacts.filter((contact: any) => contact.category === category)
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
