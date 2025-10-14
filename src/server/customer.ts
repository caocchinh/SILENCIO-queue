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
import {
  ActionResponse,
  createActionError,
  createActionSuccess,
} from "@/constants/errors";
import { retryDatabase } from "@/dal/retry";

// Join a queue
export async function joinQueue(params: unknown): Promise<ActionResponse> {
  try {
    const validationResult = joinQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { queueId, customerData } = validationResult.data;

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customerData.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    // Find first available spot
    const spot = await findFirstAvailableSpot(queueId);
    if (!spot) {
      return createActionError("NO_AVAILABLE_SPOTS");
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Assign customer to spot
    const [updatedSpot] = await retryDatabase(
      () =>
        db
          .update(queueSpot)
          .set({
            customerId: customer.studentId,
            status: "occupied",
            occupiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, spot.id))
          .returning(),
      "assign customer to queue spot"
    );

    // Fetch the complete spot with relations
    const completeSpot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
          where: eq(queueSpot.id, updatedSpot.id),
          with: {
            queue: {
              with: {
                hauntedHouse: true,
              },
            },
          },
        }),
      "fetch queue spot with relations"
    );

    return createActionSuccess(completeSpot);
  } catch (error) {
    console.error("Error joining queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to join queue");
  }
}

// Leave queue
export async function leaveQueue(params: {
  studentId: string;
}): Promise<ActionResponse> {
  try {
    const { studentId } = params;

    if (!studentId) {
      return createActionError("INVALID_INPUT", "Student ID is required");
    }

    // Find customer's current spot
    const spot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
          where: eq(queueSpot.customerId, studentId),
          with: {
            reservation: true,
          },
        }),
      "find customer queue spot"
    );

    if (!spot) {
      return createActionError("NOT_IN_QUEUE");
    }

    // If customer is part of a reservation
    if (spot.reservationId && spot.reservation) {
      const isRepresentative =
        spot.reservation.representativeCustomerId === studentId;

      if (isRepresentative) {
        // If representative leaves, cancel the entire reservation
        await retryDatabase(
          () =>
            db
              .update(queueSpot)
              .set({
                customerId: null,
                reservationId: null,
                status: "available",
                occupiedAt: null,
                updatedAt: new Date(),
              })
              .where(eq(queueSpot.reservationId, spot.reservationId)),
          "clear reservation spots"
        );

        await retryDatabase(
          () =>
            db
              .update(reservation)
              .set({
                status: "cancelled",
                updatedAt: new Date(),
              })
              .where(eq(reservation.id, spot.reservationId)),
          "cancel reservation on representative leave"
        );
      } else {
        // Regular member leaves
        await retryDatabase(
          () =>
            db
              .update(queueSpot)
              .set({
                customerId: null,
                status: "reserved",
                occupiedAt: null,
                updatedAt: new Date(),
              })
              .where(eq(queueSpot.id, spot.id)),
          "remove member from reservation spot"
        );

        await retryDatabase(
          () =>
            db
              .update(reservation)
              .set({
                currentSpots: sql`${reservation.currentSpots} - 1`,
                updatedAt: new Date(),
              })
              .where(eq(reservation.id, spot.reservationId)),
          "decrement reservation spot count"
        );
      }
    } else {
      // Customer is not part of a reservation
      await retryDatabase(
        () =>
          db
            .update(queueSpot)
            .set({
              customerId: null,
              status: "available",
              occupiedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(queueSpot.id, spot.id)),
        "clear queue spot"
      );
    }

    return createActionSuccess({
      message: "Successfully left the queue",
    });
  } catch (error) {
    console.error("Error leaving queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to leave queue");
  }
}

// Create reservation
export async function createReservation(
  params: unknown
): Promise<ActionResponse> {
  try {
    const validationResult = createReservationSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { queueId, maxSpots, customerData } = validationResult.data;

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    // Check reservation attempts
    if (customer.reservationAttempts >= 2) {
      return createActionError("MAX_RESERVATION_ATTEMPTS");
    }

    // Check if queue has enough available spots
    const availableCount = await getAvailableSpotCount(queueId);
    if (availableCount < maxSpots) {
      return createActionError(
        "NO_AVAILABLE_SPOTS",
        `Not enough available spots. Only ${availableCount} spots available.`
      );
    }

    // Generate unique reservation code
    let code = generateReservationCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await retryDatabase(
        () =>
          db.query.reservation.findFirst({
            where: eq(reservation.code, code),
          }),
        "check reservation code exists"
      );
      if (!existing) break;
      code = generateReservationCode();
      attempts++;
    }

    const reservationId = generateReservationId();
    const expiresAt = calculateReservationExpiry(maxSpots);

    // Create reservation
    await retryDatabase(
      () =>
        db.insert(reservation).values({
          id: reservationId,
          queueId,
          representativeCustomerId: customer.studentId,
          code,
          maxSpots,
          currentSpots: 1,
          expiresAt,
          status: "active",
        }),
      "create reservation"
    );

    // Find and reserve spots
    const availableSpots = await retryDatabase(
      () =>
        db.query.queueSpot.findMany({
          where: and(
            eq(queueSpot.queueId, queueId),
            eq(queueSpot.status, "available")
          ),
          orderBy: asc(queueSpot.spotNumber),
          limit: maxSpots,
        }),
      "find available spots for reservation"
    );

    // Mark spots as reserved
    for (const spot of availableSpots) {
      await retryDatabase(
        () =>
          db
            .update(queueSpot)
            .set({
              reservationId,
              status: "reserved",
              updatedAt: new Date(),
            })
            .where(eq(queueSpot.id, spot.id)),
        `reserve spot ${spot.spotNumber}`
      );
    }

    // Assign representative to first spot
    await retryDatabase(
      () =>
        db
          .update(queueSpot)
          .set({
            customerId: customer.studentId,
            occupiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, availableSpots[0].id)),
      "assign representative to first spot"
    );

    // Fetch complete reservation with relations
    const completeReservation = await retryDatabase(
      () =>
        db.query.reservation.findFirst({
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
        }),
      "fetch complete reservation"
    );

    return createActionSuccess(completeReservation);
  } catch (error) {
    console.error("Error creating reservation:", error);
    return createActionError("DATABASE_ERROR", "Failed to create reservation");
  }
}

// Join reservation
export async function joinReservation(
  params: unknown
): Promise<ActionResponse> {
  try {
    const validationResult = joinReservationSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { code, customerData } = validationResult.data;

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    // Find reservation by code
    const reservationData = await retryDatabase(
      () =>
        db.query.reservation.findFirst({
          where: eq(reservation.code, code.toUpperCase()),
        }),
      "find reservation by code"
    );

    if (!reservationData) {
      return createActionError("INVALID_RESERVATION_CODE");
    }

    // Check if reservation is active
    if (reservationData.status !== "active") {
      return createActionError(
        "CANNOT_CANCEL_RESERVATION",
        `Reservation is ${reservationData.status}`
      );
    }

    // Check if reservation has expired
    if (new Date() > reservationData.expiresAt) {
      return createActionError("RESERVATION_EXPIRED");
    }

    // Check if reservation is full
    if (reservationData.currentSpots >= reservationData.maxSpots) {
      return createActionError("RESERVATION_FULL");
    }

    // Find a reserved spot for this reservation that's not occupied
    const spot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
          where: and(
            eq(queueSpot.reservationId, reservationData.id),
            isNull(queueSpot.customerId)
          ),
        }),
      "find available spot in reservation"
    );

    if (!spot) {
      return createActionError(
        "NO_AVAILABLE_SPOTS",
        "No available spots in this reservation"
      );
    }

    // Assign customer to spot
    await retryDatabase(
      () =>
        db
          .update(queueSpot)
          .set({
            customerId: customer.studentId,
            occupiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, spot.id)),
      "assign customer to reservation spot"
    );

    // Update reservation
    const newCurrentSpots = reservationData.currentSpots + 1;
    const newStatus =
      newCurrentSpots >= reservationData.maxSpots ? "completed" : "active";

    await retryDatabase(
      () =>
        db
          .update(reservation)
          .set({
            currentSpots: newCurrentSpots,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, reservationData.id)),
      "update reservation status"
    );

    // Fetch complete spot with relations
    const completeSpot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
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
        }),
      "fetch complete spot with reservation"
    );

    return createActionSuccess(completeSpot);
  } catch (error) {
    console.error("Error joining reservation:", error);
    return createActionError("DATABASE_ERROR", "Failed to join reservation");
  }
}
