import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queueSpot, reservation } from "@/drizzle/schema";
import { joinReservationSchema } from "@/lib/validations/queue";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  customerHasQueueSpot,
  getOrCreateCustomer,
} from "@/lib/utils/queue-operations";

// POST /api/customer/join-reservation - Join a reservation with a code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = joinReservationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { code, customerData } = validationResult.data;

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already in a queue",
        },
        { status: 400 }
      );
    }

    // Find reservation by code
    const reservationData = await db.query.reservation.findFirst({
      where: eq(reservation.code, code.toUpperCase()),
    });

    if (!reservationData) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reservation code",
        },
        { status: 404 }
      );
    }

    // Check if reservation is active
    if (reservationData.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `Reservation is ${reservationData.status}`,
        },
        { status: 400 }
      );
    }

    // Check if reservation has expired
    if (new Date() > reservationData.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation has expired",
        },
        { status: 400 }
      );
    }

    // Check if reservation is full
    if (reservationData.currentSpots >= reservationData.maxSpots) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation is full",
        },
        { status: 400 }
      );
    }

    // Find a reserved spot for this reservation that's not occupied
    const spot = await db.query.queueSpot.findFirst({
      where: and(
        eq(queueSpot.reservationId, reservationData.id),
        isNull(queueSpot.customerId)
      ),
    });

    if (!spot) {
      return NextResponse.json(
        {
          success: false,
          error: "No available spots in this reservation",
        },
        { status: 400 }
      );
    }

    // Assign customer to spot
    await db
      .update(queueSpot)
      .set({
        customerId: customer.studentId,
        occupiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueSpot.id, spot.id));

    // Update reservation - increment currentSpots and check if completed
    const newCurrentSpots = reservationData.currentSpots + 1;
    const newStatus =
      newCurrentSpots >= reservationData.maxSpots ? "completed" : "active";

    await db
      .update(reservation)
      .set({
        currentSpots: newCurrentSpots,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(reservation.id, reservationData.id));

    // Fetch complete spot with relations
    const completeSpot = await db.query.queueSpot.findFirst({
      where: eq(queueSpot.id, spot.id),
      with: {
        queue: {
          with: {
            hauntedHouse: true,
          },
        },
        reservation: {
          with: {
            representative: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: completeSpot,
    });
  } catch (error) {
    console.error("Error joining reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to join reservation",
      },
      { status: 500 }
    );
  }
}
