import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queueSpot, reservation } from "@/drizzle/schema";
import { createReservationSchema } from "@/lib/validations/queue";
import { eq, and } from "drizzle-orm";
import {
  customerHasQueueSpot,
  getAvailableSpotCount,
  getOrCreateCustomer,
  generateReservationId,
  generateReservationCode,
  calculateReservationExpiry,
} from "@/lib/utils/queue-operations";
import { asc } from "drizzle-orm";

// POST /api/customer/create-reservation - Create a reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createReservationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { queueId, maxSpots, customerData } = validationResult.data;

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

    // Check reservation attempts
    if (customer.reservationAttempts >= 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum reservation attempts reached (2 attempts allowed)",
        },
        { status: 400 }
      );
    }

    // Check if queue has enough available spots
    const availableCount = await getAvailableSpotCount(queueId);
    if (availableCount < maxSpots) {
      return NextResponse.json(
        {
          success: false,
          error: `Not enough available spots. Only ${availableCount} spots available.`,
        },
        { status: 400 }
      );
    }

    // Generate unique reservation code
    let code = generateReservationCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query.reservation.findFirst({
        where: eq(reservation.code, code),
      });
      if (!existing) break;
      code = generateReservationCode();
      attempts++;
    }

    const reservationId = generateReservationId();
    const expiresAt = calculateReservationExpiry(maxSpots);

    // Create reservation
    await db.insert(reservation).values({
      id: reservationId,
      queueId,
      representativeCustomerId: customer.studentId,
      code,
      maxSpots,
      currentSpots: 1, // Representative counts as 1
      expiresAt,
      status: "active",
    });

    // Find and reserve spots
    const availableSpots = await db.query.queueSpot.findMany({
      where: and(
        eq(queueSpot.queueId, queueId),
        eq(queueSpot.status, "available")
      ),
      orderBy: asc(queueSpot.spotNumber),
      limit: maxSpots,
    });

    // Mark spots as reserved
    for (const spot of availableSpots) {
      await db
        .update(queueSpot)
        .set({
          reservationId,
          status: "reserved",
          updatedAt: new Date(),
        })
        .where(eq(queueSpot.id, spot.id));
    }

    // Assign representative to first spot
    await db
      .update(queueSpot)
      .set({
        customerId: customer.studentId,
        occupiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueSpot.id, availableSpots[0].id));

    // Fetch complete reservation with relations
    const completeReservation = await db.query.reservation.findFirst({
      where: eq(reservation.id, reservationId),
      with: {
        queue: {
          with: {
            hauntedHouse: true,
          },
        },
        representative: true,
        spots: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: completeReservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create reservation",
      },
      { status: 500 }
    );
  }
}
