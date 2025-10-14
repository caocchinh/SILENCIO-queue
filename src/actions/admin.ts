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
} from "@/lib/utils/queue-operations";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper function to verify admin access
async function verifyAdminAccess(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized - Admin access required",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Admin auth verification failed:", err);
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

// Create haunted house
export async function createHauntedHouse(
  params: unknown
): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = createHauntedHouseSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { name, duration, breakTimePerQueue } = validationResult.data;

    // Check if haunted house already exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, name),
    });

    if (existing) {
      return {
        success: false,
        error: "A haunted house with this name already exists",
      };
    }

    const [newHouse] = await db
      .insert(hauntedHouse)
      .values({
        name,
        duration,
        breakTimePerQueue,
      })
      .returning();

    return {
      success: true,
      data: newHouse,
    };
  } catch (error) {
    console.error("Error creating haunted house:", error);
    return {
      success: false,
      error: "Failed to create haunted house",
    };
  }
}

// Update haunted house
export async function updateHauntedHouse(params: {
  name: string;
  duration?: number;
}): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = updateHauntedHouseSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { name, duration } = validationResult.data;

    // Check if haunted house exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, name),
    });

    if (!existing) {
      return {
        success: false,
        error: "Haunted house not found",
      };
    }

    const [updated] = await db
      .update(hauntedHouse)
      .set({
        duration: duration ?? existing.duration,
        updatedAt: new Date(),
      })
      .where(eq(hauntedHouse.name, name))
      .returning();

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Error updating haunted house:", error);
    return {
      success: false,
      error: "Failed to update haunted house",
    };
  }
}

// Delete haunted house
export async function deleteHauntedHouse(params: {
  name: string;
}): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { name } = params;

    // Check if haunted house exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, name),
    });

    if (!existing) {
      return {
        success: false,
        error: "Haunted house not found",
      };
    }

    await db.delete(hauntedHouse).where(eq(hauntedHouse.name, name));

    return {
      success: true,
      data: { message: "Haunted house deleted successfully" },
    };
  } catch (error) {
    console.error("Error deleting haunted house:", error);
    return {
      success: false,
      error: "Failed to delete haunted house",
    };
  }
}

// Create queue
export async function createQueue(params: unknown): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = createQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { hauntedHouseName, queueNumber, maxCustomers } =
      validationResult.data;

    const queueId = generateQueueId();

    // Create the queue
    const [newQueue] = await db
      .insert(queue)
      .values({
        id: queueId,
        hauntedHouseName,
        queueNumber,
        maxCustomers,
      })
      .returning();

    // Create queue spots
    await createQueueSpots(queueId, maxCustomers);

    return {
      success: true,
      data: newQueue,
    };
  } catch (error) {
    console.error("Error creating queue:", error);
    return {
      success: false,
      error: "Failed to create queue",
    };
  }
}

// Update queue
export async function updateQueue(params: {
  queueId: string;
  queueNumber?: number;
  maxCustomers?: number;
}): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const validationResult = updateQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Invalid input",
      };
    }

    const { queueId, queueNumber, maxCustomers } = validationResult.data;

    // Check if queue exists
    const existing = await db.query.queue.findFirst({
      where: eq(queue.id, queueId),
    });

    if (!existing) {
      return {
        success: false,
        error: "Queue not found",
      };
    }

    // Update queue
    const [updated] = await db
      .update(queue)
      .set({
        queueNumber: queueNumber ?? existing.queueNumber,
        maxCustomers: maxCustomers ?? existing.maxCustomers,
        updatedAt: new Date(),
      })
      .where(eq(queue.id, queueId))
      .returning();

    // Adjust queue spots if maxCustomers changed
    if (maxCustomers && maxCustomers !== existing.maxCustomers) {
      await adjustQueueSpots(queueId, maxCustomers);
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Error updating queue:", error);
    return {
      success: false,
      error: "Failed to update queue",
    };
  }
}

// Delete queue
export async function deleteQueue(params: {
  queueId: string;
}): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { queueId } = params;

    // Check if queue exists
    const existing = await db.query.queue.findFirst({
      where: eq(queue.id, queueId),
    });

    if (!existing) {
      return {
        success: false,
        error: "Queue not found",
      };
    }

    await db.delete(queue).where(eq(queue.id, queueId));

    return {
      success: true,
      data: { message: "Queue deleted successfully" },
    };
  } catch (error) {
    console.error("Error deleting queue:", error);
    return {
      success: false,
      error: "Failed to delete queue",
    };
  }
}

// Cancel reservation
export async function cancelReservation(params: {
  reservationId: string;
}): Promise<ApiResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { reservationId } = params;

    // Check if reservation exists
    const reservationData = await db.query.reservation.findFirst({
      where: eq(reservation.id, reservationId),
    });

    if (!reservationData) {
      return {
        success: false,
        error: "Reservation not found",
      };
    }

    if (reservationData.status !== "active") {
      return {
        success: false,
        error: `Cannot cancel ${reservationData.status} reservation`,
      };
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

    return {
      success: true,
      data: cancelled,
    };
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return {
      success: false,
      error: "Failed to cancel reservation",
    };
  }
}
