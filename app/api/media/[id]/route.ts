import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import type { MediaFile } from "@/lib/types"

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Log API call
    await db.logAPICall("system", "/api/media/[id]", "DELETE", Math.random() * 100 + 50, 200)

    // Get file first to get userId for system message
    const allFiles = await db.getAllMediaFiles()
    const file = allFiles.find((f: MediaFile) => f.id === params.id)

    if (file && await db.deleteMediaFile(params.id)) {
      await db.addSystemMessage(file.userId, "success", `File "${file.originalName}" deleted successfully`)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[MEDIA API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
