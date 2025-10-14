import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { hauntedHouse } from "@/drizzle/schema";
import { updateHauntedHouseSchema } from "@/lib/validations/queue";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
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

// PATCH /api/haunted-houses/[name] - Update a haunted house (Admin only)
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

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const body = await request.json();
    const validationResult = updateHauntedHouseSchema.safeParse({
      ...body,
      name: decodedName,
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

    const { duration } = validationResult.data;

    // Check if haunted house exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, decodedName),
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Haunted house not found",
        },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(hauntedHouse)
      .set({
        duration: duration ?? existing.duration,
        updatedAt: new Date(),
      })
      .where(eq(hauntedHouse.name, decodedName))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating haunted house:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update haunted house",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/haunted-houses/[name] - Delete a haunted house (Admin only)
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

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    // Check if haunted house exists
    const existing = await db.query.hauntedHouse.findFirst({
      where: eq(hauntedHouse.name, decodedName),
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Haunted house not found",
        },
        { status: 404 }
      );
    }

    await db.delete(hauntedHouse).where(eq(hauntedHouse.name, decodedName));

    return NextResponse.json({
      success: true,
      data: { message: "Haunted house deleted successfully" },
    });
  } catch (error) {
    console.error("Error deleting haunted house:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete haunted house",
      },
      { status: 500 }
    );
  }
}
