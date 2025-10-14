"use server";

import { db } from "@/drizzle/db";
import { hauntedHouse, queue, queueSpot, reservation } from "@/drizzle/schema";
import {
  createHauntedHouseSchema,
  updateHauntedHouseSchema,
  createQueueSchema,
  updateQueueSchema,
} from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import {
  generateQueueId,
  createQueueSpots,
  adjustQueueSpots,
} from "@/server/queue-operations";
import {
  ActionResponse,
  createActionError,
  createActionSuccess,
} from "@/constants/errors";
import { retryDatabase, retryAuth } from "@/dal/retry";

// Helper function to verify admin access
async function verifyAdminAccess(): Promise<ActionResponse<void>> {
  try {
    const session = await retryAuth(
      async () =>
        await auth.api.getSession({
          headers: await headers(),
        }),
      "admin session verification"
    );

    if (!session?.user || session.user.role !== "admin") {
      return createActionError("UNAUTHORIZED");
    }

    return createActionSuccess();
  } catch (err) {
    console.error("Admin auth verification failed:", err);
    return createActionError("SESSION_VERIFICATION_FAILED");
  }
}

// Create haunted house
export async function createHauntedHouse(
  params: unknown
): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = createHauntedHouseSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { name, duration, breakTimePerQueue } = validationResult.data;

    // Check if haunted house already exists
    const existing = await retryDatabase(
      () =>
        db.query.hauntedHouse.findFirst({
          where: eq(hauntedHouse.name, name),
        }),
      "check existing haunted house"
    );

    if (existing) {
      return createActionError(
        "ALREADY_EXISTS",
        "A haunted house with this name already exists"
      );
    }

    const [newHouse] = await retryDatabase(
      () =>
        db
          .insert(hauntedHouse)
          .values({
            name,
            duration,
            breakTimePerQueue,
          })
          .returning(),
      "create haunted house"
    );

    return createActionSuccess(newHouse);
  } catch (error) {
    console.error("Error creating haunted house:", error);
    return createActionError(
      "DATABASE_ERROR",
      "Failed to create haunted house"
    );
  }
}

// Update haunted house
export async function updateHauntedHouse(params: {
  name: string;
  duration?: number;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = updateHauntedHouseSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { name, duration } = validationResult.data;

    // Check if haunted house exists
    const existing = await retryDatabase(
      () =>
        db.query.hauntedHouse.findFirst({
          where: eq(hauntedHouse.name, name),
        }),
      "check haunted house exists"
    );

    if (!existing) {
      return createActionError("NOT_FOUND", "Haunted house not found");
    }

    const [updated] = await retryDatabase(
      () =>
        db
          .update(hauntedHouse)
          .set({
            duration: duration ?? existing.duration,
            updatedAt: new Date(),
          })
          .where(eq(hauntedHouse.name, name))
          .returning(),
      "update haunted house"
    );

    return createActionSuccess(updated);
  } catch (error) {
    console.error("Error updating haunted house:", error);
    return createActionError(
      "DATABASE_ERROR",
      "Failed to update haunted house"
    );
  }
}

// Delete haunted house
export async function deleteHauntedHouse(params: {
  name: string;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { name } = params;

    // Check if haunted house exists
    const existing = await retryDatabase(
      () =>
        db.query.hauntedHouse.findFirst({
          where: eq(hauntedHouse.name, name),
        }),
      "check haunted house exists for deletion"
    );

    if (!existing) {
      return createActionError("NOT_FOUND", "Haunted house not found");
    }

    await retryDatabase(
      () => db.delete(hauntedHouse).where(eq(hauntedHouse.name, name)),
      "delete haunted house"
    );

    return createActionSuccess({
      message: "Haunted house deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting haunted house:", error);
    return createActionError(
      "DATABASE_ERROR",
      "Failed to delete haunted house"
    );
  }
}

// Create queue
export async function createQueue(params: unknown): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = createQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { hauntedHouseName, queueNumber, maxCustomers, queueStartTime } =
      validationResult.data;

    const queueId = generateQueueId();

    // Create the queue
    const [newQueue] = await retryDatabase(
      () =>
        db
          .insert(queue)
          .values({
            id: queueId,
            hauntedHouseName,
            queueNumber,
            maxCustomers,
            queueStartTime,
          })
          .returning(),
      "create queue"
    );

    // Create queue spots
    await createQueueSpots(queueId, maxCustomers);

    return createActionSuccess(newQueue);
  } catch (error) {
    console.error("Error creating queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to create queue");
  }
}

// Update queue
export async function updateQueue(params: {
  queueId: string;
  queueNumber?: number;
  maxCustomers?: number;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = updateQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const { queueId, queueNumber, maxCustomers } = validationResult.data;

    // Check if queue exists
    const existing = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: eq(queue.id, queueId),
        }),
      "check queue exists"
    );

    if (!existing) {
      return createActionError("NOT_FOUND", "Queue not found");
    }

    // Update queue
    const [updated] = await retryDatabase(
      () =>
        db
          .update(queue)
          .set({
            queueNumber: queueNumber ?? existing.queueNumber,
            maxCustomers: maxCustomers ?? existing.maxCustomers,
            updatedAt: new Date(),
          })
          .where(eq(queue.id, queueId))
          .returning(),
      "update queue"
    );

    // Adjust queue spots if maxCustomers changed
    if (maxCustomers && maxCustomers !== existing.maxCustomers) {
      await adjustQueueSpots(queueId, maxCustomers);
    }

    return createActionSuccess(updated);
  } catch (error) {
    console.error("Error updating queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to update queue");
  }
}

// Delete queue
export async function deleteQueue(params: {
  queueId: string;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { queueId } = params;

    // Check if queue exists
    const existing = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: eq(queue.id, queueId),
        }),
      "check queue exists for deletion"
    );

    if (!existing) {
      return createActionError("NOT_FOUND", "Queue not found");
    }

    await retryDatabase(
      () => db.delete(queue).where(eq(queue.id, queueId)),
      "delete queue"
    );

    return createActionSuccess({ message: "Queue deleted successfully" });
  } catch (error) {
    console.error("Error deleting queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to delete queue");
  }
}

// Cancel reservation
export async function cancelReservation(params: {
  reservationId: string;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { reservationId } = params;

    // Check if reservation exists
    const reservationData = await retryDatabase(
      () =>
        db.query.reservation.findFirst({
          where: eq(reservation.id, reservationId),
        }),
      "check reservation exists"
    );

    if (!reservationData) {
      return createActionError("NOT_FOUND", "Reservation not found");
    }

    if (reservationData.status !== "active") {
      return createActionError(
        "CANNOT_CANCEL_RESERVATION",
        `Cannot cancel ${reservationData.status} reservation`
      );
    }

    // Release all spots
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
          .where(eq(queueSpot.reservationId, reservationId)),
      "release reservation spots"
    );

    // Mark reservation as cancelled
    const [cancelled] = await retryDatabase(
      () =>
        db
          .update(reservation)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(reservation.id, reservationId))
          .returning(),
      "cancel reservation"
    );

    return createActionSuccess(cancelled);
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return createActionError("DATABASE_ERROR", "Failed to cancel reservation");
  }
}
