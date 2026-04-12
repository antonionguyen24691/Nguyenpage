import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/adminAuth";
import { getFundSyncJobState } from "@/lib/fundSyncState";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertAdminAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({
    success: true,
    job: await getFundSyncJobState(),
  });
}
