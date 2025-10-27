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
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    // If userId is provided, return database messages, otherwise return Telstra API messages
    if (userId) {
      // Log API call
      await db.logAPICall(userId, "/api/messaging/messages", "GET", Math.random() * 100 + 50, 200)

      let messages = await db.getMessagesByUserId(userId)

      if (status) {
        const statusList = status.split(',')
        messages = messages.filter((msg: any) => statusList.includes(msg.status))
      }

      // Filter messages based on user's allocated phone numbers if provided
      if (phoneNumbers.length > 0) {
        messages = messages.filter((msg: any) => {
          const msgRecipients = Array.isArray(msg.to) ? msg.to : JSON.parse(msg.to || '[]')
          return msgRecipients.some((recipient: string) => phoneNumbers.includes(recipient))
        })
      }

      return NextResponse.json({ messages })
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
    const { to, content, type, status, credits, isTemplate, templateName, userId } = body

    if (!userId || !to || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/messaging/messages", "POST", Math.random() * 100 + 50, 201)

    const message = await db.addMessage({
      userId,
      to,
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
