import { NextResponse, type NextRequest } from "next/server";
import { telstraAPI } from "@/lib/telstra-api";
import { autoDb as db } from "@/lib/database-init";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
  const phoneNumbers = searchParams.get("phoneNumbers")?.split(",") || [];
  const matchFromOnly = searchParams.get("matchFromOnly") === 'true'
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    // If userId is provided, return database messages, otherwise return Telstra API messages
    if (userId) {
      // Log API call
      await db.logAPICall(userId, "/api/messaging/messages", "GET", Math.random() * 100 + 50, 200)

      // If the requesting user is an admin, return all messages; otherwise return scoped messages
      let messages: any[] = []
      try {
        const requestingUser = await db.getUserById(userId)
        if (requestingUser && requestingUser.role === 'admin') {
          // Admin: fetch all messages across users
          const { PrismaClient } = await import('@prisma/client')
          const prisma = new PrismaClient()
          const allMsgs = await prisma.message.findMany({ orderBy: { createdAt: 'desc' } })
          await prisma.$disconnect()
          // Use the same safe normalization for stored recipients
          const safeMap = (msg: any) => ({
            id: msg.id,
            userId: msg.userId,
            to: Array.isArray(msg.to) ? msg.to : (typeof msg.to === 'string' ? msg.to : []),
            from: msg.from || undefined,
            content: msg.content,
            type: msg.type,
            status: msg.status,
            credits: msg.credits,
            isTemplate: msg.isTemplate,
            createdAt: msg.createdAt,
            sentAt: msg.sentAt || undefined,
            deliveredAt: msg.deliveredAt || undefined,
            scheduledAt: msg.scheduledAt || undefined,
            templateName: msg.templateName || undefined,
          })

          messages = allMsgs.map(safeMap)
        } else {
          messages = await db.getMessagesByUserId(userId)
        }
      } catch (e) {
        console.warn('[MESSAGES API] Could not determine user role; falling back to scoped messages', e)
        messages = await db.getMessagesByUserId(userId)
      }

      if (status) {
        const statusList = status.split(',')
        messages = messages.filter((msg: any) => statusList.includes(msg.status))
      }

      // Helper: safely normalize a stored "to" value to an array of recipients
      const normalizeStoredRecipients = (val: any): string[] => {
        if (!val) return []
        if (Array.isArray(val)) return val
        if (typeof val === 'string') {
          const s = val.trim()
          // If it looks like JSON array, try to parse, but fall back to raw string
          if (s.startsWith('[')) {
            try {
              const parsed = JSON.parse(s)
              return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
            } catch (e) {
              return [s]
            }
          }
          // Plain single phone number string
          return [s]
        }
        // Fallback for other types
        try {
          return [String(val)]
        } catch (e) {
          return []
        }
      }

      // Filter messages based on user's allocated phone numbers if provided
      if (phoneNumbers.length > 0) {
        const normalize = (n: string) => {
          if (!n) return ''
          const digits = n.replace(/\D/g, '')
          if (digits.startsWith('61')) return '0' + digits.slice(2)
          if (digits.startsWith('0')) return digits
          return digits
        }

        const normalizedPhones = phoneNumbers.map(normalize).filter(Boolean)

        if (matchFromOnly) {
          // When the caller explicitly requests matchFromOnly, only match messages
          // whose sender (from) equals one of the provided numbers. This makes the
          // Sent Messages view more accurate (only messages sent from the user's
          // allocated number), and prevents inbound messages from being mixed in.
          messages = messages.filter((msg: any) => {
            const fromNr = normalize(msg.from || "")
            return fromNr && normalizedPhones.includes(fromNr)
          })
        } else {
          // Default: match messages where either the sender (from) or any recipient (to)
          messages = messages.filter((msg: any) => {
            const fromNr = normalize(msg.from || "")
            if (fromNr && normalizedPhones.includes(fromNr)) return true

            const msgRecipients = normalizeStoredRecipients(msg.to)
            return msgRecipients.some((recipient: string) => {
              const nr = normalize(recipient)
              return normalizedPhones.includes(nr)
            })
          })
        }
      }

      // Transform DB message shape to the API shape expected by the Sent Messages UI
      const transformed = messages.map((msg: any) => {
        const recipients = normalizeStoredRecipients(msg.to)
        return {
          messageId: msg.id,
          to: recipients.join(', '),
          messageContent: msg.content,
          status: msg.status,
          createTimestamp: msg.createdAt,
          sentTimestamp: msg.sentAt || msg.createdAt,
          receivedTimestamp: msg.deliveredAt || null,
          from: msg.from || null,
          credits: msg.credits || 0,
        }
      })

      // Compute pagination: total count then slice to the requested page
      const totalCount = transformed.length
      const start = Math.max(0, offset)
      const end = Math.max(0, offset + limit)
      const page = transformed.slice(start, end)

      return NextResponse.json({ messages: page, totalCount })
    }

    // Fallback to Telstra API for backward compatibility
    const result = await telstraAPI.getMessages({
      limit,
      offset,
    });

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[MESSAGES API] Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  const body = await request.json()
  const { to, content, type, status, credits, isTemplate, templateName, userId, from } = body

    if (!userId || !to || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/messaging/messages", "POST", Math.random() * 100 + 50, 201)

    const message = await db.addMessage({
      userId,
      to,
      from: from || null,
      content,
      type: type || "sms",
      status: status || "sent",
      credits: credits || 1,
      isTemplate: isTemplate || false,
      templateName,
    })

    await db.addSystemMessage(userId, "success", `Message saved successfully`)

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[MESSAGES API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
