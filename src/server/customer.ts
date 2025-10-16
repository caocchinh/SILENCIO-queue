"use server";

import { db } from "@/drizzle/db";
import {
  queue,
  queueSpot,
  reservation,
  customer as customerSchema,
} from "@/drizzle/schema";
import {
  joinQueueSchema,
  createReservationSchema,
  joinReservationSchema,
} from "@/lib/validations/queue";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import {
  customerHasQueueSpot,
  findFirstAvailableSpot,
  generateReservationId,
  generateReservationCode,
  calculateReservationExpiry,
  updateReservationsStatus,
} from "@/server/queue-operations";
import {
  ActionResponse,
  createActionError,
  createActionSuccess,
} from "@/constants/errors";
import { retryDatabase } from "@/dal/retry";
import { verifyCustomerSession } from "@/dal/verifySession";
import { revalidatePath } from "next/cache";

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

    const { hauntedHouseName, queueNumber, customerData } =
      validationResult.data;

    // Find the queue by composite key
    const queueData = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: and(
            eq(queue.hauntedHouseName, hauntedHouseName),
            eq(queue.queueNumber, queueNumber)
          ),
        }),
      "find queue"
    );

    if (!queueData) {
      return createActionError("NOT_FOUND", "Queue not found");
    }

    // Get or create customer first
    const customerSession = await verifyCustomerSession();

    if (!customerSession.session) {
      return createActionError("UNAUTHORIZED");
    }

    if (!customerSession.customer) {
      return createActionError("UNAUTHORIZED");
    }
    const customer = customerSession.customer;

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customerData.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    // Find first available spot
    const spot = await findFirstAvailableSpot(queueData.id);
    if (!spot) {
      return createActionError("NO_AVAILABLE_SPOTS");
    }

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

    // Verify customer ticket type
    const customerSession = await verifyCustomerSession();
    if (!customerSession.session) {
      return createActionError("UNAUTHORIZED");
    }

    if (!customerSession.customer) {
      return createActionError("UNAUTHORIZED");
    }
    const customer = customerSession.customer;

    if (studentId !== customer.studentId) {
      return createActionError("UNAUTHORIZED");
    }
    // Find customer's current spot
    const spot = await retryDatabase(
      () =>
        db.query.queueSpot.findFirst({
          where: eq(queueSpot.customerId, customer.studentId),
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
        spot.reservation.representativeCustomerId === customer.studentId;

      if (isRepresentative) {
        // If representative leaves, cancel the entire reservation and increment their attempts
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
              .where(eq(queueSpot.reservationId, spot.reservationId!)),
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
              .where(eq(reservation.id, spot.reservationId!)),
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
              .where(eq(reservation.id, spot.reservationId!)),
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

    await updateReservationsStatus();

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

    const {
      hauntedHouseName,
      queueNumber,
      numberOfSpotsForReservation,
      customerData,
    } = validationResult.data;

    const customerSession = await verifyCustomerSession();
    if (!customerSession.session) {
      return createActionError("UNAUTHORIZED");
    }

    if (!customerSession.customer) {
      return createActionError("UNAUTHORIZED");
    }
    const customer = customerSession.customer;

    if (customerData.studentId !== customer.studentId) {
      return createActionError("UNAUTHORIZED");
    }

    // Find the queue by composite key
    const queueData = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: and(
            eq(queue.hauntedHouseName, hauntedHouseName),
            eq(queue.queueNumber, queueNumber)
          ),
        }),
      "find queue"
    );

    if (!queueData) {
      return createActionError("NOT_FOUND", "Queue not found");
    }

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    await updateReservationsStatus();

    // Check reservation attempts
    if (customer.reservationAttempts >= 2) {
      return createActionError("MAX_RESERVATION_ATTEMPTS");
    }

    // Find and reserve spots
    const availableSpots = await retryDatabase(
      () =>
        db.query.queueSpot.findMany({
          where: and(
            eq(queueSpot.queueId, queueData.id),
            eq(queueSpot.status, "available")
          ),
          orderBy: asc(queueSpot.spotNumber),
          limit: numberOfSpotsForReservation,
        }),
      "find available spots for reservation"
    );

    if (availableSpots.length < numberOfSpotsForReservation) {
      return createActionError(
        "NO_AVAILABLE_SPOTS",
        `Not enough available spots. Only ${availableSpots.length} spots available.`
      );
    }

    // Increment reservation attempts since they're creating a reservation
    await retryDatabase(
      () =>
        db
          .update(customerSchema)
          .set({
            reservationAttempts: sql`${customerSchema.reservationAttempts} + 1`,
          })
          .where(eq(customerSchema.studentId, customer.studentId)),
      "increment reservation attempts for creating reservation"
    );

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
    const expiresAt = calculateReservationExpiry(numberOfSpotsForReservation);

    // Create reservation
    await retryDatabase(
      () =>
        db.insert(reservation).values({
          id: reservationId,
          queueId: queueData.id,
          representativeCustomerId: customer.studentId,
          code,
          maxSpots: numberOfSpotsForReservation,
          currentSpots: 1,
          expiresAt,
          status: "active",
        }),
      "create reservation"
    );

    // Mark spots as reserved
    const spotUpdatePromises = availableSpots.map((spot) =>
      retryDatabase(
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
      )
    );

    const spotUpdateResults = await Promise.allSettled(spotUpdatePromises);

    // Check for any failures
    const failures = spotUpdateResults.filter(
      (result) => result.status === "rejected"
    );
    if (failures.length > 0) {
      console.error("Some spot reservations failed:", failures);
      return createActionError(
        "DATABASE_ERROR",
        "Failed to reserve some spots"
      );
    }

    // Assign representative to first spot
    await retryDatabase(
      () =>
        db
          .update(queueSpot)
          .set({
            customerId: customer.studentId,
            status: "occupied",
            occupiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(queueSpot.id, availableSpots[0].id)),
      "assign representative to first spot"
    );

    revalidatePath("/dashboard");

    return createActionSuccess({
      message: "Successfully created reservation",
      code,
    });
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

    const customerSession = await verifyCustomerSession();
    if (!customerSession.session) {
      return createActionError("UNAUTHORIZED");
    }

    if (!customerSession.customer) {
      return createActionError("UNAUTHORIZED");
    }

    const customer = customerSession.customer;
    if (customerData.studentId !== customer.studentId) {
      return createActionError("UNAUTHORIZED");
    }

    const hasSpot = await customerHasQueueSpot(customer.studentId);
    if (hasSpot) {
      return createActionError("ALREADY_IN_QUEUE");
    }

    await updateReservationsStatus();

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

    if (reservationData.status === "expired") {
      return createActionError("RESERVATION_EXPIRED");
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
      await updateReservationsStatus();
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
            status: "occupied",
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

    await updateReservationsStatus();

    return createActionSuccess({
      message: "Successfully joined reservation",
    });
  } catch (error) {
    console.error("Error joining reservation:", error);
    return createActionError("DATABASE_ERROR", "Failed to join reservation");
  }
}
