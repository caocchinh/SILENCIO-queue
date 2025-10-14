import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { hauntedHouse } from "@/drizzle/schema";
import { createHauntedHouseSchema } from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

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

// POST /api/haunted-houses - Create a new haunted house (Admin only)
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
    const validationResult = createHauntedHouseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { name, duration } = validationResult.data;

    // Check if haunted house already exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, name),
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "A haunted house with this name already exists",
        },
        { status: 400 }
      );
    }

    const [newHouse] = await db
      .insert(hauntedHouse)
      .values({
        name,
        duration,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newHouse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating haunted house:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create haunted house",
      },
      { status: 500 }
    );
  }
}
