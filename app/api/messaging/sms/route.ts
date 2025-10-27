import { NextResponse, type NextRequest } from "next/server";
import { telstraAPI } from "@/lib/telstra-api";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[SMS API] Raw request body:", JSON.stringify(body, null, 2));
    const { to, body: messageBody, from, ...options } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: "Missing required 'to' field" },
        { status: 400 }
      );
    }

    if (!from) {
      return NextResponse.json(
        { error: "Missing required 'from' field. Please provide a virtual number (04xxxxxxxx) or senderName." },
        { status: 400 }
      );
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: "Missing required message body" },
        { status: 400 }
      );
    }

    // Debug environment variables
    console.log("[SMS API] Environment check:");
    console.log("[SMS API] TELSTRA_CLIENT_ID:", process.env.TELSTRA_CLIENT_ID ? "Set" : "Not set");
    console.log("[SMS API] TELSTRA_CLIENT_SECRET:", process.env.TELSTRA_CLIENT_SECRET ? "Set" : "Not set");

    // Handle 'to' field - it comes as array from frontend but Telstra API expects string
    const recipient = Array.isArray(to) ? to[0] : to;

    // Filter options to only include valid Telstra API parameters
    // Convert scheduledAt to scheduleSend format for Telstra API
    const { scheduledAt, ...validTelstraOptions } = options;

    // If scheduledAt is provided, convert it to scheduleSend format for Telstra API
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      // Telstra API expects ISO format in GMT (Z suffix)
      validTelstraOptions.scheduleSend = scheduledDate.toISOString();
    }

    // Use the telstraAPI service which handles authentication
    const result = await telstraAPI.sendSMS(recipient, messageBody, { from, ...validTelstraOptions });

    if (result.success) {
      console.log("[SMS API] Message sent successfully:", result.data);
      return NextResponse.json(result.data);
    } else {
      console.error("[SMS API] Failed to send SMS:", result.error);
      // Return detailed error information including the raw API response
      return NextResponse.json(
        {
          error: "sms_send_failed",
          error_description: result.error,
          details: "Telstra API call failed - check server logs for detailed response",
          recipient: recipient,
          messageLength: messageBody.length,
          options: options
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[SMS API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        error_description: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}