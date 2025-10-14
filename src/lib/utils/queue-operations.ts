import { db } from "@/drizzle/db";
import {
  hauntedHouse,
  queue,
  queueSpot,
  reservation,
  customer,
} from "@/drizzle/schema";
import { eq, and, isNull, lt, sql, asc, count } from "drizzle-orm";
import { nanoid } from "nanoid";

// Generate unique IDs
export function generateQueueId() {
  return `queue_${nanoid(16)}`;
}

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
  const existingSpot = await db.query.queueSpot.findFirst({
    where: eq(queueSpot.customerId, studentId),
  });
  return !!existingSpot;
}

// Get customer's current queue spot
export async function getCustomerQueueSpot(studentId: string) {
  return await db.query.queueSpot.findFirst({
    where: eq(queueSpot.customerId, studentId),
    with: {
      queue: {
        with: {
          hauntedHouse: true,
        },
      },
    },
  });
}

// Create queue spots for a queue
export async function createQueueSpots(queueId: string, maxCustomers: number) {
  const spots = Array.from({ length: maxCustomers }, (_, i) => ({
    id: generateSpotId(),
    queueId,
    spotNumber: i + 1,
    status: "available" as const,
  }));

  await db.insert(queueSpot).values(spots);
  return spots;
}

// Adjust queue spots when maxCustomers changes
export async function adjustQueueSpots(
  queueId: string,
  newMaxCustomers: number
) {
  const existingSpots = await db.query.queueSpot.findMany({
    where: eq(queueSpot.queueId, queueId),
    orderBy: asc(queueSpot.spotNumber),
  });

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
    await db.insert(queueSpot).values(newSpots);
  } else if (newMaxCustomers < currentCount) {
    // Remove excess spots (only if they're available)
    const spotsToRemove = existingSpots
      .slice(newMaxCustomers)
      .filter((spot) => spot.status === "available");

    if (spotsToRemove.length > 0) {
      for (const spot of spotsToRemove) {
        await db.delete(queueSpot).where(eq(queueSpot.id, spot.id));
      }
    }
  }
}

// Get available spots count for a queue
export async function getAvailableSpotCount(queueId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(queueSpot)
    .where(
      and(eq(queueSpot.queueId, queueId), eq(queueSpot.status, "available"))
    );

  return result[0]?.count ?? 0;
}

// Find first available spot in a queue
export async function findFirstAvailableSpot(queueId: string) {
  return await db.query.queueSpot.findFirst({
    where: and(
      eq(queueSpot.queueId, queueId),
      eq(queueSpot.status, "available")
    ),
    orderBy: asc(queueSpot.spotNumber),
  });
}

// Calculate reservation expiration time
export function calculateReservationExpiry(maxSpots: number): Date {
  const minutesToAdd = maxSpots * 5;
  return new Date(Date.now() + minutesToAdd * 60 * 1000);
}

// Get or create customer
export async function getOrCreateCustomer(customerData: {
  studentId: string;
  name: string;
  email: string;
  homeroom: string;
  ticketType: string;
}) {
  const existingCustomer = await db.query.customer.findFirst({
    where: eq(customer.studentId, customerData.studentId),
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  const [newCustomer] = await db
    .insert(customer)
    .values({
      ...customerData,
      reservationAttempts: 0,
    })
    .returning();

  return newCustomer;
}

// Expire reservations (background job function)
export async function expireReservations() {
  const now = new Date();

  // Find expired active reservations
  const expiredReservations = await db.query.reservation.findMany({
    where: and(
      eq(reservation.status, "active"),
      lt(reservation.expiresAt, now)
    ),
  });

  for (const res of expiredReservations) {
    // Release all spots (including partially filled ones)
    await db
      .update(queueSpot)
      .set({
        customerId: null,
        reservationId: null,
        status: "available",
        occupiedAt: null,
      })
      .where(eq(queueSpot.reservationId, res.id));

    // Mark reservation as expired
    await db
      .update(reservation)
      .set({ status: "expired" })
      .where(eq(reservation.id, res.id));

    // Increment representative's reservation attempts
    await db
      .update(customer)
      .set({
        reservationAttempts: sql`${customer.reservationAttempts} + 1`,
      })
      .where(eq(customer.studentId, res.representativeCustomerId));
  }

  return expiredReservations.length;
}

// Get queue with availability stats
export async function getQueueWithAvailability(queueId: string) {
  const queueData = await db.query.queue.findFirst({
    where: eq(queue.id, queueId),
    with: {
      hauntedHouse: true,
      spots: true,
    },
  });

  if (!queueData) return null;

  const availableSpots = queueData.spots.filter(
    (spot) => spot.status === "available"
  ).length;
  const occupiedSpots = queueData.spots.filter(
    (spot) => spot.status === "occupied"
  ).length;
  const reservedSpots = queueData.spots.filter(
    (spot) => spot.status === "reserved"
  ).length;

  return {
    ...queueData,
    stats: {
      availableSpots,
      occupiedSpots,
      reservedSpots,
      totalSpots: queueData.spots.length,
    },
  };
}

// Get all queues for a haunted house with stats
export async function getHauntedHouseQueues(hauntedHouseName: string) {
  const queues = await db.query.queue.findMany({
    where: eq(queue.hauntedHouseName, hauntedHouseName),
    with: {
      spots: true,
      reservations: {
        where: eq(reservation.status, "active"),
      },
    },
    orderBy: asc(queue.queueNumber),
  });

  return queues.map((q) => ({
    ...q,
    stats: {
      availableSpots: q.spots.filter((s) => s.status === "available").length,
      occupiedSpots: q.spots.filter((s) => s.status === "occupied").length,
      reservedSpots: q.spots.filter((s) => s.status === "reserved").length,
      totalSpots: q.spots.length,
      activeReservations: q.reservations.length,
    },
  }));
}
