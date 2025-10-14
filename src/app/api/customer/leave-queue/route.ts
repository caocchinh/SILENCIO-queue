import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queueSpot, reservation } from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// POST /api/customer/leave-queue - Leave current queue spot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID is required",
        },
        { status: 400 }
      );
    }

    // Find customer's current spot
    const spot = await db.query.queueSpot.findFirst({
      where: eq(queueSpot.customerId, studentId),
      with: {
        reservation: true,
      },
    });

    if (!spot) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not in any queue",
        },
        { status: 400 }
      );
    }

    // If customer is part of a reservation
    if (spot.reservationId && spot.reservation) {
      const isRepresentative =
        spot.reservation.representativeCustomerId === studentId;

      if (isRepresentative) {
        // If representative leaves, cancel the entire reservation
        // Release all spots in this reservation
        await db
          .update(queueSpot)
          .set({
            customerId: null,
            reservationId: null,
            status: "available",
            occupiedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.reservationId, spot.reservationId));

        // Mark reservation as cancelled
        await db
          .update(reservation)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, spot.reservationId));
      } else {
        // Regular member leaves - just release their spot and decrement count
        await db
          .update(queueSpot)
          .set({
            customerId: null,
            status: "reserved", // Keep it reserved for others
            occupiedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, spot.id));

        // Decrement current spots in reservation
        await db
          .update(reservation)
          .set({
            currentSpots: sql`${reservation.currentSpots} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, spot.reservationId));
      }
    } else {
      // Customer is not part of a reservation - just release the spot
      await db
        .update(queueSpot)
        .set({
          customerId: null,
          status: "available",
          occupiedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(queueSpot.id, spot.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Successfully left the queue",
      },
    });
  } catch (error) {
    console.error("Error leaving queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to leave queue",
      },
      { status: 500 }
    );
  }
}
