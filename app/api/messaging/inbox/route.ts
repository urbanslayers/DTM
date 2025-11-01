import { telstraAPI } from "@/lib/telstra-api";
import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init";
import { PrismaClient } from "@prisma/client";
import type { InboxMessage, Message } from "@/lib/types";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[INBOX API] GET /api/messaging/inbox called");

    // Parse query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const folder = url.searchParams.get("folder");
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;
    const direction = url.searchParams.get("direction") || "incoming";
    const reverse = url.searchParams.get("reverse") === "true";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Log API call
    await db.logAPICall(userId, "/api/messaging/inbox", "GET", Math.random() * 100 + 50, 200)

    const prisma = new PrismaClient();
    let messages: any[] = [];

    try {
      const requestingUser = await db.getUserById(userId)
      const isAdmin = requestingUser && requestingUser.role === 'admin'

      if (direction === "outgoing") {
        console.log("[INBOX API] Getting sent messages for user:", userId, "admin?", isAdmin)
        let sentMessages = await prisma.message.findMany({
          where: isAdmin ? undefined : { userId: userId },
          orderBy: { createdAt: 'desc' }
        })
        console.log("[INBOX API] Found sent messages (pre-filter):", sentMessages.length)

        const virtualSet = new Set<string>()
        try {
          const vResult = await telstraAPI.getVirtualNumbers({ limit: 200, offset: 0 })
          if (vResult?.success && vResult.data && Array.isArray(vResult.data.virtualNumbers)) {
            for (const vn of vResult.data.virtualNumbers) {
              const num = String(vn.virtualNumber || vn.virtualNumberString || vn.virtual_number || vn.virtualnumber || "")
              const digits = num.replace(/\D/g, "")
              if (digits) virtualSet.add(digits.slice(-9))
            }
          }
        } catch (vErr) {
          console.warn('[INBOX API] Failed to fetch virtual numbers for outgoing filter:', vErr)
        }

        if (virtualSet.size > 0) {
          sentMessages = sentMessages.filter((m: any) => {
            const from = String(m.from || "")
            const digits = from.replace(/\D/g, "").slice(-9)
            return digits && virtualSet.has(digits)
          })
        }

        console.log("[INBOX API] Sent messages after virtual-number filter:", sentMessages.length)

        messages = sentMessages.map((msg: any) => ({
          messageId: msg.id,
          to: msg.to,
          from: msg.from || '+61487654321', // Default from number if not set
          messageContent: msg.content,
          status: msg.status,
          createTimestamp: msg.createdAt,
          sentTimestamp: msg.sentAt,
          receivedTimestamp: msg.deliveredAt,
        }))
        console.log("[INBOX API] Transformed messages:", messages.length)
      } else { // direction === "incoming"
        console.log("[INBOX API] Getting inbox messages for user:", userId, "admin?", isAdmin)
        const findOpts: any = { orderBy: { receivedAt: 'desc' } }
        if (!isAdmin) findOpts.where = { userId: userId }
        messages = await prisma.inboxMessage.findMany(findOpts)
        console.log("[INBOX API] Found inbox messages in DB:", messages.length)

        // Attempt to fetch incoming provider messages (Telstra) and merge them in
        let providerMessages: any[] = []
        try {
          console.log("[INBOX API] Attempting to fetch Telstra provider messages");
          const targetCount = Math.max(limit || 50, 50)
          const pageSize = 5
          let fetched = 0
          let pageOffset = 0
          const fetchedMsgs: any[] = []

          while (fetched < targetCount) {
            try {
              const telstraResult = await telstraAPI.getMessages({ direction: "incoming", limit: pageSize, offset: pageOffset })
              console.log("[INBOX API] Telstra raw response:", JSON.stringify(telstraResult, null, 2));
              const page = telstraResult && Array.isArray(telstraResult.messages) ? telstraResult.messages : []
              if (page.length === 0) {
                break
              }

              for (const m of page) {
                const pm = {
                  id: m.messageId || m.id || `telstra-${m.messageId || Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                  userId: userId,
                  from: m.from || m.fromAddress || m.fromNumber || m.sender || "Unknown",
                  to: m.to || m.toAddress || m.toNumber || m.destination || "",
                  subject: m.subject || null,
                  content: m.messageContent || m.content || m.message || "",
                  type: m.type || "sms",
                  receivedAt: m.receivedTimestamp ? new Date(m.receivedTimestamp) : m.receivedAt ? new Date(m.receivedAt) : new Date(),
                  read: false,
                  folder: "personal",
                  _raw: m,
                }
                fetchedMsgs.push(pm)
              }

              fetched += page.length
              pageOffset += pageSize

              if (page.length < pageSize) break
            } catch (pageErr) {
              console.error('[INBOX API] Error paging Telstra messages at offset', pageOffset, pageErr)
              break
            }
          }

          providerMessages = fetchedMsgs
          console.log("[INBOX API] Telstra provider messages fetched (paged):", providerMessages.length)
        } catch (err) {
          console.error('[INBOX API] Failed to fetch Telstra provider messages:', err)
        }

        // Persist provider messages into DB for future queries, avoiding duplicates
        try {
          const existingIds = new Set(messages.map((msg: any) => msg.id || msg.messageId))
          const toCreate = providerMessages.filter((pm) => !existingIds.has(pm.id))
          for (const pm of toCreate) {
            try {
              await prisma.inboxMessage.create({
                data: {
                  id: pm.id,
                  userId: userId,
                  from: pm.from,
                  to: pm.to,
                  subject: pm.subject,
                  content: pm.content,
                  type: pm.type,
                  receivedAt: pm.receivedAt,
                  read: false,
                  folder: pm.folder || 'personal',
                }
              })
              messages.push(pm)
            } catch (createErr) {
              console.warn('[INBOX API] Failed to persist provider message:', pm.id, createErr)
            }
          }
          if (providerMessages.length > 0) console.log('[INBOX API] Merged and persisted provider messages, total:', messages.length)
        } catch (persistErr) {
          console.error('[INBOX API] Error persisting provider messages:', persistErr)
        }
      }

      // Sort merged messages by receivedAt descending
      if (messages && messages.length > 0) {
        messages = messages.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      }

      if (folder && folder !== "all") {
        messages = messages.filter((msg: any) => msg.folder === folder)
      }

      const totalCount = messages.length
      const page = messages.slice(offset, offset + limit)

      return NextResponse.json({
        success: true,
        messages: page,
        totalCount,
        paging: {
          totalCount,
          limit,
          offset,
          previousPage: offset > 0,
          nextPage: offset + limit < totalCount,
        },
      })
    } catch (error) {
      console.error("[INBOX API] Database or processing error:", error)
      return NextResponse.json({ success: false, error: "Database or processing error" }, { status: 500 })
    } finally {
      try {
        await prisma.$disconnect();
      } catch (dErr) {
        console.warn('[INBOX API] Failed to disconnect Prisma client:', dErr)
      }
    }
  } catch (error: any) {
    console.error("[INBOX API] Top-level error:", error && error.stack ? error.stack : error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: false, error: "Internal server error", detail: error && error.stack ? error.stack : String(error) }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
