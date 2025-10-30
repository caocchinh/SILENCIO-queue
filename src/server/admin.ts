"use server";

import { db } from "@/drizzle/db";
import {
  customer,
  hauntedHouse,
  queue,
  queueSpot,
  reservation,
} from "@/drizzle/schema";
import {
  createHauntedHouseSchema,
  updateHauntedHouseSchema,
  createQueueSchema,
  createBatchQueuesSchema,
} from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq, and, notInArray } from "drizzle-orm";
import { createQueueSpots, adjustQueueSpots } from "@/server/queue-operations";
import {
  ActionResponse,
  createActionError,
  createActionSuccess,
} from "@/constants/errors";
import { retryDatabase, retryAuth, retryEmail } from "@/dal/retry";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import REMIND_EMAIL_TEMPLATE from "@/constants/remind-email-template";
import FINAL_CONFIRMATION_EMAIL_TEMPLATE from "@/constants/final-confirmation-template";
import {
  EMAIL_HAUNTED_HOUSE_TICKET_INFO,
  EMAIL_TICKET_INFO,
} from "@/constants/constants";
import { HauntedHouseType, TicketType } from "@/constants/types";

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

    // Check if there's conflicting name and haunted house name
    const conflicting = await retryDatabase(
      () =>
        db.query.queue.findFirst({
          where: and(
            eq(queue.queueNumber, queueNumber ?? existing.queueNumber),
            eq(queue.hauntedHouseName, existing.hauntedHouseName)
          ),
        }),
      "check conflicting queue exists"
    );

    if (conflicting) {
      return createActionError("ALREADY_EXISTS", "Queue already exists");
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

export async function sendRemindEmail({
  studentName,
  email,
}: {
  email: string;
  studentName: string;
}) {
  const authCheck = await verifyAdminAccess();
  if (!authCheck.success) {
    return authCheck;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const htmlContent = REMIND_EMAIL_TEMPLATE({
      studentName,
    });

    const mailOptionsPrivate = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Silencio VII: SPETTACOLO - Nhắc nhở chọn khung giờ nhà ma",
      html: htmlContent,
    };

    try {
      await retryEmail(async () => {
        // Verify transporter configuration before sending
        await transporter.verify();

        const result = await transporter.sendMail(mailOptionsPrivate);

        // Check if messageId exists (indicates successful queuing)
        if (!result.messageId) {
          throw new Error("Failed to send email - no message ID returned");
        }

        // Check accepted recipients
        if (result.accepted.length === 0) {
          throw new Error("No recipients accepted");
        }

        // Log successful send
        console.log(
          `Email sent successfully to ${email}, messageId: ${result.messageId}`
        );
      }, `sending success email to ${email}`);
      return createActionSuccess({
        message: `Email sent successfully to ${email}`,
        email: email,
      });
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      return createActionError("EMAIL_ERROR", "Failed to send email");
    }
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    return createActionError("EMAIL_ERROR", "Failed to send email");
  }
}

export async function assignCustomerWithoutSpotToRemainingAvailableSpotAction(params: {
  customerIds: string[];
}): Promise<ActionResponse> {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.success) {
      return authCheck;
    }

    const { customerIds } = params;

    if (!customerIds || customerIds.length === 0) {
      return createActionError("INVALID_INPUT", "No customers selected");
    }

    // Find available queue spots
    const availableSpots = await retryDatabase(
      () =>
        db.select().from(queueSpot).where(eq(queueSpot.status, "available")),
      "find available spots"
    );

    // Assign spots to customers
    const assignments = [];
    for (let i = 0; i < availableSpots.length; i++) {
      const spot = availableSpots[i];
      if (i < customerIds.length) {
        const customerId = customerIds[i];

        const [updatedSpot] = await retryDatabase(
          () =>
            db
              .update(queueSpot)
              .set({
                customerId,
                status: "occupied",
                occupiedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(queueSpot.id, spot.id))
              .returning(),
          `assign spot ${spot.id} to customer ${customerId}`
        );

        assignments.push(updatedSpot);
      }
    }

    return createActionSuccess({
      message: `Successfully assigned ${assignments.length} customers to spots`,
      assignments,
    });
  } catch (error) {
    console.error("Error assigning customers to spots:", error);
    return createActionError("DATABASE_ERROR", "Failed to assign customers");
  }
}

export async function sendTestConfirmationEmail() {
  const authCheck = await verifyAdminAccess();
  if (!authCheck.success) {
    return authCheck;
  }

  try {
    const customerLists = await retryDatabase(
      () =>
        db.query.customer.findMany({
          with: {
            queueSpots: {
              with: {
                queue: true,
              },
            },
          },
          where: and(
            notInArray(customer.studentId, ["VS054678"]), // me
            eq(customer.hasSentConfirmationEmail, false)
          ),
        }),
      "get customers without queue spots"
    );

    for (const customerVal of customerLists) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        });

        const startTime = customerVal?.queueSpots[0]?.queue?.queueStartTime;
        const endTime = customerVal?.queueSpots[0]?.queue?.queueEndTime;

        const htmlContent = FINAL_CONFIRMATION_EMAIL_TEMPLATE({
          studentName: customerVal?.name || "",
          homeroom: customerVal?.homeroom || "",
          studentId: customerVal?.studentId || "",
          email: customerVal?.email || "",
          ticketType: customerVal?.ticketType || "",
          hauntedHouseName:
            customerVal?.queueSpots[0]?.queue?.hauntedHouseName || "",
          queueNumber:
            customerVal?.queueSpots[0]?.queue?.queueNumber?.toString() || "",
          queueStartTime: startTime
            ? new Date(startTime).toLocaleString("vi-VN")
            : "Không có",
          queueEndTime: endTime
            ? new Date(endTime).toLocaleString("vi-VN")
            : "Không có",
          TicketInfo: EMAIL_TICKET_INFO[customerVal?.ticketType as TicketType],
          HauntedHouseInfo: customerVal?.queueSpots[0]?.queue?.hauntedHouseName
            ? EMAIL_HAUNTED_HOUSE_TICKET_INFO[
                customerVal?.queueSpots[0]?.queue
                  ?.hauntedHouseName as HauntedHouseType
              ]
            : undefined,
        });

        const mailOptionsPrivate = {
          from: process.env.GMAIL_USER,
          to: customerVal.email,
          subject:
            "Silencio VII: SPETTACOLO - Kiểm Tra Thông Tin Trước Sự Kiện",
          html: htmlContent,
        };

        await retryEmail(async () => {
          // Verify transporter configuration before sending
          await transporter.verify();

          const result = await transporter.sendMail(mailOptionsPrivate);

          // Check if messageId exists (indicates successful queuing)
          if (!result.messageId) {
            throw new Error("Failed to send email - no message ID returned");
          }

          // Check accepted recipients
          if (result.accepted.length === 0) {
            throw new Error("No recipients accepted");
          }

          // Log successful send
          console.log(
            `Email sent successfully to ${customerVal.email}, messageId: ${result.messageId}`
          );
        }, `sending test confirmation email to ${customerVal.email}`);

        await db
          .update(customer)
          .set({ hasSentConfirmationEmail: true })
          .where(eq(customer.studentId, customerVal.studentId));

        // Small delay between emails to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `Failed to send test email to ${customerVal.email}:`,
          error
        );
        // Continue with the next email even if one fails
      }
    }
  } catch (error) {
    console.error(`Failed to send test email:`, error);
    return createActionError(
      "EMAIL_ERROR",
      `Failed to send test email: ${error}`
    );
  }
}
