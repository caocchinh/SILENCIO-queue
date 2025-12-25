"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Clock,
  Users,
  LogOut,
  Copy,
  CheckCircle,
  AlertTriangle,
  Timer,
  Loader2,
} from "lucide-react";
import {
  QueueSpotWithDetails,
  HauntedHouseWithDetailedQueues,
  Customer,
  QueueWithDetails,
} from "@/lib/types/queue";
import { leaveQueue } from "@/server/customer";
import { cn } from "@/lib/utils";
import { errorToast, successToast, spotStatusUtils } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SelectionDeadlineCountdown } from "./SelectionDeadlineCountdown";
import { RefreshButton } from "@/components/RefreshButton";
import { useCallback } from "react";

interface Props {
  spot: QueueSpotWithDetails;
  isRefetching?: boolean;
  onRefresh?: () => void;
}

export function MyQueueSpot({ spot, isRefetching = false, onRefresh }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isReservationExpiringSoon, setIsReservationExpiringSoon] =
    useState(false);
  const [isLeaveQueueDialogOpen, setIsLeaveQueueDialogOpen] = useState(false);
  const [isDeadlineExpired, setIsDeadlineExpired] = useState(false);

  const handleDeadlineExpiredChange = useCallback((expired: boolean) => {
    setIsDeadlineExpired(expired);
  }, []);

  const leaveQueueMutation = useMutation({
    mutationFn: leaveQueue,
    onSuccess: (data, variables) => {
      if (data.success) {
        successToast({ message: "Left queue successfully" });

        // Update the cache immediately - remove the user's spot
        // Update haunted-houses query
        queryClient.setQueryData<HauntedHouseWithDetailedQueues[]>(
          ["haunted-houses"],
          (old) => {
            if (!old) return old;

            return old.map((house) => {
              if (house.name !== spot.queue?.hauntedHouse?.name) return house;

              return {
                ...house,
                queues: house.queues?.map((queue) => {
                  if (queue.queueNumber !== spot.queue?.queueNumber)
                    return queue;

                  return {
                    ...queue,
                    hauntedHouse: queue.hauntedHouse,
                    spots: queue.spots?.map((queueSpot) => {
                      if (queueSpot.id === spot.id) {
                        const newStatus = spot.reservationId
                          ? "reserved"
                          : "available";
                        return {
                          ...queueSpot,
                          customerId: null,
                          status: newStatus,
                          reservationId: null,
                          occupiedAt: null,
                          customer: undefined,
                        } as QueueSpotWithDetails & { customer?: Customer };
                      }
                      return queueSpot;
                    }),
                    stats: {
                      ...queue.stats,
                      availableSpots: Math.max(
                        0,
                        queue.stats.availableSpots + 1
                      ),
                      occupiedSpots: Math.max(0, queue.stats.occupiedSpots - 1),
                      reservedSpots: spot.reservationId
                        ? Math.max(0, queue.stats.reservedSpots + 1)
                        : queue.stats.reservedSpots,
                    },
                  } as QueueWithDetails;
                }),
              };
            });
          }
        );

        // Update customer-spot query (remove the spot)
        queryClient.setQueryData(["customer-spot", variables.studentId], null);

        // Invalidate queries for consistency
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.studentId],
        });

        setIsLeaveQueueDialogOpen(false);
      } else {
        throw new Error(data.message || "Cannot leave queue");
      }
    },
    onError: (error) => {
      errorToast({
        message: "Cannot leave queue.",
        description: error.message,
      });
    },
  });

  const handleLeaveQueue = () => {
    if (!spot.customerId) return;

    leaveQueueMutation.mutate({
      studentId: spot.customerId,
    });
  };

  const handleCopyCode = () => {
    if (spot.reservation?.code) {
      navigator.clipboard.writeText(spot.reservation.code);
      setCopied(true);
      successToast({ message: "Copied room code to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isRepresentative =
    spot.reservation?.representativeCustomerId === spot.customerId;

  // Update countdown timer every second
  useEffect(() => {
    if (!spot.reservation?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(spot.reservation!.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        router.refresh();
        setTimeRemaining("Expired");
        setIsReservationExpiringSoon(false);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      setTimeRemaining(timeStr);
      setIsReservationExpiringSoon(minutes < 2);
    };

    // Update immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [router, spot.reservation, spot.reservation?.expiresAt]);

  // Calculate queue statistics
  const allSpots = spot.queue?.spots || [];
  const { availableSpots, occupiedSpots, reservedSpots, totalSpots } =
    spotStatusUtils.calculateStats(allSpots);

  // Get list of people in queue (occupied spots only, since we are not showing reserved spots)
  const peopleInQueue = allSpots
    .filter((s) => spotStatusUtils.isOccupied(s))
    .map((s) => ({
      spotNumber: s.spotNumber,
      customer: s.customer!,
      isYou: s.customerId === spot.customerId,
    }));

  // Get people in the same reservation if applicable
  const peopleInReservation =
    spot.reservation?.spots
      ?.filter((s) => s.customer)
      .map((s) => ({
        spotNumber: s.spotNumber,
        customer: s.customer!,
        isYou: s.customerId === spot.customerId,
        isRepresentative:
          s.customerId === spot.reservation?.representativeCustomerId,
      })) || [];

  const spotsNeededForReservation = spot.reservation
    ? spot.reservation.maxSpots - spot.reservation.currentSpots
    : 0;

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 min-w-xl">
      <SelectionDeadlineCountdown
        onExpiredChange={handleDeadlineExpiredChange}
        title="Timeleft to manage your spot"
        description="You cannot leave your spot."
      />
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-500">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle
                className={cn(
                  "text-2xl",
                  isDeadlineExpired ? "text-gray-500" : "text-green-700"
                )}
              >
                {isDeadlineExpired
                  ? "⚠ Deadline reached"
                  : `✓ You are in ${spot.reservation ? "room" : "spot"}!`}
              </CardTitle>
              <CardDescription>
                {isDeadlineExpired
                  ? "You cannot leave your spot"
                  : "Your spot has been reserved"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton
                onClick={handleRefresh}
                isLoading={isRefetching}
                className="text-green-600 !bg-transparent border-1 hover:text-green-700 border-green-200 hover:border-green-300"
              >
                Refresh
              </RefreshButton>
              <AlertDialog
                open={isLeaveQueueDialogOpen}
                onOpenChange={setIsLeaveQueueDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className={cn(
                      "cursor-pointer",
                      isDeadlineExpired && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={leaveQueueMutation.isPending || isDeadlineExpired}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isDeadlineExpired
                      ? "Deadline reached"
                      : `Leave ${spot.reservation ? "room" : "spot"}`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Leave {spot.reservation ? "room" : "spot"}
                      {}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isRepresentative ? (
                        <>
                          You are the representative? Leaving will{" "}
                          <strong>cancel the entire room</strong> and release
                          all slots (including other people in your room).
                        </>
                      ) : spot.reservation ? (
                        <>
                          You will be leaving the room. The room will continue
                          to be available for other members to join.
                        </>
                      ) : (
                        <>
                          Are you sure you want to leave this spot? Your spot
                          will become available for others.
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className="cursor-pointer"
                      disabled={leaveQueueMutation.isPending}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      onClick={handleLeaveQueue}
                      className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                      disabled={leaveQueueMutation.isPending}
                    >
                      {leaveQueueMutation.isPending ? (
                        <>
                          Leaving...
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Yes, leave spot"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold">
                  Haunted House {spot.queue?.hauntedHouse?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Queue {spot.queue?.queueNumber}
                </p>
              </div>
            </div>

            {spot.queue?.queueStartTime && spot.queue?.queueEndTime && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Your Haunted House timeframe</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(spot.queue.queueStartTime).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}{" "}
                    -{" "}
                    {new Date(spot.queue.queueEndTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ( Duration{" "}
                    {Math.round(
                      (new Date(spot.queue.queueEndTime).getTime() -
                        new Date(spot.queue.queueStartTime).getTime()) /
                        60000
                    )}{" "}
                    mins )
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Please arrive 15 minutes early on the event day to wait for
                  your turn.
                </p>
                {isRepresentative && (
                  <p className="text-sm text-orange-600 font-medium mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    You are the representative. If you leave, the entire group
                    and room will be cancelled.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservation Details for ALL Members */}
      {spot.reservation && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-400">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Room Details / Reservation
                {isRepresentative && (
                  <span className="text-sm bg-purple-600 text-white px-2 py-0.5 rounded">
                    Representative
                  </span>
                )}
              </CardTitle>
              <RefreshButton
                onClick={handleRefresh}
                isLoading={isRefetching}
                className="text-purple-600 !bg-transparent border-1 hover:text-purple-700 border-purple-200 hover:border-purple-300"
              >
                Refresh
              </RefreshButton>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reservation Code - Visible to ALL members */}
            <div className="bg-white border-2 border-purple-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-purple-900">
                  Room Code
                </p>
                {spot.reservation.status === "active" && timeRemaining && (
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold",
                      isReservationExpiringSoon
                        ? "bg-red-500 text-white"
                        : "bg-purple-100 text-purple-700"
                    )}
                  >
                    <Timer className="h-3 w-3" />
                    {timeRemaining}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-3xl font-mono font-bold text-purple-900 tracking-wider">
                  {spot.reservation.code}
                </p>
                <Button
                  onClick={handleCopyCode}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "border-purple-300 cursor-pointer",
                    isDeadlineExpired && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isDeadlineExpired}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : isDeadlineExpired ? (
                    "Deadline reached"
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                {isDeadlineExpired
                  ? "Deadline reached - no further actions possible"
                  : "Share this code with members to join. When full, the room dissolves and your group joins the queue normally."}
              </p>
            </div>

            {/* Reservation Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Group Progress</span>
                <span className="text-sm">
                  {spot.reservation.currentSpots} / {spot.reservation.maxSpots}{" "}
                  joined
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all",
                    spot.reservation.currentSpots >= spot.reservation.maxSpots
                      ? "bg-green-500"
                      : isReservationExpiringSoon
                      ? "bg-red-500"
                      : "bg-purple-500"
                  )}
                  style={{
                    width: `${
                      (spot.reservation.currentSpots /
                        spot.reservation.maxSpots) *
                      100
                    }%`,
                  }}
                ></div>
              </div>

              {spotsNeededForReservation > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm",
                    isReservationExpiringSoon
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : "bg-blue-50 border border-blue-200 text-blue-800"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Need {spotsNeededForReservation} more{" "}
                      {spotsNeededForReservation === 1 ? "person" : "people"}
                    </p>
                    <p className="text-xs mt-1">
                      If the group is not full before countdown ends, ALL spots
                      will be released and the room cancelled.
                    </p>
                  </div>
                </div>
              )}

              {spot.reservation.currentSpots >= spot.reservation.maxSpots && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="font-semibold">
                    Reservation complete! All spots filled.
                  </p>
                </div>
              )}
            </div>

            {/* People in Reservation */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Members ({peopleInReservation.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {peopleInReservation.map((person) => (
                  <div
                    key={person.spotNumber}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg text-sm",
                      person.isYou
                        ? "bg-green-100 border border-green-300"
                        : "bg-purple-50 border border-purple-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          person.isYou
                            ? "bg-green-500 text-white"
                            : "bg-purple-500 text-white"
                        )}
                      >
                        #{person.spotNumber}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {person.customer.name}
                          {person.isYou && (
                            <span className="ml-1 text-green-600">(You)</span>
                          )}
                          {person.isRepresentative && (
                            <span className="ml-1 text-purple-600">
                              ★ Representative
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {person.customer.studentId} •{" "}
                          {person.customer.homeroom}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Statistics Card */}
      <Card className="bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Your Queue Statistics</CardTitle>
          <CardDescription>
            Haunted House {spot.queue?.hauntedHouse?.name} - Queue{" "}
            {spot.queue?.queueNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {availableSpots}
              </div>
              <div className="text-xs text-green-600">Available</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">
                {occupiedSpots}
              </div>
              <div className="text-xs text-blue-600">Occupied</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">
                {reservedSpots}
              </div>
              <div className="text-xs text-orange-600">Reserved</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">
                {totalSpots}
              </div>
              <div className="text-xs text-purple-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People in Queue Card */}
      <Card className="bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            People in Queue ({occupiedSpots})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {peopleInQueue.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No one in this queue yet
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {peopleInQueue.map((person) => (
                <div
                  key={person.spotNumber}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    person.isYou
                      ? "bg-green-50 border-green-300 shadow-sm"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                        person.isYou
                          ? "bg-green-500 text-white"
                          : "bg-blue-500 text-white"
                      )}
                    >
                      #{person.spotNumber}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {person.customer.name === "Cao Cự Chính"
                          ? person.customer.name
                          : "REDACTED"}
                        {person.isYou && (
                          <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        {" "}
                        • Ticket {person.customer.ticketType}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
