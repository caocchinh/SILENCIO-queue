import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { hauntedHouse } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type Params = Promise<{ name: string }>;

// GET /api/haunted-houses/[name] - Get a specific haunted house
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const house = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, decodedName),
      with: {
        queues: {
          with: {
            spots: true,
            reservations: {
              where: (reservation, { eq }) => eq(reservation.status, "active"),
            },
          },
        },
      },
    });

    if (!house) {
      return NextResponse.json(
        {
          success: false,
          error: "Haunted house not found",
        },
        { status: 404 }
      );
    }

    const houseWithStats = {
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
    };

    return NextResponse.json({
      success: true,
      data: houseWithStats,
    });
  } catch (error) {
    console.error("Error fetching haunted house:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch haunted house",
      },
      { status: 500 }
    );
  }
}
