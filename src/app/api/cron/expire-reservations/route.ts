import { NextRequest, NextResponse } from "next/server";
import { expireReservations } from "@/server/queue-operations";
import { createApiError, HTTP_STATUS } from "@/constants/errors";

// GET /api/cron/expire-reservations - Background job to expire reservations
// This should be called periodically (e.g., every minute) by a cron service like Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return createApiError("UNAUTHORIZED", HTTP_STATUS.UNAUTHORIZED);
    }

    const expiredCount = await expireReservations();

    return NextResponse.json(
      {
        success: true,
        data: {
          message: `Expired ${expiredCount} reservation(s)`,
          count: expiredCount,
        },
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error expiring reservations:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to expire reservations"
    );
  }
}
