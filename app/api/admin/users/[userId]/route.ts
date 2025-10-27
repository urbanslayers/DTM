import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize database
    await db.initialize()

    const { userId } = params
    const user = await db.getUserById(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log API call
    await db.logAPICall(userId, `/api/admin/users/${userId}`, "GET", Math.random() * 100 + 50, 200)

    return NextResponse.json({
      ...user,
      password: undefined, // Never return password
    })
  } catch (error) {
    console.error("[USER API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize database
    await db.initialize()

    const { userId } = params
    const body = await request.json()
    const { username, email, role, credits, isActive } = body

    const updatedUser = await db.updateUser(userId, {
      username,
      email,
      role,
      credits,
      isActive,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...updatedUser,
      password: undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize database
    await db.initialize()

    const { userId } = params
    const deleted = await db.deleteUser(userId)

    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
