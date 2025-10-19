import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { createApiError, HTTP_STATUS } from "@/constants/errors";
import { verifyCustomerSession } from "@/dal/verifySession";
import { retryDatabase } from "@/dal/retry";
import { updateReservationsStatus } from "@/server/queue-operations";
import { spotStatusUtils } from "@/lib/utils";
import { ReservationWithDetails } from "@/lib/types/queue";

// GET /api/haunted-houses - Get all haunted houses
export async function GET() {
  try {
    const customerSession = await verifyCustomerSession();

    if (!customerSession.session) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Valid customer session required"
      );
    }

    if (
      !customerSession.customer &&
      customerSession.session.user.role !== "admin"
    ) {
      return createApiError(
        "UNAUTHORIZED",
        HTTP_STATUS.FORBIDDEN,
        "Valid customer session required"
      );
    }

    await updateReservationsStatus();

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
                  with: {
                    queue: {
                      with: {
                        hauntedHouse: true,
                      },
                    },
                    representative: true,
                    spots: {
                      with: {
                        queue: {
                          with: {
                            hauntedHouse: true,
                          },
                        },
                        customer: true,
                        reservation: true,
                      },
                    },
                  },
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
          ...spotStatusUtils.calculateStats(queue.spots),
          activeReservations: queue.reservations.length,
        },
        reservations: queue.reservations as ReservationWithDetails[],
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
