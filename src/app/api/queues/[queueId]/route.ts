import { NextRequest, NextResponse } from "next/server";
import { getQueueWithAvailability } from "@/server/queue-operations";
import { createApiError, HTTP_STATUS } from "@/constants/errors";

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
      return createApiError(
        "NOT_FOUND",
        HTTP_STATUS.NOT_FOUND,
        "Queue not found"
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: queueData,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching queue:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch queue"
    );
  }
}
