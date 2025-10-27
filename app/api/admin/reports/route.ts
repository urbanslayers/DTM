import { NextResponse } from "next/server";
import { reportsService } from "@/lib/reports-service";

export async function GET() {
  const reports = await reportsService.getAllReports();
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = await reportsService.createReport(body);
  return NextResponse.json(result);
} 