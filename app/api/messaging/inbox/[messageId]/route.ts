import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/prisma-database";

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expect client-side tokens of the form `Bearer user_<id>` for demo auth
    const token = authHeader.slice(7).trim();
    const userId = token.startsWith("user_") ? token.slice("user_".length) : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = params;
    if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 });

    // Fetch the message to ensure it exists and belongs to the user (or user is admin)
    const msg = await db.getInboxMessageById(messageId);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const requestingUser = await db.getUserById(userId)
    const isAdmin = requestingUser && requestingUser.role === 'admin'

    if (!isAdmin && msg.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.deleteInboxMessage(messageId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[INBOX DELETE API] Error deleting inbox message', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
