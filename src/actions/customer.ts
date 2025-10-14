"use server";

import { db } from "@/drizzle/db";
import { queueSpot, reservation } from "@/drizzle/schema";
import {
  joinQueueSchema,
  createReservationSchema,
  joinReservationSchema,
} from "@/lib/validations/queue";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import {
  customerHasQueueSpot,
  findFirstAvailableSpot,
  getOrCreateCustomer,
  getAvailableSpotCount,
  generateReservationId,
  generateReservationCode,
  calculateReservationExpiry,
} from "@/lib/utils/queue-operations";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Join a queue
export async function joinQueue(params: unknown): Promise<ApiResponse> {
  try {
    const validationResult = joinQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { queueId, customerData } = validationResult.data;

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customerData.studentId);
    if (hasSpot) {
      return {
        success: false,
        error: "You are already in a queue",
      };
    }

    // Find first available spot
    const spot = await findFirstAvailableSpot(queueId);
    if (!spot) {
      return {
        success: false,
        error: "No available spots in this queue",
      };
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Assign customer to spot
    const [updatedSpot] = await db
      .update(queueSpot)
      .set({
        customerId: customer.studentId,
        status: "occupied",
        occupiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueSpot.id, spot.id))
      .returning();

    // Fetch the complete spot with relations
    const completeSpot = await db.query.queueSpot.findFirst({
      where: eq(queueSpot.id, updatedSpot.id),
      with: {
        queue: {
          with: {
            hauntedHouse: true,
          },
        },
      },
    });

    return {
      success: true,
      data: completeSpot,
    };
  } catch (error) {
    console.error("Error joining queue:", error);
    return {
      success: false,
      error: "Failed to join queue",
    };
  }
}

// Leave queue
export async function leaveQueue(params: {
  studentId: string;
}): Promise<ApiResponse> {
  try {
    const { studentId } = params;

    if (!studentId) {
      return {
        success: false,
        error: "Student ID is required",
      };
    }

    // Find customer's current spot
    const spot = await db.query.queueSpot.findFirst({
      where: eq(queueSpot.customerId, studentId),
      with: {
        reservation: true,
      },
    });

    if (!spot) {
      return {
        success: false,
        error: "You are not in any queue",
      };
    }

    // If customer is part of a reservation
    if (spot.reservationId && spot.reservation) {
      const isRepresentative =
        spot.reservation.representativeCustomerId === studentId;

      if (isRepresentative) {
        // If representative leaves, cancel the entire reservation
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

        await db
          .update(reservation)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, spot.reservationId));
      } else {
        // Regular member leaves
        await db
          .update(queueSpot)
          .set({
            customerId: null,
            status: "reserved",
            occupiedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, spot.id));

        await db
          .update(reservation)
          .set({
            currentSpots: sql`${reservation.currentSpots} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, spot.reservationId));
      }
    } else {
      // Customer is not part of a reservation
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

    return {
      success: true,
      data: {
        message: "Successfully left the queue",
      },
    };
  } catch (error) {
    console.error("Error leaving queue:", error);
    return {
      success: false,
      error: "Failed to leave queue",
    };
  }
}

// Create reservation
export async function createReservation(params: unknown): Promise<ApiResponse> {
  try {
    const validationResult = createReservationSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { queueId, maxSpots, customerData } = validationResult.data;

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return {
        success: false,
        error: "You are already in a queue",
      };
    }

    // Check reservation attempts
    if (customer.reservationAttempts >= 2) {
      return {
        success: false,
        error: "Maximum reservation attempts reached (2 attempts allowed)",
      };
    }

    // Check if queue has enough available spots
    const availableCount = await getAvailableSpotCount(queueId);
    if (availableCount < maxSpots) {
      return {
        success: false,
        error: `Not enough available spots. Only ${availableCount} spots available.`,
      };
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
      currentSpots: 1,
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

    return {
      success: true,
      data: completeReservation,
    };
  } catch (error) {
    console.error("Error creating reservation:", error);
    return {
      success: false,
      error: "Failed to create reservation",
    };
  }
}

// Join reservation
export async function joinReservation(params: unknown): Promise<ApiResponse> {
  try {
    const validationResult = joinReservationSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { code, customerData } = validationResult.data;

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return {
        success: false,
        error: "You are already in a queue",
      };
    }

    // Find reservation by code
    const reservationData = await db.query.reservation.findFirst({
      where: eq(reservation.code, code.toUpperCase()),
    });

    if (!reservationData) {
      return {
        success: false,
        error: "Invalid reservation code",
      };
    }

    // Check if reservation is active
    if (reservationData.status !== "active") {
      return {
        success: false,
        error: `Reservation is ${reservationData.status}`,
      };
    }

    // Check if reservation has expired
    if (new Date() > reservationData.expiresAt) {
      return {
        success: false,
        error: "Reservation has expired",
      };
    }

    // Check if reservation is full
    if (reservationData.currentSpots >= reservationData.maxSpots) {
      return {
        success: false,
        error: "Reservation is full",
      };
    }

    // Find a reserved spot for this reservation that's not occupied
    const spot = await db.query.queueSpot.findFirst({
      where: and(
        eq(queueSpot.reservationId, reservationData.id),
        isNull(queueSpot.customerId)
      ),
    });

    if (!spot) {
      return {
        success: false,
        error: "No available spots in this reservation",
      };
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

    // Update reservation
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

    return {
      success: true,
      data: completeSpot,
    };
  } catch (error) {
    console.error("Error joining reservation:", error);
    return {
      success: false,
      error: "Failed to join reservation",
    };
  }
}
