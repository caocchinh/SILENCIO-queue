import {
  index,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").notNull().default("user"),
  banned: boolean("banned")
    .$defaultFn(() => false)
    .notNull(),
  banReason: text("ban_reason"),
  banExpiresAt: timestamp("ban_expires_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by").references(() => user.id),
  },
  (table) => [index("idx_session_id").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("idx_account_id").on(table.userId)]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const hauntedHouse = pgTable("haunted_house", {
  name: text("name").notNull().primaryKey(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Queue table - each haunted house can have multiple queues
export const queue = pgTable(
  "queue",
  {
    hauntedHouseName: text("haunted_house_name")
      .notNull()
      .references(() => hauntedHouse.name, { onDelete: "cascade" }),
    queueNumber: integer("queue_number").notNull(), // To distinguish multiple queues for same house
    queueStartTime: timestamp("queue_start_time").notNull(), // Time when the queue starts
    queueEndTime: timestamp("queue_end_time").notNull(), // Time when the queue ends
    maxCustomers: integer("max_customers").notNull(), // Set by admin
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    pk: {
      name: "queue_pkey",
      columns: [table.hauntedHouseName, table.queueNumber],
    },
  })
);

// Queue spot table - individual spots in a queue
export const queueSpot = pgTable(
  "queue_spot",
  {
    id: text("id").primaryKey(),
    queueHauntedHouseName: text("queue_haunted_house_name").notNull(),
    queueNumber: integer("queue_number").notNull(),
    spotNumber: integer("spot_number").notNull(), // Position in queue
    customerId: text("customer_id").references(() => customer.studentId, {
      onDelete: "set null",
    }), // Occupied by this customer
    reservationId: text("reservation_id").references(() => reservation.id, {
      onDelete: "set null",
    }), // Reserved by this reservation
    status: text("status").notNull().default("available"), // available, occupied, reserved
    occupiedAt: timestamp("occupied_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    queueFk: {
      name: "queue_spot_queue_fk",
      columns: [table.queueHauntedHouseName, table.queueNumber],
      foreignColumns: [queue.hauntedHouseName, queue.queueNumber],
    },
    idxQueueSpotQueue: index("idx_queue_spot_queue").on(
      table.queueHauntedHouseName,
      table.queueNumber
    ),
    idxQueueSpotCustomer: index("idx_queue_spot_customer").on(table.customerId),
    idxQueueSpotReservation: index("idx_queue_spot_reservation").on(
      table.reservationId
    ),
  })
);

// Reservation table - for group reservations with codes
export const reservation = pgTable(
  "reservation",
  {
    id: text("id").primaryKey(),
    queueHauntedHouseName: text("queue_haunted_house_name").notNull(),
    queueNumber: integer("queue_number").notNull(),
    representativeCustomerId: text("representative_customer_id")
      .notNull()
      .references(() => customer.studentId, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // Unique code for others to join
    maxSpots: integer("max_spots").notNull(), // Number of spots to reserve
    currentSpots: integer("current_spots").notNull().default(1), // How many spots are filled (starts with representative)
    expiresAt: timestamp("expires_at").notNull(), // Calculated as maxSpots * 5 minutes
    status: text("status").notNull().default("active"), // active, completed, expired, cancelled
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    queueFk: {
      name: "reservation_queue_fk",
      columns: [table.queueHauntedHouseName, table.queueNumber],
      foreignColumns: [queue.hauntedHouseName, queue.queueNumber],
    },
    idxReservationQueue: index("idx_reservation_queue").on(
      table.queueHauntedHouseName,
      table.queueNumber
    ),
    idxReservationRepresentative: index("idx_reservation_representative").on(
      table.representativeCustomerId
    ),
    idxReservationCode: index("idx_reservation_code").on(table.code),
  })
);

export const customer = pgTable("customer", {
  studentId: text("student_id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  homeroom: text("homeroom").notNull(),
  ticketType: text("ticket_type").notNull(),
  reservationAttempts: integer("reservation_attempts").notNull().default(0), // Max 2 attempts
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Drizzle relations for better querying
export const hauntedHouseRelations = relations(hauntedHouse, ({ many }) => ({
  queues: many(queue),
}));

export const queueRelations = relations(queue, ({ one, many }) => ({
  hauntedHouse: one(hauntedHouse, {
    fields: [queue.hauntedHouseName],
    references: [hauntedHouse.name],
  }),
  spots: many(queueSpot),
  reservations: many(reservation),
}));

export const queueSpotRelations = relations(queueSpot, ({ one }) => ({
  queue: one(queue, {
    fields: [queueSpot.queueHauntedHouseName, queueSpot.queueNumber],
    references: [queue.hauntedHouseName, queue.queueNumber],
  }),
  customer: one(customer, {
    fields: [queueSpot.customerId],
    references: [customer.studentId],
  }),
  reservation: one(reservation, {
    fields: [queueSpot.reservationId],
    references: [reservation.id],
  }),
}));

export const reservationRelations = relations(reservation, ({ one, many }) => ({
  queue: one(queue, {
    fields: [reservation.queueHauntedHouseName, reservation.queueNumber],
    references: [queue.hauntedHouseName, queue.queueNumber],
  }),
  representative: one(customer, {
    fields: [reservation.representativeCustomerId],
    references: [customer.studentId],
  }),
  spots: many(queueSpot),
}));

export const customerRelations = relations(customer, ({ many }) => ({
  queueSpots: many(queueSpot),
  reservationsCreated: many(reservation),
}));
