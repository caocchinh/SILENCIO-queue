import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { createApiError, HTTP_STATUS } from "@/constants/errors";
import { verifyCustomerSession } from "@/dal/verifySession";
import { retryDatabase } from "@/dal/retry";

// GET /api/haunted-houses - Get all haunted houses
export async function GET() {
  try {
    const session = await verifyCustomerSession();

    if (
      session.session === null ||
      (session.customer === null && session.session.user.role !== "admin")
    ) {
      return createApiError("UNAUTHORIZED", HTTP_STATUS.FORBIDDEN);
    }
    const houses = await retryDatabase(
      () =>
        db.query.hauntedHouse.findMany({
          with: {
            queues: {
              with: {
                spots: {
                  with: {
                    customer: true,
                  },
                },
                reservations: {
                  where: (reservation, { eq }) =>
                    eq(reservation.status, "active"),
                },
              },
              orderBy: (queue, { asc }) => [asc(queue.queueNumber)],
            },
          },
          orderBy: (hauntedHouse, { asc }) => [asc(hauntedHouse.name)],
        }),
      "fetch all haunted houses"
    );

    const housesWithStats = houses.map((house) => ({
      ...house,
      queues: house.queues.map((queue) => ({
        ...queue,
        stats: {
          availableSpots: queue.spots.filter((s) => s.status === "available")
            .length,
          occupiedSpots: queue.spots.filter((s) => s.status === "occupied")
            .length,
          reservedSpots: queue.spots.filter((s) => s.status === "reserved")
            .length,
          totalSpots: queue.spots.length,
          activeReservations: queue.reservations.length,
        },
      })),
    }));

    return NextResponse.json(
      {
        success: true,
        data: housesWithStats,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Error fetching haunted houses:", error);
    return createApiError(
      "DATABASE_ERROR",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch haunted houses"
    );
  }
}
