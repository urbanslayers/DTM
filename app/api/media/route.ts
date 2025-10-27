import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/media", "GET", Math.random() * 100 + 50, 200)

    const files = await db.getMediaFilesByUserId(userId)

    return NextResponse.json({ files })
  } catch (error) {
    console.error("[MEDIA API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!userId || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Log API call
    await db.logAPICall(userId, "/api/media/upload", "POST", Math.random() * 100 + 50, 201)

    // Convert file to buffer (in a real app, you'd save to storage)
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = `data:${file.type};base64,${buffer.toString('base64')}`

    const mediaFile = await db.addMediaFile({
      userId,
      filename: `${Date.now()}-${file.name}`,
      originalName: file.name,
      size: file.size,
      type: file.type,
      url,
    })

    await db.addSystemMessage(userId, "success", `File "${file.name}" uploaded successfully`)

    return NextResponse.json({ file: mediaFile })
  } catch (error) {
    console.error("[MEDIA API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
