import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export async function GET(request: NextRequest) {
  try {
    const state = db.getDatabaseState()

    return NextResponse.json({
      success: true,
      state,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DEBUG API] Error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    )
  }
}
