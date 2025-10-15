import { NextRequest, NextResponse } from "next/server";
import { updateReservationsStatus } from "@/server/queue-operations";
import { createApiError, HTTP_STATUS } from "@/constants/errors";
import { verifyCustomerSession } from "@/dal/verifySession";
import { asc, eq } from "drizzle-orm";
import { retryDatabase } from "@/dal/retry";
import { db } from "@/drizzle/db";
import { queueSpot } from "@/drizzle/schema";

// GET /api/customer/my-spot?studentId=xxx - Get customer's current queue spot
export async function GET(request: NextRequest) {
  try {
    // Verify customer session and ticket type
    const customerSession = await verifyCustomerSession();

    if (!customerSession.session) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Valid customer session required"
      );
    }

    if (!customerSession.customer) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Valid customer session required"
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return createApiError(
        "INVALID_INPUT",
        HTTP_STATUS.BAD_REQUEST,
        "Student ID is required"
      );
    }

    // Verify that the studentId matches the authenticated customer
    if (studentId !== customerSession.customer?.studentId) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "You can only view your own queue spot"
      );
    }

    await updateReservationsStatus();

    const spot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
          where: eq(queueSpot.customerId, studentId),
          with: {
            queue: {
              with: {
                hauntedHouse: true,
                spots: {
                  with: {
                    customer: true,
                  },
                  orderBy: asc(queueSpot.spotNumber),
                },
              },
            },
            reservation: {
              with: {
                representative: true,
                spots: {
                  with: {
                    customer: true,
                  },
                  orderBy: asc(queueSpot.spotNumber),
                },
              },
            },
          },
        }),
      "get customer queue spot"
    );

    if (!spot) {
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        { status: HTTP_STATUS.OK }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: spot,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching customer spot:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch customer spot"
    );
  }
}
