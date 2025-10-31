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

  // If userId is provided, return database messages, otherwise return Telstra API messages
  if (userId) {
      // Log API call
      await db.logAPICall(userId, "/api/messaging/inbox", "GET", Math.random() * 100 + 50, 200)

      try {
        let messages: any[] | undefined;
        const prisma = new PrismaClient();

        // If the requesting user is an admin, return messages across all users
        const requestingUser = await db.getUserById(userId)
        const isAdmin = requestingUser && requestingUser.role === 'admin'

        if (direction === "outgoing") {
          // Get sent messages from database using Prisma directly
          // We only want to show sent messages that were sent from the user's virtual numbers.
          console.log("[INBOX API] Getting sent messages for user:", userId, "admin?", isAdmin)
          let sentMessages = await prisma.message.findMany({
            where: isAdmin ? undefined : { userId: userId },
            orderBy: { createdAt: 'desc' }
          })
          console.log("[INBOX API] Found sent messages (pre-filter):", sentMessages.length)

          // Try to retrieve the account virtual numbers and build a normalized set
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

          // If we got virtual numbers, filter sent messages to only those whose `from` matches
          if (virtualSet.size > 0) {
            sentMessages = sentMessages.filter((m: any) => {
              const from = String(m.from || "")
              const digits = from.replace(/\D/g, "").slice(-9)
              return digits && virtualSet.has(digits)
            })
          }

          console.log("[INBOX API] Sent messages after virtual-number filter:", sentMessages.length)

          // Transform sent messages to match expected API format
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
        } else {
          // Get inbox messages from database using Prisma directly
          console.log("[INBOX API] Getting inbox messages for user:", userId, "admin?", isAdmin)
          // Build options object so we don't pass `where: undefined` which can
          // sometimes confuse Prisma. Only include `where` when needed.
          const findOpts: any = { orderBy: { receivedAt: 'desc' } }
          if (!isAdmin) findOpts.where = { userId: userId }
          messages = await prisma.inboxMessage.findMany(findOpts)
          console.log("[INBOX API] Found inbox messages:", messages.length)
        }

  // Also attempt to fetch incoming provider messages (Telstra) and merge them in
        let providerMessages: any[] = []
        try {
          // Only fetch provider messages when asking for incoming direction.
          // But first check whether this user's numbers are actually assigned
          // as Telstra virtual numbers for the account. If not, skip the
          // provider fetch to avoid unnecessary API calls and errors.
            if (direction === "incoming") {
              try {
                const vResult = await telstraAPI.getVirtualNumbers({ limit: 50, offset: 0 })
                const virtualSet = new Set<string>()
                if (vResult?.success && vResult.data && Array.isArray(vResult.data.virtualNumbers)) {
                  for (const vn of vResult.data.virtualNumbers) {
                    const num = String(vn.virtualNumber || vn.virtualNumberString || vn.virtual_number || vn.virtualnumber || "")
                    const digits = num.replace(/\D/g, "")
                    if (digits) virtualSet.add(digits.slice(-9))
                  }
                }

                // Determine if any of the user's allocated numbers match a virtual number
                // Include the user's personal mobile and all contacts (company + personal)
                const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { personalMobile: true } })
                const userNumbers: string[] = []
                if (userRecord?.personalMobile) userNumbers.push(String(userRecord.personalMobile))
                // include all contacts belonging to this user (both company and personal)
                const userContacts = await prisma.contact.findMany({ where: { userId: userId } })
                for (const c of userContacts) {
                  if (c.phoneNumber) userNumbers.push(String(c.phoneNumber))
                }

                const hasVirtual = userNumbers.some((n) => {
                  const d = String(n).replace(/\D/g, "").slice(-9)
                  return d && virtualSet.has(d)
                })

                // Always attempt to fetch provider messages. Previously we skipped this when the
                // user's numbers did not appear in the virtual numbers set which caused some
                // provider messages to never be retrieved or persisted. Fetching regardless
                // ensures we capture inbound messages from the provider and persist them.
                try {
                  // Telstra API appears to cap responses at a small page size (5); page through
                  // results until we have at least the requested limit or a minimum of 50 messages.
                  const targetCount = Math.max(limit || 50, 50)
                  const pageSize = 5
                  let fetched = 0
                  let pageOffset = 0
                  const fetchedMsgs: any[] = []

                  while (fetched < targetCount) {
                    try {
                      const telstraResult = await telstraAPI.getMessages({ direction: "incoming", limit: pageSize, offset: pageOffset })
                      const page = telstraResult && Array.isArray(telstraResult.messages) ? telstraResult.messages : []
                      if (page.length === 0) {
                        // No more messages to page through
                        break
                      }

                      for (const m of page) {
                        const pm = {
                          // Map Telstra message shape into inboxMessage-like shape
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
                      // Advance offset by page size (Telstra appears to paginate by offset)
                      pageOffset += pageSize

                      // Safety: protect from runaway loops
                      if (page.length < pageSize) break
                    } catch (pageErr) {
                      console.warn('[INBOX API] Error paging Telstra messages at offset', pageOffset, pageErr)
                      break
                    }
                  }

                  providerMessages = fetchedMsgs
                  console.log("[INBOX API] Telstra provider messages fetched (paged):", providerMessages.length)
                } catch (err) {
                  console.warn('[INBOX API] Failed to fetch Telstra provider messages:', err)
                }
              } catch (err) {
                console.warn('[INBOX API] Failed to check virtual numbers / fetch Telstra messages:', err)
              }
            }
        } catch (err) {
          console.warn("[INBOX API] Failed to fetch Telstra provider messages:", err)
        }
        // Persist provider messages into DB for future queries, avoiding duplicates
        try {
          messages = messages || []
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
              // Add created record to messages array so response includes it
              messages.push(pm)
            } catch (createErr) {
              // If creation fails (race/duplicate), log and continue
              console.warn('[INBOX API] Failed to persist provider message:', pm.id, createErr)
            }
          }
          // Sort merged messages by receivedAt descending
          if (messages && messages.length > 0) {
            messages = messages.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          }
          if (providerMessages.length > 0) console.log('[INBOX API] Merged and persisted provider messages, total:', messages.length)
        } catch (persistErr) {
          console.error('[INBOX API] Error persisting provider messages:', persistErr)
        } finally {
          try {
            await prisma.$disconnect();
          } catch (dErr) {
            console.warn('[INBOX API] Failed to disconnect Prisma client:', dErr)
          }
        }

        if (folder && folder !== "all") {
          messages = messages.filter((msg: any) => msg.folder === folder)
        }

        // Provide server-side pagination metadata and slice the results
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
        console.error("[INBOX API] Database error:", error)
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
      }
    }

    // Fallback to Telstra API for backward compatibility
    // Fetch real messages from Telstra, filtering for incoming messages only
    let telstraData;
    try {
      // Note: Telstra API seems to have a 5 message limit regardless of requested limit
      // We'll work with this limitation and implement pagination in the frontend
      telstraData = await telstraAPI.getMessages({
        direction: direction as "incoming" | "outgoing",
        limit: Math.min(limit, 5), // Cap at 5 since Telstra API seems to limit to 5
        offset
      });
      console.log("[INBOX API] Telstra API response:", telstraData);
    } catch (error) {
      console.error("[INBOX API] Telstra API failed:", error);
      // getMessages now handles API unavailability gracefully, so this should rarely happen
      telstraData = { messages: [] };
    }

    // Filter for incoming messages (in case Telstra API doesn't filter properly)
    let incomingMessages = telstraData.messages?.filter((msg: any) => msg.direction === "incoming") || [];

    // Add note if no messages due to API limitations
    const note = incomingMessages.length === 0 && telstraData.messages?.length === 0
      ? "Telstra messages API not available - this may be due to API limitations or scope restrictions"
      : undefined;

    // Calculate proper pagination info based on actual results
    const totalMessages = incomingMessages.length;
    const hasNextPage = totalMessages === Math.min(limit, 5); // If we got exactly the limit, there might be more
    const hasPreviousPage = offset > 0;

    return NextResponse.json({
      success: true,
      messages: incomingMessages,
      ...(note && { note }),
      paging: {
        totalCount: totalMessages,
        limit: Math.min(limit, 5),
        offset,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? `/api/messaging/inbox?limit=${limit}&offset=${offset + Math.min(limit, 5)}&direction=${direction}&reverse=${reverse}` : '',
        previousPage: hasPreviousPage ? `/api/messaging/inbox?limit=${limit}&offset=${Math.max(0, offset - Math.min(limit, 5))}&direction=${direction}&reverse=${reverse}` : '',
        lastPage: `/api/messaging/inbox?limit=${limit}&offset=0&direction=${direction}&reverse=${reverse}`
      }
    });
  } catch (error: any) {
    console.error("[INBOX API] Error:", error && error.stack ? error.stack : error);
    // In non-production return the stack to help debugging locally
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: false, error: "Internal server error", detail: error && error.stack ? error.stack : String(error) }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
