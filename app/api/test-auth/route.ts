import { NextResponse } from "next/server";
import { telstraAPI } from "@/lib/telstra-api";

export async function GET() {
  try {
    console.log("[Test Auth] Testing Telstra API authentication");

    const authResult = await telstraAPI.authenticate();

    if (authResult) {
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
        accessToken: telstraAPI['accessToken'] ? "Token received" : "No token"
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Authentication failed",
        error: "Check server logs for details"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[Test Auth] Error:", error);
    return NextResponse.json({
      success: false,
      message: "Authentication error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
