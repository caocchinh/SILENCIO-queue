import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { reservation } from "@/drizzle/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

// GET /api/admin/reservations - Get all reservations (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Admin access required",
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const reservations = await db.query.reservation.findMany({
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
    });

    return NextResponse.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reservations",
      },
      { status: 500 }
    );
  }
}

