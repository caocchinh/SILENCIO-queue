import { NextRequest, NextResponse } from "next/server";
import { getQueueWithAvailability } from "@/lib/utils/queue-operations";

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
