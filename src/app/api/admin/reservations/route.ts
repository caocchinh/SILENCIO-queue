import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { reservation } from "@/drizzle/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { createApiError, HTTP_STATUS } from "@/constants/errors";
import { retryAuth, retryDatabase } from "@/dal/retry";

// GET /api/admin/reservations - Get all reservations (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await retryAuth(
      async () =>
        await auth.api.getSession({
          headers: await headers(),
        }),
      "admin session check for reservations"
    );

    if (!session?.user || session.user.role !== "admin") {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Admin access required"
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const reservations = await retryDatabase(
      () =>
        db.query.reservation.findMany({
          where: status ? eq(reservation.status, status) : undefined,
          with: {
            queue: {
              with: {
                hauntedHouse: true,
              },
            },
            representative: true,
            spots: {
              with: {
                customer: true,
              },
            },
          },
          orderBy: (reservation, { desc }) => [desc(reservation.createdAt)],
        }),
      "fetch reservations"
    );

    return NextResponse.json(
      {
        success: true,
        data: reservations,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch reservations"
    );
  }
}
