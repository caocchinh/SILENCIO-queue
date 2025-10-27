import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { createApiError, HTTP_STATUS } from "@/constants/errors";
import { retryAuth, retryDatabase } from "@/dal/retry";
import { db } from "@/drizzle/db";
import { customer } from "@/drizzle/schema";
import { sql, notInArray, and, not, eq } from "drizzle-orm";
import { UNSUPPORT_TICKET_TYPE } from "@/constants/constants";

// GET /api/customer/without-queue - Get customers without queue spots (admin only)
export async function GET() {
  try {
    // Verify admin session
    const session = await retryAuth(
      async () =>
        await auth.api.getSession({
          headers: await headers(),
        }),
      "admin session verification for without-queue"
    );

    if (!session?.user) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.UNAUTHORIZED,
        "Valid admin session required"
      );
    }

    if (session.user.role !== "admin") {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Admin access required"
      );
    }

    // Find customers who don't have any queue spots and have supported ticket types
    const customersWithoutQueue = await retryDatabase(
      () =>
        db.query.customer.findMany({
          where: and(
            sql`NOT EXISTS (
              SELECT 1 FROM queue_spot
              WHERE queue_spot.customer_id = customer.student_id
            )`,
            notInArray(customer.ticketType, UNSUPPORT_TICKET_TYPE),
            not(eq(customer.email, "chinhcaocu@gmail.com"))
          ),
          orderBy: customer.name,
        }),
      "get customers without queue spots"
    );

    return NextResponse.json(
      {
        success: true,
        data: customersWithoutQueue,
        count: customersWithoutQueue.length,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching customers without queue:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch customers without queue"
    );
  }
}