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
        let messages;
        const prisma = new PrismaClient();

        if (direction === "outgoing") {
          // Get sent messages from database using Prisma directly
          console.log("[INBOX API] Getting sent messages for user:", userId)
          const sentMessages = await prisma.message.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
          })
          console.log("[INBOX API] Found sent messages:", sentMessages.length)

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
          console.log("[INBOX API] Getting inbox messages for user:", userId)
          messages = await prisma.inboxMessage.findMany({
            where: { userId: userId },
            orderBy: { receivedAt: 'desc' }
          })
          console.log("[INBOX API] Found inbox messages:", messages.length)
        }

        await prisma.$disconnect();

        if (folder && folder !== "all") {
          messages = messages.filter((msg: any) => msg.folder === folder)
        }

        return NextResponse.json({ success: true, messages })
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
  } catch (error) {
    console.error("[INBOX API] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
