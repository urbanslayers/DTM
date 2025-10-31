import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, contacts } = body

    if (!userId || !Array.isArray(contacts)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/contacts/import", "POST", Math.random() * 100 + 50, 201)

    const created: any[] = []
    for (const c of contacts) {
      // Basic validation
      if (!c.name || c.phoneNumber === undefined || c.phoneNumber === null) continue
      try {
        // Normalize phone number: treat input as string, trim, strip accidental whitespace.
        let phoneRaw = String(c.phoneNumber).trim()

        // If Excel/Sheets removed a leading zero (common for numbers entered as numeric),
        // attempt a best-effort recovery: if the value contains only digits and does not
        // start with '0' or '+' and has length 9 (common for AU mobiles missing leading 0),
        // prepend a '0'. This is a conservative heuristic and can be adjusted per-country.
        const digitsOnly = phoneRaw.replace(/\D/g, '')
        if (!phoneRaw.startsWith('+') && !phoneRaw.startsWith('0') && digitsOnly.length === 9) {
          phoneRaw = '0' + digitsOnly
        } else {
          // Otherwise prefer the provided value but normalize common formatting
          if (!phoneRaw.startsWith('+')) {
            // Replace non-digit characters but preserve leading '+' if present
            phoneRaw = phoneRaw.replace(/[^0-9+]/g, '')
          }
        }

        const ct = await db.addContact({
          userId,
          name: c.name.trim(),
          phoneNumber: phoneRaw,
          email: c.email ? String(c.email).trim() : undefined,
          category: c.category || 'personal',
        })
        created.push(ct)
      } catch (e) {
        console.warn('[CONTACT IMPORT] failed to add contact', c, e)
      }
    }

    await db.addSystemMessage(userId, "success", `Imported ${created.length} contact(s)`)

    return NextResponse.json({ created })
  } catch (error) {
    console.error("[CONTACT IMPORT API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
