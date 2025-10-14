import { NextRequest, NextResponse } from "next/server";
import { expireReservations } from "@/lib/utils/queue-operations";

// GET /api/cron/expire-reservations - Background job to expire reservations
// This should be called periodically (e.g., every minute) by a cron service like Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const expiredCount = await expireReservations();

    return NextResponse.json({
      success: true,
      data: {
        message: `Expired ${expiredCount} reservation(s)`,
        count: expiredCount,
      },
    });
  } catch (error) {
    console.error("Error expiring reservations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to expire reservations",
      },
      { status: 500 }
    );
  }
}

