import { NextResponse } from "next/server";
import { telstraAPI } from "@/lib/telstra-api";

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const { messageId } = params;

    const result = await telstraAPI.getMessageStatus(messageId);

    if (result.success) {
      return NextResponse.json({ success: true, status: result.data?.status || "unknown" });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}