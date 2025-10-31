import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/database";
import { telstraAPI } from "@/lib/telstra-api";
import { wsManager } from "@/lib/websocket-server"

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'

// Webhook endpoint for receiving inbound SMS from provider (or test POSTs).
// Expects JSON: { from: string, to: string, content: string, receivedAt?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, content, receivedAt } = body;

    if (!from || !to || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt to find user that owns the 'to' number
    // Strategy: find user whose personalMobile matches OR who has a contact with that phone
    const normalizedTo = to.replace(/\s+/g, "");

    // Try to find user by personalMobile
    let user = await prisma.user.findFirst({ where: { personalMobile: normalizedTo } });

    // If not found, try to find a contact that matches and get its userId
    if (!user) {
      const contact = await prisma.contact.findFirst({ where: { phoneNumber: normalizedTo } });
      if (contact) {
        user = await prisma.user.findUnique({ where: { id: contact.userId } });
      }
    }

    // If we still don't have a user, reject the webhook - our InboxMessage.userId is non-nullable
    if (!user) {
      console.warn('[INBOUND] No user found for destination number', normalizedTo)
      return NextResponse.json({ success: false, error: 'No matching user for destination number' }, { status: 404 })
    }

    const userId: string = user.id

    // Create inbox message record (userId is required by Prisma schema)
    const inboxMsg = await prisma.inboxMessage.create({
      data: {
        userId: userId,
        from,
        to: normalizedTo,
        content,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        read: false,
        folder: 'personal',
      }
    });

    // Notify connected user in real-time via WebSocket so UI updates immediately
    try {
      wsManager.broadcastToUser(userId, "inbox:new", inboxMsg)
    } catch (err) {
      console.warn('[INBOUND] Failed to broadcast inbox message via WebSocket', err)
    }

    // If we have a user, evaluate rules for that user
    if (userId) {
      try {
        const rules = await db.getRulesByUserId(userId);
        for (const rule of rules) {
          if (!rule.enabled) continue;

          // Currently only support simple 'contains' and 'from' conditions
          const cond = rule.condition;
          let matches = false;
          if (cond.type === 'contains') {
            matches = content.toLowerCase().includes(cond.value.toLowerCase());
          } else if (cond.type === 'from') {
            matches = from.includes(cond.value);
          }

          if (matches) {
            const action = rule.action;
            if (action.type === 'reply') {
              // Send automatic reply using user's personal mobile as sender if available
              const sender = user?.personalMobile || undefined;
              // Use telstraAPI to send SMS back to originator
              if (sender) {
                await telstraAPI.sendSMS(from, action.value, { from: sender });
              }
            }
            // TODO: support forward/delete/folder actions
          }
        }
      } catch (err) {
        console.error('[INBOUND] Rules evaluation failed:', err);
      }
    }

    // Close prisma connection politely
    // (Prisma uses connection pooling; we don't disconnect here to avoid overhead)

    return NextResponse.json({ success: true, message: inboxMsg });
  } catch (error) {
    console.error('[INBOUND] Error processing inbound message:', error);
    return NextResponse.json({ success: false, error: (error as any)?.message || 'Internal error' }, { status: 500 });
  }
}
