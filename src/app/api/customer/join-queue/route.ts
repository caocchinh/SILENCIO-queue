import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queueSpot } from "@/drizzle/schema";
import { joinQueueSchema } from "@/lib/validations/queue";
import { eq } from "drizzle-orm";
import {
  customerHasQueueSpot,
  findFirstAvailableSpot,
  getOrCreateCustomer,
} from "@/lib/utils/queue-operations";

// POST /api/customer/join-queue - Join a queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = joinQueueSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { queueId, customerData } = validationResult.data;

    // Check if customer already has a queue spot
    const hasSpot = await customerHasQueueSpot(customerData.studentId);
    if (hasSpot) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already in a queue",
        },
        { status: 400 }
      );
    }

    // Find first available spot
    const spot = await findFirstAvailableSpot(queueId);
    if (!spot) {
      return NextResponse.json(
        {
          success: false,
          error: "No available spots in this queue",
        },
        { status: 400 }
      );
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(customerData);

    // Assign customer to spot
    const [updatedSpot] = await db
      .update(queueSpot)
      .set({
        customerId: customer.studentId,
        status: "occupied",
        occupiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueSpot.id, spot.id))
      .returning();

    // Fetch the complete spot with relations
    const completeSpot = await db.query.queueSpot.findFirst({
      where: eq(queueSpot.id, updatedSpot.id),
      with: {
        queue: {
          with: {
            hauntedHouse: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: completeSpot,
    });
  } catch (error) {
    console.error("Error joining queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to join queue",
      },
      { status: 500 }
    );
  }
}
