import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.TELSTRA_CLIENT_ID
    const clientSecret = process.env.TELSTRA_CLIENT_SECRET

    // Debug logging
    console.log("clientId:", clientId)
    console.log("clientSecret:", clientSecret)

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "server_error", error_description: "Missing server credentials" },
        { status: 500 }
      )
    }

    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", clientId)
    params.append("client_secret", clientSecret)
    params.append("scope", "free-trial-numbers:read free-trial-numbers:write messages:read messages:write virtual-numbers:read virtual-numbers:write reports:read reports:write")

    console.log("Making OAuth request with params:", params.toString())

    const telstraRes = await fetch("https://products.api.telstra.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      body: params,
    })

    const data = await telstraRes.json()
    // Debug logging
    console.log("Telstra API response:", data)
    console.log("Request timestamp:", new Date().toISOString())

    if (!telstraRes.ok) {
      return NextResponse.json(data, { status: telstraRes.status })
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "server_error", error_description: "Internal server error" }, { status: 500 })
  }
}