import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"
import { wsManager } from "@/lib/websocket-server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: Removed API logging for admin calls to avoid foreign key constraint issues
    // await db.logAPICall("admin", "/api/admin/users", "GET", Math.random() * 100 + 50, 200)

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    const users = await db.getAllUsers()
    let filteredUsers = users

    // Apply filters
    if (search) {
      filteredUsers = filteredUsers.filter(
        (user: any) =>
          user.username.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (role && role !== "all") {
      filteredUsers = filteredUsers.filter((user: any) => user.role === role)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    return NextResponse.json({
      users: paginatedUsers.map((user: any) => ({
        ...user,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        lastLogin: user.lastLogin instanceof Date ? user.lastLogin.toISOString() : user.lastLogin,
        password: undefined, // Don't send passwords
      })),
      totalCount: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / limit),
      currentPage: page,
    })
  } catch (error) {
    wsManager.notifySystemError("Failed to fetch users", { endpoint: "/api/admin/users", error: String(error) })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: Removed API logging for admin calls to avoid foreign key constraint issues
    // await db.logAPICall("admin", "/api/admin/users", "POST", Math.random() * 100 + 50, 201)

    const body = await request.json()
    const { username, email, password, role, credits } = body

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[USER CREATION] Creating user: ${username}, email: ${email}, role: ${role || 'user'}`)
    console.log(`[USER CREATION] Password provided: ${password ? '[PRESENT]' : '[MISSING]'}`)

    try {
      const newUser = await db.createUser({
        username,
        email,
        password,
        role: role || "user",
        credits: credits || 100,
        lastLogin: new Date(),
        isActive: true,
      })

      console.log(`[USER CREATION] Created user with ID: ${newUser.id}`)

      // Verify the user was actually saved
      const savedUsers = await db.getAllUsers()
      console.log(`[USER CREATION] Total users in database: ${savedUsers.length}`)
      console.log(`[USER CREATION] Users: ${savedUsers.map((u: any) => `${u.username}(${u.id})`).join(', ')}`)

      // Check if our new user is in the list
      const userExists = savedUsers.some((u: any) => u.username === username)
      console.log(`[USER CREATION] User ${username} exists in database: ${userExists}`)

      if (!userExists) {
        console.error(`[USER CREATION] ERROR: User ${username} was not found in database after creation!`)
        return NextResponse.json({ error: "Failed to save user to database" }, { status: 500 })
      }

      // Notify via WebSocket
      wsManager.broadcastAlert({
        type: "success",
        title: "User Created",
        message: `New user "${username}" has been created`,
        metadata: { userId: newUser.id, role: newUser.role, credits: newUser.credits },
      })

      return NextResponse.json({
        ...newUser,
        createdAt: newUser.createdAt instanceof Date ? newUser.createdAt.toISOString() : newUser.createdAt,
        lastLogin: newUser.lastLogin instanceof Date ? newUser.lastLogin.toISOString() : newUser.lastLogin,
        password: undefined,
      })
    } catch (error) {
      console.error(`[USER CREATION] Error creating user ${username}:`, error)
      wsManager.notifySystemError("Failed to create user", { endpoint: "/api/admin/users", error: String(error) })
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }
  } catch (error) {
    wsManager.notifySystemError("Failed to create user", { endpoint: "/api/admin/users", error: String(error) })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
