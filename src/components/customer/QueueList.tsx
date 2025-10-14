"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import {
  HauntedHouseWithDetailedQueues,
  QueueWithDetails,
} from "@/lib/types/queue";
import { joinQueue } from "@/server/customer";

interface Props {
  houses: HauntedHouseWithDetailedQueues[];
  customerData: {
    studentId: string;
    name: string;
    email: string;
    homeroom: string;
    ticketType: string;
  };
}

export function QueueList({ houses, customerData }: Props) {
  const queryClient = useQueryClient();

  const joinQueueMutation = useMutation({
    mutationFn: joinQueue,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Successfully joined the queue!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });
      } else {
        toast.error(data.message || "Failed to join queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to join queue");
      console.error(error);
    },
  });

  const handleJoinQueue = (hauntedHouseName: string, queueNumber: number) => {
    joinQueueMutation.mutate({
      hauntedHouseName,
      queueNumber,
      customerData,
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {houses.length === 0 && (
        <Card className="bg-white/90 backdrop-blur">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No haunted houses available yet. Check back later!
            </p>
          </CardContent>
        </Card>
      )}

      {houses.map((house) => (
        <Card key={house.name} className="bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              {house.name}
            </CardTitle>
            <CardDescription>
              {house.queues && house.queues.length > 0
                ? `${house.queues.length} queue${
                    house.queues.length !== 1 ? "s" : ""
                  } available`
                : "No queues available"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {house.queues && house.queues.length > 0 ? (
              <div className="space-y-4">
                {house.queues.map((queue: QueueWithDetails) => {
                  const duration = Math.round(
                    (new Date(queue.queueEndTime).getTime() -
                      new Date(queue.queueStartTime).getTime()) /
                      60000
                  );

                  const hasAvailableSpots = queue.stats.availableSpots > 0;
                  const hasReservations =
                    queue.stats.activeReservations &&
                    queue.stats.activeReservations > 0;

                  return (
                    <div
                      key={`${queue.hauntedHouseName}-${queue.queueNumber}`}
                      className="border rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white"
                    >
                      {/* Queue Header */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-purple-900">
                              Queue {queue.queueNumber}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-purple-700">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(queue.queueStartTime)} -{" "}
                                {formatTime(queue.queueEndTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {duration} min
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() =>
                              handleJoinQueue(
                                queue.hauntedHouseName,
                                queue.queueNumber
                              )
                            }
                            disabled={
                              joinQueueMutation.isPending || !hasAvailableSpots
                            }
                            size="lg"
                            className={
                              hasAvailableSpots
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }
                          >
                            {joinQueueMutation.isPending
                              ? "Joining..."
                              : !hasAvailableSpots
                              ? "Queue Full"
                              : "Join Queue"}
                          </Button>
                        </div>
                      </div>

                      {/* Queue Stats */}
                      <div className="p-4">
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">
                              {queue.stats.availableSpots}
                            </div>
                            <div className="text-xs text-green-600">
                              Available
                            </div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              {queue.stats.occupiedSpots}
                            </div>
                            <div className="text-xs text-blue-600">
                              Occupied
                            </div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">
                              {queue.stats.reservedSpots}
                            </div>
                            <div className="text-xs text-orange-600">
                              Reserved
                            </div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">
                              {queue.stats.totalSpots}
                            </div>
                            <div className="text-xs text-purple-600">Total</div>
                          </div>
                        </div>

                        {/* Visual Spot Representation */}
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-gray-600 mb-2">
                            Queue Spots:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {queue.spots?.slice(0, 30).map((spot) => {
                              const isAvailable = spot.status === "available";
                              const isOccupied = spot.status === "occupied";
                              const isReserved = spot.status === "reserved";

                              return (
                                <div
                                  key={spot.id}
                                  className={`
                                    w-8 h-8 rounded flex items-center justify-center text-xs font-bold
                                    transition-all duration-200
                                    ${
                                      isAvailable
                                        ? "bg-green-500 text-white hover:bg-green-600"
                                        : ""
                                    }
                                    ${
                                      isOccupied ? "bg-blue-500 text-white" : ""
                                    }
                                    ${
                                      isReserved
                                        ? "bg-orange-400 text-white"
                                        : ""
                                    }
                                  `}
                                  title={`Spot #${spot.spotNumber} - ${
                                    spot.status
                                  }${
                                    spot.customer
                                      ? ` (${spot.customer.name})`
                                      : ""
                                  }`}
                                >
                                  {spot.spotNumber}
                                </div>
                              );
                            })}
                            {queue.spots && queue.spots.length > 30 && (
                              <div className="w-8 h-8 rounded flex items-center justify-center text-xs bg-gray-200 text-gray-600">
                                +{queue.spots.length - 30}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reservation Warning */}
                        {hasReservations && (
                          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="text-orange-800">
                              <span className="font-semibold">
                                {queue.stats.activeReservations} active
                                reservation
                                {queue.stats.activeReservations !== 1
                                  ? "s"
                                  : ""}
                              </span>
                              <p className="text-xs mt-1">
                                Some spots are temporarily reserved. You can
                                join with a reservation code or wait for them to
                                become available.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-gray-600">Available</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-gray-600">Occupied</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-orange-400 rounded"></div>
                            <span className="text-gray-600">Reserved</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No queues available yet for this haunted house
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
