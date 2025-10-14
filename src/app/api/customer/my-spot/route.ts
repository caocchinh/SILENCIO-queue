import { NextRequest, NextResponse } from "next/server";
import { getCustomerQueueSpot } from "@/server/queue-operations";
import { createApiError, HTTP_STATUS } from "@/constants/errors";

// GET /api/customer/my-spot?studentId=xxx - Get customer's current queue spot
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return createApiError(
        "INVALID_INPUT",
        HTTP_STATUS.BAD_REQUEST,
        "Student ID is required"
      );
    }

    const spot = await getCustomerQueueSpot(studentId);

    if (!spot) {
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        { status: HTTP_STATUS.OK }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: spot,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching customer spot:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch customer spot"
    );
  }
}
