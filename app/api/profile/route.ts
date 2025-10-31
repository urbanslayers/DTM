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

    const updates = await request.json();

    // Log API call
    await db.logAPICall(userId, "/api/profile", "PUT", Math.random() * 100 + 50, 200)

    // Basic validation/sanitization
    const allowed: any = {};
    if (typeof updates.personalMobile === 'string') allowed.personalMobile = updates.personalMobile;
    if (typeof updates.email === 'string') allowed.email = updates.email;
    if (typeof updates.displayName === 'string') allowed.displayName = updates.displayName;
    if (typeof updates.timezone === 'string') allowed.timezone = updates.timezone;
    if (typeof updates.language === 'string') allowed.language = updates.language;

    const updatedUser = await db.updateUser(userId, allowed as any)

    if (updatedUser) {
      await db.addSystemMessage(userId, "success", "Profile updated successfully")
      return NextResponse.json(updatedUser)
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
  } catch (err) {
    console.error('[PROFILE API] Error updating profile', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const userId = token.startsWith("user_") ? token.slice("user_".length) : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.logAPICall(userId, "/api/profile", "GET", Math.random() * 100 + 50, 200)

    const user = await db.getUserById(userId)
    if (user) return NextResponse.json(user)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  } catch (err) {
    console.error('[PROFILE API] Error fetching profile', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
