import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";

// GET /api/haunted-houses - Get all haunted houses
export async function GET() {
  try {
    const houses = await db.query.hauntedHouse.findMany({
      with: {
        queues: {
          with: {
            spots: true,
          },
        },
      },
      orderBy: (hauntedHouse, { asc }) => [asc(hauntedHouse.name)],
    });

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
        },
      })),
    }));

    return NextResponse.json({
      success: true,
      data: housesWithStats,
    });
  } catch (error) {
    console.error("Error fetching haunted houses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch haunted houses",
      },
      { status: 500 }
    );
  }
}
