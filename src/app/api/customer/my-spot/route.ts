import { NextRequest, NextResponse } from "next/server";
import { getCustomerQueueSpot } from "@/lib/utils/queue-operations";

// GET /api/customer/my-spot?studentId=xxx - Get customer's current queue spot
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID is required",
        },
        { status: 400 }
      );
    }

    const spot = await getCustomerQueueSpot(studentId);

    if (!spot) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: spot,
    });
  } catch (error) {
    console.error("Error fetching customer spot:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer spot",
      },
      { status: 500 }
    );
  }
}
