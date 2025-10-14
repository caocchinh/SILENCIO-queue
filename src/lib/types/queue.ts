import {
  hauntedHouse,
  queue,
  queueSpot,
  reservation,
  customer,
} from "@/drizzle/schema";

// Database model types
export type HauntedHouse = typeof hauntedHouse.$inferSelect;
export type Queue = typeof queue.$inferSelect;
export type QueueSpot = typeof queueSpot.$inferSelect;
export type Reservation = typeof reservation.$inferSelect;
export type Customer = typeof customer.$inferSelect;

// Insert types
export type NewHauntedHouse = typeof hauntedHouse.$inferInsert;
export type NewQueue = typeof queue.$inferInsert;
export type NewQueueSpot = typeof queueSpot.$inferInsert;
export type NewReservation = typeof reservation.$inferInsert;
export type NewCustomer = typeof customer.$inferInsert;

// Extended types with relations
export type QueueWithStats = Queue & {
  stats: {
    availableSpots: number;
    occupiedSpots: number;
    reservedSpots: number;
    totalSpots: number;
    activeReservations?: number;
  };
  hauntedHouse?: HauntedHouse;
};

export type QueueWithDetails = Queue & {
  stats: {
    availableSpots: number;
    occupiedSpots: number;
    reservedSpots: number;
    totalSpots: number;
    activeReservations?: number;
  };
  hauntedHouse?: HauntedHouse;
  spots?: (QueueSpot & {
    customer?: Customer;
  })[];
};

export type QueueSpotWithDetails = QueueSpot & {
  queue?: Queue & {
    hauntedHouse?: HauntedHouse;
    spots?: (QueueSpot & {
      customer?: Customer;
    })[];
  };
  customer?: Customer;
  reservation?: ReservationWithDetails;
};

export type ReservationWithDetails = Reservation & {
  queue?: Queue & {
    hauntedHouse?: HauntedHouse;
  };
  representative?: Customer;
  spots?: QueueSpotWithDetails[];
};

export type HauntedHouseWithQueues = HauntedHouse & {
  queues?: QueueWithStats[];
};

export type HauntedHouseWithDetailedQueues = HauntedHouse & {
  queues?: QueueWithDetails[];
};

// Import standardized response types
export type { ActionResponse } from "@/constants/errors";

// Queue status types
export type QueueSpotStatus = "available" | "occupied" | "reserved";
export type ReservationStatus =
  | "active"
  | "completed"
  | "expired"
  | "cancelled";
