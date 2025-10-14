import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queueSpot, reservation } from "@/drizzle/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

type Params = Promise<{ reservationId: string }>;

// POST /api/admin/reservations/[reservationId]/cancel - Cancel a reservation (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
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

    const { reservationId } = await params;

    // Check if reservation exists
    const reservationData = await db.query.reservation.findFirst({
      where: eq(reservation.id, reservationId),
    });

    if (!reservationData) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found",
        },
        { status: 404 }
      );
    }

    if (reservationData.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel ${reservationData.status} reservation`,
        },
        { status: 400 }
      );
    }

    // Release all spots
    await db
      .update(queueSpot)
      .set({
        customerId: null,
        reservationId: null,
        status: "available",
        occupiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(queueSpot.reservationId, reservationId));

    // Mark reservation as cancelled
    const [cancelled] = await db
      .update(reservation)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(reservation.id, reservationId))
      .returning();

    return NextResponse.json({
      success: true,
      data: cancelled,
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cancel reservation",
      },
      { status: 500 }
    );
  }
}

