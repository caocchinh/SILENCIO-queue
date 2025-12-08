"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Calendar, Loader2, AlertCircle, Mail } from "lucide-react";
import {
  HauntedHouseWithDetailedQueues,
  QueueWithDetails,
  QueueSpotWithDetails,
  Customer,
} from "@/lib/types/queue";
import { joinQueue } from "@/server/customer";
import { useState } from "react";
import { cn, errorToast, successToast, spotStatusUtils } from "@/lib/utils";
import { useCallback } from "react";
import { SelectionDeadlineCountdown } from "./SelectionDeadlineCountdown";
import { ReservationDetails } from "./ReservationDetails";
import { RefreshButton } from "@/components/RefreshButton";

interface Props {
  houses: HauntedHouseWithDetailedQueues[];
  customerData: {
    studentId: string;
    name: string;
    email: string;
    homeroom: string;
    ticketType: string;
  };
  onRefresh?: () => void;
  isRefetching?: boolean;
}

// Utility function to calculate duration in minutes between two dates
const calculateDurationInMinutes = (
  startTime: Date | string,
  endTime: Date | string
): number => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / 60000);
};

export function QueueList({
  houses,
  customerData,
  onRefresh,
  isRefetching = false,
}: Props) {
  const queryClient = useQueryClient();
  const [isConfrmDialogOpen, setIsConfrmDialogOpen] = useState(false);
  const [dialogDisplayQueue, setDialogDisplayQueue] =
    useState<QueueWithDetails | null>(null);
  const [isDeadlineExpired, setIsDeadlineExpired] = useState(false);

  const handleDeadlineExpiredChange = useCallback((expired: boolean) => {
    setIsDeadlineExpired(expired);
  }, []);

  const joinQueueMutation = useMutation({
    mutationFn: joinQueue,
    onSuccess: (data) => {
      if (data.success) {
        successToast({
          message: "Thành công tham gia lượt!",
        });

        // Update the cache immediately by modifying existing data
        // Get current haunted-houses data
        const currentHauntedHouses = queryClient.getQueryData<
          HauntedHouseWithDetailedQueues[]
        >(["haunted-houses"]);

        if (currentHauntedHouses) {
          // Find the target queue and available spot
          const targetHouse = currentHauntedHouses.find(
            (house) => house.name === dialogDisplayQueue?.hauntedHouseName
          );

          const targetQueue = targetHouse?.queues?.find(
            (queue) => queue.queueNumber === dialogDisplayQueue?.queueNumber
          );

          const availableSpot = targetQueue?.spots?.find(
            (spot) => spot.status === "available"
          );

          if (targetQueue && availableSpot && targetHouse) {
            // Create the customer spot data only, no need to update the haunted-houses, it will be handled in MyQueueSpot.tsx. Avoid unnecessary complexity.
            const customerSpot: QueueSpotWithDetails = {
              id: availableSpot.id,
              queueId: targetQueue.id,
              spotNumber: availableSpot.spotNumber,
              status: "occupied",
              customerId: customerData.studentId,
              reservationId: null,
              occupiedAt: new Date(),
              createdAt: availableSpot.createdAt || new Date(),
              updatedAt: new Date(),
              queue: {
                ...targetQueue,
                hauntedHouse: targetHouse,
                spots: targetQueue.spots?.map((spot) => {
                  if (spot.id === availableSpot.id) {
                    return {
                      ...spot,
                      status: "occupied" as const,
                      reservationId: null,
                      customerId: customerData.studentId,
                      occupiedAt: new Date(),
                      customer: {
                        studentId: customerData.studentId,
                        name: customerData.name,
                        email: customerData.email,
                        homeroom: customerData.homeroom,
                        ticketType: customerData.ticketType,
                      } as Customer,
                    };
                  }
                  return spot;
                }),
                stats: {
                  ...targetQueue.stats,
                  availableSpots: Math.max(
                    0,
                    targetQueue.stats.availableSpots - 1
                  ),
                  occupiedSpots: targetQueue.stats.occupiedSpots + 1,
                },
              } as QueueWithDetails,
              customer: {
                studentId: customerData.studentId,
                name: customerData.name,
                email: customerData.email,
                homeroom: customerData.homeroom,
                ticketType: customerData.ticketType,
              } as Customer,
            };

            // Update customer-spot query
            queryClient.setQueryData(
              ["customer-spot", customerData.studentId],
              customerSpot
            );
          }
        }

        // Invalidate queries for consistency
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });

        setIsConfrmDialogOpen(false);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 0);
      } else {
        errorToast({
          message: "Thất bại tham gia lượt",
          description: "message" in data ? data.message : "Unknown error",
        });
      }
    },
    onError: (error) => {
      errorToast({
        message: "Thất bại tham gia lượt",
        description: error.message,
      });
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

  const [currentHauntedHouseName, setCurrentHauntedHouseName] =
    useState<string>(houses[0]?.name || "");

  const currentHauntedHouse = houses.find(
    (house) => house.name === currentHauntedHouseName
  );

  const handleSelectHauntedHouse = (hauntedHouseName: string) => {
    setCurrentHauntedHouseName(hauntedHouseName);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <SelectionDeadlineCountdown
          onExpiredChange={handleDeadlineExpiredChange}
        />
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-4 p-4 text-blue-900">
            <Mail className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Event Reminder</p>
              <p className="text-sm">
                We will be sending a mass email with your ticket and queue
                position before the event starts. Please check your inbox!
              </p>
            </div>
          </CardContent>
        </Card>
        {houses.length === 0 && (
          <Card className="bg-white/90 backdrop-blur">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No available haunted house. Please check again later!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 mt-2 -mb-7 justify-center flex-wrap">
          {houses.map((house) => (
            <Button
              key={house.name}
              onClick={() => handleSelectHauntedHouse(house.name)}
              className={cn(
                currentHauntedHouseName === house.name
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300",
                "cursor-pointer"
              )}
            >
              {house.name}
            </Button>
          ))}
        </div>

        {currentHauntedHouse && (
          <Card className="bg-transparent border-0">
            <CardHeader className="bg-gradient-to-br from-purple-50 via-white to-purple-50/80 backdrop-blur-md p-6 rounded-xl shadow-lg border-2 border-purple-200/50 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-pink-400/5 opacity-50"></div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-300/20 to-transparent rounded-full -translate-y-10 translate-x-10"></div>

              <div className="relative z-10">
                <CardTitle className="text-3xl font-bold flex items-center gap-3 text-purple-900 mb-2">
                  Haunted house {currentHauntedHouse.name}
                </CardTitle>
                <CardDescription className="text-lg text-purple-700/80 font-medium">
                  {currentHauntedHouse.queues &&
                  currentHauntedHouse.queues.length > 0
                    ? `${
                        currentHauntedHouse.queues.filter(
                          (queue) => queue.stats.availableSpots > 0
                        ).length
                      } available queue left`
                    : "No slot available"}
                </CardDescription>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400 rounded-b-xl"></div>
            </CardHeader>
            <CardContent className="p-0">
              {currentHauntedHouse.queues &&
              currentHauntedHouse.queues.filter(
                (queue) => queue.stats.totalSpots > 0
              ).length > 0 ? (
                <div className="w-full flex flex-col gap-4">
                  {currentHauntedHouse.queues.map((queue: QueueWithDetails) => {
                    const duration = calculateDurationInMinutes(
                      queue.queueStartTime,
                      queue.queueEndTime
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
                          <div className="flex items-center justify-between sm:flex-row flex-col gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-purple-900">
                                Queue {queue.queueNumber}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-purple-700 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(queue.queueStartTime)} -{" "}
                                  {formatTime(queue.queueEndTime)}
                                </span>
                                -
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {duration} minutes
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:w-max w-full">
                              <RefreshButton
                                onClick={onRefresh}
                                isLoading={isRefetching}
                                className="bg-purple-600 hover:bg-purple-700 text-white sm:w-max w-1/2"
                              />
                              <Button
                                disabled={
                                  joinQueueMutation.isPending ||
                                  !hasAvailableSpots ||
                                  isDeadlineExpired
                                }
                                onClick={() => {
                                  setDialogDisplayQueue(queue);
                                  setIsConfrmDialogOpen(true);
                                }}
                                size="lg"
                                className={cn(
                                  "cursor-pointer sm:w-max w-1/2",
                                  hasAvailableSpots && !isDeadlineExpired
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "",
                                  isDeadlineExpired &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {joinQueueMutation.isPending
                                  ? "Joining room..."
                                  : !hasAvailableSpots
                                  ? "Room is full"
                                  : isDeadlineExpired
                                  ? "Deadline has reached"
                                  : "Join room"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Queue Stats */}
                        <div className="p-4">
                          <div className="grid sm:grid-cols-4 grid-cols-2 gap-2 mb-4">
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
                              <div className="text-xs text-purple-600">
                                Total
                              </div>
                            </div>
                          </div>

                          {/* Visual Spot Representation */}
                          <div className="mb-4">
                            <div className="text-xs font-semibold text-gray-600 mb-2">
                              Slot distributiion:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {queue.spots
                                ?.sort((a, b) => a.spotNumber - b.spotNumber)
                                .slice(0, 30)
                                .map((spot) => {
                                  const {
                                    isAvailable,
                                    isOccupied,
                                    isReserved,
                                  } = spotStatusUtils.getDisplayStatus(spot);

                                  const status = isAvailable
                                    ? "Có sẵn"
                                    : isOccupied
                                    ? "Đã có người"
                                    : "Đã bị giữ slot";

                                  return (
                                    <div
                                      key={spot.id}
                                      className={cn(
                                        "w-8 h-8 rounded cursor-default flex items-center justify-center text-xs font-bold transition-all duration-200",
                                        isAvailable &&
                                          "bg-green-500 text-white hover:bg-green-600",
                                        isOccupied && "bg-blue-500 text-white",
                                        isReserved && "bg-orange-400 text-white"
                                      )}
                                      title={`Chỗ #${
                                        spot.spotNumber
                                      } - ${status}${
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

                          {/* Reservation Details */}
                          {!!hasReservations && queue.reservations && (
                            <div className="space-y-3">
                              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div className="text-orange-800">
                                  <span className="font-semibold">
                                    {queue.stats.activeReservations} queue is
                                    reserved
                                    {queue.stats.activeReservations !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                  <p className="text-xs mt-1">
                                    Some slots are reserved temporarily. You can
                                    join with the queue code or wait for the
                                    other person&apos;s queue to expire.
                                  </p>
                                </div>
                              </div>
                              {queue.reservations.map((reservation) => (
                                <ReservationDetails
                                  key={reservation.id}
                                  reservation={reservation}
                                  className="w-full"
                                  onRefresh={onRefresh}
                                  isRefetching={isRefetching}
                                />
                              ))}
                            </div>
                          )}

                          {/* Legend */}
                          <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                            <div className="flex items-center gap-1 min-w-[100px]">
                              <div className="w-4 h-4 bg-green-500 rounded"></div>
                              <span className="text-gray-600">Available</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-[100px]">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="text-gray-600">Occupied</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-[100px]">
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
                  No available queue
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <AlertDialog
        open={isConfrmDialogOpen}
        onOpenChange={setIsConfrmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm join queue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to join{" "}
              <strong>queue {dialogDisplayQueue?.queueNumber}</strong> of{" "}
              <strong>{dialogDisplayQueue?.hauntedHouseName}</strong>?
              <br />
              <br />
              This queue runs for{" "}
              {dialogDisplayQueue?.queueStartTime &&
              dialogDisplayQueue?.queueEndTime
                ? calculateDurationInMinutes(
                    dialogDisplayQueue.queueStartTime,
                    dialogDisplayQueue.queueEndTime
                  )
                : null}{" "}
              minutes, running from{" "}
              <strong className="text-red-500">
                {" "}
                {dialogDisplayQueue?.queueStartTime
                  ? formatTime(dialogDisplayQueue.queueStartTime)
                  : null}{" "}
                to{" "}
                {dialogDisplayQueue?.queueEndTime
                  ? formatTime(dialogDisplayQueue.queueEndTime)
                  : null}
                .
              </strong>
              <br />
              <br />
              Make sure you are ready and will be there on time.
              <br />
              <br />
              {!isDeadlineExpired &&
                " You can still change your queue and Haunted House before the countdown ends."}
              {isDeadlineExpired &&
                " Deadline is reached, you are unable to change your decision."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={joinQueueMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              disabled={joinQueueMutation.isPending || isDeadlineExpired}
              onClick={() => {
                handleJoinQueue(
                  dialogDisplayQueue?.hauntedHouseName || "",
                  dialogDisplayQueue?.queueNumber || 0
                );
              }}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                isDeadlineExpired && "opacity-50 cursor-not-allowed"
              )}
            >
              {!joinQueueMutation.isPending ? (
                isDeadlineExpired ? (
                  "Deadline is reached"
                ) : (
                  "Confirm join"
                )
              ) : (
                <>
                  Joining...
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
