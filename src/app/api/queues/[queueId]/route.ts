import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { queue } from "@/drizzle/schema";
import { updateQueueSchema } from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import {
  getQueueWithAvailability,
  adjustQueueSpots,
} from "@/lib/utils/queue-operations";

type Params = Promise<{ queueId: string }>;

// GET /api/queues/[queueId] - Get a specific queue with availability
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { queueId } = await params;

    const queueData = await getQueueWithAvailability(queueId);

    if (!queueData) {
      return NextResponse.json(
        {
          success: false,
          error: "Queue not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: queueData,
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch queue",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/queues/[queueId] - Update a queue (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
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

    const { queueId } = await params;

    const body = await request.json();
    const validationResult = updateQueueSchema.safeParse({
      ...body,
      queueId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { queueNumber, maxCustomers } = validationResult.data;

    // Check if queue exists
    const existing = await db.query.queue.findFirst({
      where: eq(queue.id, queueId),
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Queue not found",
        },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update queue",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/queues/[queueId] - Delete a queue (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
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

    const { queueId } = await params;

    // Check if queue exists
    const existing = await db.query.queue.findFirst({
      where: eq(queue.id, queueId),
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Queue not found",
        },
        { status: 404 }
      );
    }

    await db.delete(queue).where(eq(queue.id, queueId));

    return NextResponse.json({
      success: true,
      data: { message: "Queue deleted successfully" },
    });
  } catch (error) {
    console.error("Error deleting queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete queue",
      },
      { status: 500 }
    );
  }
}
