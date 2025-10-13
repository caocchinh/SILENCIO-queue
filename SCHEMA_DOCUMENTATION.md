# Haunted House Queue System - Database Schema Documentation

## Overview

This database schema supports a haunted house event queue system with the following capabilities:

- Multiple haunted houses with different play durations
- Dynamic queues per haunted house (configurable by admin)
- Individual queue spots that can be occupied or reserved
- Group reservations with unique codes
- Reservation attempt limits per customer

## Tables

### 1. `haunted_house`

Stores information about each haunted house attraction.

**Fields:**

- `name` (PK): Unique name of the haunted house
- `duration`: Duration of the play in minutes
- `createdAt`: Timestamp when created
- `updatedAt`: Timestamp when last updated

**Admin Operations:**

- CREATE: Add new haunted houses
- UPDATE: Modify duration or name
- DELETE: Remove haunted house (cascades to queues)

---

### 2. `queue`

Represents individual queues for haunted houses. A haunted house can have multiple queues.

**Fields:**

- `id` (PK): Unique queue identifier
- `hauntedHouseName` (FK): References `haunted_house.name`
- `queueNumber`: Distinguishes queues for the same house (e.g., Queue 1, Queue 2)
- `maxCustomers`: Maximum number of customers this queue can hold (set by admin)
- `createdAt`: Timestamp when created
- `updatedAt`: Timestamp when last updated

**Admin Operations:**

- CREATE: Add queues to a haunted house
- UPDATE: Modify `maxCustomers` or `queueNumber`
- DELETE: Remove queue (cascades to spots and reservations)

**Important:** When creating a queue or updating `maxCustomers`, the system should automatically create/adjust the corresponding `queue_spot` records.

---

### 3. `queue_spot`

Individual spots within a queue. These represent the actual positions customers can occupy.

**Fields:**

- `id` (PK): Unique spot identifier
- `queueId` (FK): References `queue.id`
- `spotNumber`: Position number in the queue (1, 2, 3, etc.)
- `customerId` (FK, nullable): References `customer.studentId` when occupied
- `reservationId` (FK, nullable): References `reservation.id` when reserved
- `status`: One of: `"available"`, `"occupied"`, `"reserved"`
- `occupiedAt`: Timestamp when the spot was occupied
- `createdAt`: Timestamp when created
- `updatedAt`: Timestamp when last updated

**Status Flow:**

- `available` → No customer, no reservation
- `reserved` → Temporarily held by a reservation (has `reservationId`)
- `occupied` → Permanently taken by a customer (has `customerId`)

**Business Rules:**

- A spot can only be occupied by ONE customer
- A customer can only occupy ONE spot across all queues
- Reserved spots cannot be occupied unless using the reservation code
- When a reservation expires without being filled, all reserved spots return to `available`

---

### 4. `reservation`

Group reservations that allow representatives to hold multiple spots for friends.

**Fields:**

- `id` (PK): Unique reservation identifier
- `queueId` (FK): References `queue.id`
- `representativeCustomerId` (FK): The customer who created the reservation
- `code`: Unique code for others to join (e.g., "ABC123")
- `maxSpots`: Total number of spots to reserve
- `currentSpots`: How many spots are currently filled (starts at 1 with representative)
- `expiresAt`: Calculated as `createdAt + (maxSpots * 5 minutes)`
- `status`: One of: `"active"`, `"completed"`, `"expired"`, `"cancelled"`
- `createdAt`: Timestamp when created
- `updatedAt`: Timestamp when last updated

**Status Flow:**

- `active` → Reservation is open, people can join with code
- `completed` → All spots filled successfully
- `expired` → Time ran out before all spots were filled (all spots released)
- `cancelled` → Manually cancelled by representative or admin

**Business Rules:**

- Representative counts as 1 spot (so `currentSpots` starts at 1)
- Each spot adds 5 minutes to expiration time
- If not fully filled by `expiresAt`, the reservation expires and ALL spots (including representative) are released
- Representatives can only create reservations if they have < 2 `reservationAttempts`
- Each failed reservation increments the representative's `reservationAttempts`

**Example:**

```
Representative wants to reserve 4 spots total (themselves + 3 friends)
- maxSpots = 4
- currentSpots = 1 (representative)
- expiresAt = createdAt + (4 * 5 minutes) = createdAt + 20 minutes
- 4 queue spots are marked as "reserved" with this reservation.id
- Friends can join using the code within 20 minutes
- If only 2 friends join before expiration, all 4 spots are released
```

---

### 5. `customer`

Stores customer information and tracks their queue participation.

**Fields:**

- `studentId` (PK): Unique student identifier
- `name`: Customer's full name
- `email`: Customer's email
- `homeroom`: Customer's homeroom class
- `ticketType`: Type of ticket they purchased
- `reservationAttempts`: Number of reservation attempts used (max 2)
- `createdAt`: Timestamp when created

**Business Rules:**

- Can only occupy ONE queue spot across all queues
- Can create up to 2 reservations (tracked by `reservationAttempts`)
- Failed reservations (expired before full) increment `reservationAttempts`
- Successful reservations don't count against the limit

---

## Relationships

```
hauntedHouse (1) ──< (N) queue
queue (1) ──< (N) queueSpot
queue (1) ──< (N) reservation
customer (1) ──< (N) queueSpot (but customer can only have 1 occupied spot)
customer (1) ──< (N) reservation (as representative)
reservation (1) ──< (N) queueSpot (reserved spots)
```

---

## Key Workflows

### Admin: Create Haunted House with Queues

1. Admin creates a haunted house:

   ```typescript
   await db.insert(hauntedHouse).values({
     name: "Zombie Mansion",
     duration: 15, // 15 minutes
   });
   ```

2. Admin creates queues for the house:

   ```typescript
   const queueId1 = generateId();
   await db.insert(queue).values({
     id: queueId1,
     hauntedHouseName: "Zombie Mansion",
     queueNumber: 1,
     maxCustomers: 20,
   });
   ```

3. System automatically creates queue spots:
   ```typescript
   const spots = Array.from({ length: 20 }, (_, i) => ({
     id: generateId(),
     queueId: queueId1,
     spotNumber: i + 1,
     status: "available",
   }));
   await db.insert(queueSpot).values(spots);
   ```

---

### Customer: Join a Queue (Direct)

1. Customer selects a haunted house and queue
2. System checks:
   - Customer doesn't already have a spot in ANY queue
   - Queue has available spots
3. Find first available spot:
   ```typescript
   const spot = await db.query.queueSpot.findFirst({
     where: and(
       eq(queueSpot.queueId, selectedQueueId),
       eq(queueSpot.status, "available")
     ),
     orderBy: asc(queueSpot.spotNumber),
   });
   ```
4. Assign customer to spot:
   ```typescript
   await db
     .update(queueSpot)
     .set({
       customerId: customer.studentId,
       status: "occupied",
       occupiedAt: new Date(),
     })
     .where(eq(queueSpot.id, spot.id));
   ```

---

### Customer: Create Reservation

1. Customer wants to reserve spots for 4 people total (self + 3 friends)
2. System checks:
   - Customer has < 2 reservation attempts
   - Customer doesn't already have a spot
   - Queue has at least 4 available spots
3. Create reservation:

   ```typescript
   const reservationId = generateId();
   const code = generateReservationCode(); // e.g., "ABC123"
   const maxSpots = 4;
   const expiresAt = new Date(Date.now() + maxSpots * 5 * 60 * 1000); // 20 minutes

   await db.insert(reservation).values({
     id: reservationId,
     queueId: selectedQueueId,
     representativeCustomerId: customer.studentId,
     code,
     maxSpots,
     currentSpots: 1, // Representative
     expiresAt,
     status: "active",
   });
   ```

4. Reserve spots:

   ```typescript
   const availableSpots = await db.query.queueSpot.findMany({
     where: and(
       eq(queueSpot.queueId, selectedQueueId),
       eq(queueSpot.status, "available")
     ),
     orderBy: asc(queueSpot.spotNumber),
     limit: maxSpots,
   });

   // Mark spots as reserved
   for (const spot of availableSpots) {
     await db
       .update(queueSpot)
       .set({
         reservationId,
         status: "reserved",
       })
       .where(eq(queueSpot.id, spot.id));
   }

   // Assign representative to first spot
   await db
     .update(queueSpot)
     .set({
       customerId: customer.studentId,
       occupiedAt: new Date(),
     })
     .where(eq(queueSpot.id, availableSpots[0].id));
   ```

---

### Customer: Join Reservation with Code

1. Customer enters reservation code
2. System validates:
   - Reservation exists and is active
   - Reservation hasn't expired
   - Customer doesn't already have a spot
   - Reservation has available spots (`currentSpots < maxSpots`)
3. Find a reserved spot for this reservation:
   ```typescript
   const spot = await db.query.queueSpot.findFirst({
     where: and(
       eq(queueSpot.reservationId, reservationId),
       isNull(queueSpot.customerId) // Not yet occupied
     ),
   });
   ```
4. Assign customer to spot:

   ```typescript
   await db
     .update(queueSpot)
     .set({
       customerId: customer.studentId,
       occupiedAt: new Date(),
     })
     .where(eq(queueSpot.id, spot.id));

   // Increment current spots
   await db
     .update(reservation)
     .set({
       currentSpots: sql`${reservation.currentSpots} + 1`,
       status: sql`CASE WHEN ${reservation.currentSpots} + 1 >= ${reservation.maxSpots} THEN 'completed' ELSE 'active' END`,
     })
     .where(eq(reservation.id, reservationId));
   ```

---

### Background Job: Expire Reservations

Run this periodically (e.g., every minute):

```typescript
async function expireReservations() {
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
}
```

---

## Constraints & Validation

### Database Level

- **Unique Constraints:**
  - `reservation.code` must be unique
  - `customer.studentId` is primary key
- **Foreign Key Cascades:**
  - Delete haunted house → cascades to queues → cascades to spots & reservations
  - Delete customer from spot → sets `customerId` to null (onDelete: "set null")

### Application Level

1. **Customer can only join 1 queue:**

   ```typescript
   const existingSpot = await db.query.queueSpot.findFirst({
     where: eq(queueSpot.customerId, customer.studentId),
   });
   if (existingSpot) throw new Error("Already in a queue");
   ```

2. **Max 2 reservation attempts:**

   ```typescript
   if (customer.reservationAttempts >= 2) {
     throw new Error("Maximum reservation attempts reached");
   }
   ```

3. **Cannot join occupied spots:**

   ```typescript
   if (spot.status !== "available") {
     throw new Error("Spot not available");
   }
   ```

4. **Reservation spots validation:**
   ```typescript
   const availableCount = await db.query.queueSpot.count({
     where: and(
       eq(queueSpot.queueId, queueId),
       eq(queueSpot.status, "available")
     ),
   });
   if (availableCount < requestedSpots) {
     throw new Error("Not enough available spots");
   }
   ```

---

## Admin Dashboard Features

### Manage Haunted Houses

- **Create:** Add new haunted house with name and duration
- **Update:** Modify name or duration
- **Delete:** Remove haunted house (warns about cascade effects)
- **View:** List all haunted houses with their queues

### Manage Queues

- **Create:** Add queue to a haunted house with `maxCustomers`
- **Update:** Change `maxCustomers` (automatically adjusts spots)
- **Delete:** Remove queue
- **View:** See queue occupancy, available spots, active reservations

### Monitor Reservations

- **View:** All active, completed, and expired reservations
- **Cancel:** Manually cancel a reservation (releases spots)
- **Extend:** Optionally extend expiration time

### Customer Management

- **View:** Customer's current queue spot
- **View:** Customer's reservation attempts
- **Reset:** Reset reservation attempts (admin privilege)
- **Remove:** Remove customer from queue spot

---

## Example Queries

### Get all queues for a haunted house with availability

```typescript
const queuesWithAvailability = await db
  .select({
    queueId: queue.id,
    queueNumber: queue.queueNumber,
    maxCustomers: queue.maxCustomers,
    availableSpots: sql<number>`COUNT(CASE WHEN ${queueSpot.status} = 'available' THEN 1 END)`,
    occupiedSpots: sql<number>`COUNT(CASE WHEN ${queueSpot.status} = 'occupied' THEN 1 END)`,
    reservedSpots: sql<number>`COUNT(CASE WHEN ${queueSpot.status} = 'reserved' THEN 1 END)`,
  })
  .from(queue)
  .leftJoin(queueSpot, eq(queue.id, queueSpot.queueId))
  .where(eq(queue.hauntedHouseName, "Zombie Mansion"))
  .groupBy(queue.id);
```

### Get customer's current position

```typescript
const customerPosition = await db.query.queueSpot.findFirst({
  where: eq(queueSpot.customerId, customer.studentId),
  with: {
    queue: {
      with: {
        hauntedHouse: true,
      },
    },
  },
});
```

### Get all active reservations for a queue

```typescript
const activeReservations = await db.query.reservation.findMany({
  where: and(
    eq(reservation.queueId, queueId),
    eq(reservation.status, "active")
  ),
  with: {
    representative: true,
    spots: {
      with: {
        customer: true,
      },
    },
  },
});
```

---

## Migration Notes

When running migrations:

1. Create tables in order: `haunted_house` → `queue` → `reservation` → `customer` → `queue_spot`
2. Use Drizzle Kit to generate migrations: `npx drizzle-kit generate`
3. Apply migrations: `npx drizzle-kit migrate`

---

## Security Considerations

1. **Validate reservation codes** - Prevent brute force attacks
2. **Rate limit** queue joining attempts
3. **Verify customer identity** before allowing queue operations
4. **Admin authentication** for dashboard operations
5. **Transaction isolation** for concurrent spot assignments
6. **Sanitize inputs** for haunted house names and queue numbers

---

This schema provides a robust foundation for your haunted house queue system with all the required features!
