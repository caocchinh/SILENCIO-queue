import { z } from "zod";

// Haunted House schemas
export const createHauntedHouseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(120, "Duration must be less than 120 minutes"),
  breakTimePerQueue: z
    .number()
    .int()
    .min(0, "Break time must be at least 0 minutes")
    .max(60, "Break time must be less than 60 minutes"),
});

export const updateHauntedHouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  duration: z.number().int().min(1).max(120).optional(),
});

// Queue schemas
export const createQueueSchema = z.object({
  hauntedHouseName: z.string().min(1, "Haunted house name is required"),
  queueNumber: z.number().int().min(1, "Queue number must be at least 1"),
  maxCustomers: z
    .number()
    .int()
    .min(1, "Max customers must be at least 1")
    .max(100, "Max customers cannot exceed 100"),
});

export const updateQueueSchema = z.object({
  queueId: z.string().min(1),
  queueNumber: z.number().int().min(1).optional(),
  maxCustomers: z.number().int().min(1).max(100).optional(),
});

// Customer queue operations
export const joinQueueSchema = z.object({
  queueId: z.string().min(1, "Queue ID is required"),
  customerData: z.object({
    studentId: z.string().min(1, "Student ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    homeroom: z.string().min(1, "Homeroom is required"),
    ticketType: z.string().min(1, "Ticket type is required"),
  }),
});

// Reservation schemas
export const createReservationSchema = z.object({
  queueId: z.string().min(1, "Queue ID is required"),
  maxSpots: z
    .number()
    .int()
    .min(2, "Reservation must be for at least 2 people")
    .max(10, "Reservation cannot exceed 10 people"),
  customerData: z.object({
    studentId: z.string().min(1, "Student ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    homeroom: z.string().min(1, "Homeroom is required"),
    ticketType: z.string().min(1, "Ticket type is required"),
  }),
});

export const joinReservationSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be at least 6 characters")
    .max(10, "Code must be less than 10 characters"),
  customerData: z.object({
    studentId: z.string().min(1, "Student ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    homeroom: z.string().min(1, "Homeroom is required"),
    ticketType: z.string().min(1, "Ticket type is required"),
  }),
});

export const cancelReservationSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID is required"),
});

// Type exports
export type CreateHauntedHouseInput = z.infer<typeof createHauntedHouseSchema>;
export type UpdateHauntedHouseInput = z.infer<typeof updateHauntedHouseSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type JoinReservationInput = z.infer<typeof joinReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
