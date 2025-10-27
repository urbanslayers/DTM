import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Mock account balance data - no authentication required for internal API
    const response = {
      accountId: "acc_demo_123456",
      balance: {
        amount: 79.6,
        currency: "AUD",
      },
      credits: {
        sms: 796,
        mms: 106,
        voice: 0,
      },
      usage: {
        currentMonth: {
          sms: 204,
          mms: 12,
          totalCost: 20.4,
        },
        lastMonth: {
          sms: 450,
          mms: 28,
          totalCost: 45.5,
        },
      },
      billingCycle: {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        daysRemaining: 7,
      },
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
