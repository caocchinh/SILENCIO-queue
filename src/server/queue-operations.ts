import "server-only";
import { db } from "@/drizzle/db";
import { queue, queueSpot, reservation } from "@/drizzle/schema";
import { eq, and, lt, asc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { retryDatabase } from "@/dal/retry";
import { spotStatusUtils } from "@/lib/utils";

// Generate unique IDs
export function generateSpotId() {
  return `spot_${nanoid(16)}`;
}

export function generateReservationId() {
  return `reservation_${nanoid(16)}`;
}

export function generateReservationCode() {
  // Generate a 6-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if customer already has a queue spot
export async function customerHasQueueSpot(
  studentId: string
): Promise<boolean> {
  const existingSpot = await retryDatabase(
    () =>
      db.query.queueSpot.findFirst({
        where: eq(queueSpot.customerId, studentId),
      }),
    "check customer queue spot"
  );
  return !!existingSpot;
}

// Get customer's current queue spot with full details
export async function getCustomerQueueSpot(studentId: string) {
  const spot = await retryDatabase(
    () =>
      db.query.queueSpot.findFirst({
        where: eq(queueSpot.customerId, studentId),
        with: {
          queue: {
            with: {
              hauntedHouse: true,
              spots: {
                with: {
                  customer: true,
                },
                orderBy: asc(queueSpot.spotNumber),
              },
            },
          },
          reservation: {
            with: {
              representative: true,
              spots: {
                with: {
                  customer: true,
                },
                orderBy: asc(queueSpot.spotNumber),
              },
            },
          },
        },
      }),
    "get customer queue spot"
  );

  return spot;
}

// Create queue spots for a queue
export async function createQueueSpots(queueId: string, maxCustomers: number) {
  const spots = Array.from({ length: maxCustomers }, (_, i) => ({
    id: generateSpotId(),
    queueId,
    spotNumber: i + 1,
    status: "available" as const,
  }));

  await retryDatabase(
    () => db.insert(queueSpot).values(spots),
    "create queue spots"
  );
  return spots;
}

// Adjust queue spots when maxCustomers changes
export async function adjustQueueSpots(
  queueId: string,
  newMaxCustomers: number
) {
  const existingSpots = await retryDatabase(
    () =>
      db.query.queueSpot.findMany({
        where: eq(queueSpot.queueId, queueId),
        orderBy: asc(queueSpot.spotNumber),
      }),
    "fetch existing queue spots"
  );

  const currentCount = existingSpots.length;

  if (newMaxCustomers > currentCount) {
    // Add more spots
    const spotsToAdd = newMaxCustomers - currentCount;
    const newSpots = Array.from({ length: spotsToAdd }, (_, i) => ({
      id: generateSpotId(),
      queueId,
      spotNumber: currentCount + i + 1,
      status: "available" as const,
    }));
    await retryDatabase(
      () => db.insert(queueSpot).values(newSpots),
      "add queue spots"
    );
  } else if (newMaxCustomers < currentCount) {
    // Remove excess spots (only if they're available)
    const spotsToRemove = existingSpots
      .slice(newMaxCustomers)
      .filter((spot) => spot.status === "available");

    if (spotsToRemove.length > 0) {
      for (const spot of spotsToRemove) {
        await retryDatabase(
          () => db.delete(queueSpot).where(eq(queueSpot.id, spot.id)),
          `delete spot ${spot.spotNumber}`
        );
      }
    }
  }
}

// Get available spots count for a queue
export async function getAvailableSpotCount(queueId: string): Promise<number> {
  const result = await retryDatabase(
    () =>
      db
        .select({ count: count() })
        .from(queueSpot)
        .where(
          and(eq(queueSpot.queueId, queueId), eq(queueSpot.status, "available"))
        ),
    "get available spot count"
  );

  return result[0]?.count ?? 0;
}

// Find first available spot in a queue
export async function findFirstAvailableSpot(queueId: string) {
  return await retryDatabase(
    () =>
      db.query.queueSpot.findFirst({
        where: and(
          eq(queueSpot.queueId, queueId),
          eq(queueSpot.status, "available")
        ),
        orderBy: asc(queueSpot.spotNumber),
      }),
    "find first available spot"
  );
}

// Calculate reservation expiration time
export function calculateReservationExpiry(maxSpots: number): Date {
  const minutesToAdd = maxSpots * 5;
  return new Date(Date.now() + minutesToAdd * 60 * 1000);
}

// Expire reservations (background job function)
export async function updateReservationsStatus() {
  const now = new Date();

  // Find expired active reservations
  const expiredUnfilledReservations = await retryDatabase(
    () =>
      db.query.reservation.findMany({
        where: and(
          eq(reservation.status, "active"),
          lt(reservation.expiresAt, now),
          lt(reservation.currentSpots, reservation.maxSpots)
        ),
      }),
    "find expired reservations"
  );

  // Process all expired reservations in parallel using Promise.allSettled
  const expiredUnfilledReservationsPromises = expiredUnfilledReservations.map(
    async (res) => {
      // Release all spots (including partially filled ones)
      await retryDatabase(
        () =>
          db
            .update(queueSpot)
            .set({
              customerId: null,
              reservationId: null,
              status: "available",
              occupiedAt: null,
            })
            .where(eq(queueSpot.reservationId, res.id)),
        `release spots for reservation ${res.code}`
      );

      // Mark reservation as expired
      await retryDatabase(
        () =>
          db
            .update(reservation)
            .set({ status: "expired" })
            .where(eq(reservation.id, res.id)),
        `expire reservation ${res.code}`
      );
    }
  );

  const updateFilledReservations = await retryDatabase(
    () =>
      db.query.reservation.findMany({
        where: and(eq(reservation.currentSpots, reservation.maxSpots)),
      }),
    "find expired and filled reservations"
  );

  const updateFilledReservationsPromises = updateFilledReservations.map(
    async (res) => {
      // Since reservation is completed, we need to remove the reservation id from all spots, as they are no longer reserved, but is in occupied state now. We are not reserving spot for anyone.
      await retryDatabase(
        () =>
          db
            .update(queueSpot)
            .set({
              reservationId: null,
            })
            .where(eq(queueSpot.reservationId, res.id)),
        `release spots for reservation ${res.code}`
      );

      // Mark reservation as completed
      await retryDatabase(
        () =>
          db
            .update(reservation)
            .set({ status: "completed" })
            .where(eq(reservation.id, res.id)),
        `complete reservation ${res.code}`
      );
    }
  );

  await Promise.allSettled(expiredUnfilledReservationsPromises);
  await Promise.allSettled(updateFilledReservationsPromises);

  return expiredUnfilledReservations.length + updateFilledReservations.length;
}

// Get queue with availability stats (accepts either queueId or composite key)
export async function getQueueWithAvailability(
  queueIdOrHouseName: string,
  queueNumber?: number
) {
  const queueData = await retryDatabase(() => {
    // If queueNumber is provided, use composite key; otherwise use queueId
    const whereClause =
      queueNumber !== undefined
        ? and(
            eq(queue.hauntedHouseName, queueIdOrHouseName),
            eq(queue.queueNumber, queueNumber)
          )
        : eq(queue.id, queueIdOrHouseName);

    return db.query.queue.findFirst({
      where: whereClause,
      with: {
        hauntedHouse: true,
        spots: true,
      },
    });
  }, "get queue with availability");

  if (!queueData) return null;

  return {
    ...queueData,
    stats: spotStatusUtils.calculateStats(queueData.spots),
  };
}

