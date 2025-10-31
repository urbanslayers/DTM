import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/prisma-database";

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const userId = token.startsWith("user_") ? token.slice("user_".length) : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.markAllInboxMessagesAsRead(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[INBOX MARK-ALL API] Error marking all messages as read', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
