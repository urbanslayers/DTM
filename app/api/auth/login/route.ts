import { type NextRequest, NextResponse } from "next/server"
import { autoDb as db } from "@/lib/database-init"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Username and password are required" },
        { status: 400 }
      )
    }

    console.log(`[LOGIN API] Attempting login for user: ${username}`)

    // Find user by credentials
    const user = await db.getUserByCredentials(username, password)

    if (!user) {
      console.log(`[LOGIN API] No user found for username: ${username}`)

      // Debug: Check all users in database
      const allUsers = await db.getAllUsers()
      console.log(`[LOGIN API] Available users in database: ${allUsers.map((u: any) => `${u.username}(${u.id})`).join(', ')}`)

      // Add better debugging to find the issue
      const foundUser = allUsers.find((u: any) => u.username === username)
      if (foundUser) {
        console.log(`[LOGIN API] User found but password mismatch:`)
        console.log(`[LOGIN API] Provided password: ${password}`)
        console.log(`[LOGIN API] Stored password: [REDACTED FOR SECURITY]`)
        console.log(`[LOGIN API] User is active: ${foundUser.isActive}`)
        console.log(`[LOGIN API] Passwords match: ${password === (foundUser as any).password}`)
      } else {
        console.log(`[LOGIN API] User "${username}" not found in database at all`)
      }

      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid username or password" },
        { status: 401 }
      )
    }

    console.log(`[LOGIN API] User found: ${user.username} (ID: ${user.id})`)

    // Update last login
    user.lastLogin = new Date()
    await db.updateUser(user.id, { lastLogin: user.lastLogin })

    // Log successful login
    await db.addSystemMessage(user.id, "success", "Login successful")

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user

    console.log(`[LOGIN API] Login successful for user: ${user.username}`)
    console.log(`[LOGIN API] User role: ${user.role}`)
    console.log(`[LOGIN API] User data being returned:`, userWithoutPassword)

    return NextResponse.json({
      access_token: `user_${user.id}`,
      token_type: "Bearer",
      user: userWithoutPassword,
      expires_in: 3600, // 1 hour
    })

  } catch (error) {
    console.error("[LOGIN API] Error:", error)
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    )
  }
}
