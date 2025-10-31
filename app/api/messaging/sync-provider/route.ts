import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import { telstraAPI } from "@/lib/telstra-api"
import { PrismaClient } from "@prisma/client"

export const dynamic = 'force-dynamic'

// Endpoint to force a sync from the Telstra provider and persist any new inbound messages.
// This is intended to be called by the client after sends or manually when the UI needs an urgent refresh.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse optional body for userId/limit
    const body = await request.json().catch(() => ({}))
    const userId = body?.userId || new URL(request.url).searchParams.get('userId')
    const limit = Number(body?.limit || 100)

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/messaging/sync-provider", "POST", Math.random() * 100 + 50, 200)

    const prisma = new PrismaClient()

    // Page through Telstra provider messages (incoming) and persist any not already stored.
    const pageSize = 20
    let offset = 0
    let fetched = 0
    let totalCreated = 0

    while (fetched < limit) {
      try {
        const res = await telstraAPI.getMessages({ direction: 'incoming', limit: pageSize, offset })
        const page = Array.isArray(res?.messages) ? res.messages : (res?.data?.messages || [])
        if (!page || page.length === 0) break

        // Map provider messages to inbox shape
        const toCreate: any[] = []
        for (const m of page) {
          const id = m.messageId || m.id || `telstra-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
          const pm = {
            id,
            userId,
            from: m.from || m.fromAddress || m.fromNumber || m.sender || 'Unknown',
            to: m.to || m.toAddress || m.toNumber || m.destination || '',
            subject: m.subject || null,
            content: m.messageContent || m.content || m.message || '',
            type: m.type || 'sms',
            receivedAt: m.receivedTimestamp ? new Date(m.receivedTimestamp) : (m.receivedAt ? new Date(m.receivedAt) : new Date()),
            read: false,
            folder: 'personal',
            _raw: m,
          }
          toCreate.push(pm)
        }

        // Avoid duplicates: check existing IDs
        const existing = await prisma.inboxMessage.findMany({ where: { id: { in: toCreate.map((t) => t.id) } }, select: { id: true } })
        const existingIds = new Set(existing.map((e) => e.id))

        for (const pm of toCreate) {
          if (existingIds.has(pm.id)) continue
          try {
            await prisma.inboxMessage.create({ data: {
              id: pm.id,
              userId: pm.userId,
              from: pm.from,
              to: pm.to,
              subject: pm.subject,
              content: pm.content,
              type: pm.type,
              receivedAt: pm.receivedAt,
              read: false,
              folder: pm.folder,
            }})
            totalCreated++
          } catch (err) {
            // ignore duplicate/race errors
            console.warn('[SYNC-PROVIDER] Failed to persist message', pm.id, err)
          }
        }

        fetched += page.length
        offset += pageSize
      } catch (err) {
        console.warn('[SYNC-PROVIDER] Error fetching provider page at offset', offset, err)
        break
      }
    }

    await prisma.$disconnect()

    return NextResponse.json({ success: true, created: totalCreated })
  } catch (error) {
    console.error('[SYNC-PROVIDER] Error:', error)
    return NextResponse.json({ success: false, error: (error as any)?.message || 'Internal error' }, { status: 500 })
  }
}
