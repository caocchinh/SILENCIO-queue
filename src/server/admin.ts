"use server";

import { db } from "@/drizzle/db";
import { hauntedHouse, queue, queueSpot, reservation } from "@/drizzle/schema";
import {
  createHauntedHouseSchema,
  updateHauntedHouseSchema,
  createQueueSchema,
  createBatchQueuesSchema,
} from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { createQueueSpots, adjustQueueSpots } from "@/server/queue-operations";
import {
  ActionResponse,
  createActionError,
  createActionSuccess,
} from "@/constants/errors";
import { retryDatabase, retryAuth } from "@/dal/retry";
import { nanoid } from "nanoid";

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

    const { name } = validationResult.data;

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

    const { name } = validationResult.data;

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

    const {
      hauntedHouseName,
      queueNumber,
      maxCustomers,
      queueStartTime,
      queueEndTime,
    } = validationResult.data;

    // Check if queue already exists
    const existing = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: and(
            eq(queue.hauntedHouseName, hauntedHouseName),
            eq(queue.queueNumber, queueNumber)
          ),
        }),
      "check queue exists"
    );

    if (existing) {
      return createActionError(
        "ALREADY_EXISTS",
        `Queue ${queueNumber} for ${hauntedHouseName} already exists`
      );
    }

    // Create the queue
    const queueId = nanoid(16);
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
            queueEndTime,
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

// Create batch queues
export async function createBatchQueues(
  params: unknown
): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = createBatchQueuesSchema.safeParse(params);

    if (!validationResult.success) {
      return createActionError(
        "INVALID_INPUT",
        validationResult.error.issues[0]?.message
      );
    }

    const {
      hauntedHouseName,
      startingQueueNumber,
      numberOfQueues,
      maxCustomers,
      durationPerQueue,
      breakTimePerQueue,
      firstQueueStartTime,
    } = validationResult.data;

    // Create queues sequentially
    const createdQueues = [];
    let currentStartTime = new Date(firstQueueStartTime);

    for (let i = 0; i < numberOfQueues; i++) {
      const queueNumber = startingQueueNumber + i;

      // Calculate end time: start time + duration
      const currentEndTime = new Date(
        currentStartTime.getTime() + durationPerQueue * 60000
      );

      // Check if queue already exists
      const existing = await retryDatabase(
        () =>
          db.query.queue.findFirst({
            where: and(
              eq(queue.hauntedHouseName, hauntedHouseName),
              eq(queue.queueNumber, queueNumber)
            ),
          }),
        "check queue exists"
      );

      if (existing) {
        // Update existing queue
        const [updated] = await retryDatabase(
          () =>
            db
              .update(queue)
              .set({
                maxCustomers: maxCustomers,
                queueStartTime: currentStartTime,
                queueEndTime: currentEndTime,
                updatedAt: new Date(),
              })
              .where(eq(queue.id, existing.id))
              .returning(),
          "update queue"
        );

        // Adjust queue spots if needed
        await adjustQueueSpots(existing.id, maxCustomers);

        createdQueues.push(updated);
      } else {
        // Create new queue
        const queueId = nanoid(16);
        const [newQueue] = await retryDatabase(
          () =>
            db
              .insert(queue)
              .values({
                id: queueId,
                hauntedHouseName,
                queueNumber,
                maxCustomers,
                queueStartTime: currentStartTime,
                queueEndTime: currentEndTime,
              })
              .returning(),
          `create queue ${queueNumber}`
        );

        // Create queue spots
        await createQueueSpots(queueId, maxCustomers);

        createdQueues.push(newQueue);
      }

      // Calculate next start time: current end time + break time
      currentStartTime = new Date(
        currentEndTime.getTime() + breakTimePerQueue * 60000
      );
    }

    return createActionSuccess({
      message: `Successfully created ${numberOfQueues} queues`,
      queues: createdQueues,
    });
  } catch (error) {
    console.error("Error creating batch queues:", error);
    return createActionError("DATABASE_ERROR", "Failed to create batch queues");
  }
}

// Update queue
export async function updateQueue(params: {
  id: string;
  queueNumber?: number;
  maxCustomers?: number;
  queueStartTime?: Date;
  queueEndTime?: Date;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { id, queueNumber, maxCustomers, queueStartTime, queueEndTime } =
      params;

    // Check if queue exists
    const existing = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: eq(queue.id, id),
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
            queueStartTime: queueStartTime ?? existing.queueStartTime,
            queueEndTime: queueEndTime ?? existing.queueEndTime,
            updatedAt: new Date(),
          })
          .where(eq(queue.id, id))
          .returning(),
      "update queue"
    );

    // Adjust queue spots if maxCustomers changed
    if (maxCustomers && maxCustomers !== existing.maxCustomers) {
      await adjustQueueSpots(id, maxCustomers);
    }

    return createActionSuccess(updated);
  } catch (error) {
    console.error("Error updating queue:", error);
    return createActionError("DATABASE_ERROR", "Failed to update queue");
  }
}

// Delete queue
export async function deleteQueue(params: {
  id: string;
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { id } = params;

    // Check if queue exists
    const existing = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: eq(queue.id, id),
        }),
      "check queue exists for deletion"
    );

    if (!existing) {
      return createActionError("NOT_FOUND", "Queue not found");
    }

    await retryDatabase(
      () => db.delete(queue).where(eq(queue.id, id)),
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
