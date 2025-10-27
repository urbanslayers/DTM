import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    TELSTRA_CLIENT_ID: process.env.TELSTRA_CLIENT_ID ? "Set" : "Not set",
    TELSTRA_CLIENT_SECRET: process.env.TELSTRA_CLIENT_SECRET ? "Set" : "Not set",
    TELSTRA_CLIENT_ID_Value: process.env.TELSTRA_CLIENT_ID,
    TELSTRA_CLIENT_SECRET_Value: process.env.TELSTRA_CLIENT_SECRET,
  });
}
