import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export const dynamic = 'force-dynamic'

function csvEscape(value: any) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const templateOnly = searchParams.get('template') === '1' || searchParams.get('template') === 'true'

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/contacts/export", "GET", Math.random() * 100 + 50, 200)

    const headers = ['name','phoneNumber','email','category']

    if (templateOnly) {
      const csv = headers.join(',') + '\n'
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="contacts-template.csv"`,
        }
      })
    }

    // Fetch contacts scoped to user (admin behavior handled by get endpoint)
    const contacts = await db.getContactsByUserId(userId)

    const rows = [headers.join(',')]
    for (const c of contacts) {
      rows.push([
        csvEscape(c.name),
        csvEscape(c.phoneNumber),
        csvEscape(c.email || ''),
        csvEscape(c.category || 'personal')
      ].join(','))
    }

    const csv = rows.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-${userId}.csv"`,
      }
    })
  } catch (error) {
    console.error('[CONTACT EXPORT API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
