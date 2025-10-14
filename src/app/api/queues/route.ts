import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queue } from "@/drizzle/schema";
import { createQueueSchema } from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import {
  generateQueueId,
  createQueueSpots,
} from "@/lib/utils/queue-operations";

// POST /api/queues - Create a new queue (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Admin access required",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createQueueSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
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

    return NextResponse.json(
      {
        success: true,
        data: newQueue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create queue",
      },
      { status: 500 }
    );
  }
}
