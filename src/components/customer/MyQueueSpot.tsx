"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  AlertDialogAction,
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
  Ticket as TicketIcon,
  LogOut,
} from "lucide-react";
import { QueueSpotWithDetails } from "@/lib/types/queue";
import { leaveQueue } from "@/server/customer";

interface Props {
  spot: QueueSpotWithDetails;
}

export function MyQueueSpot({ spot }: Props) {
  const queryClient = useQueryClient();

  const leaveQueueMutation = useMutation({
    mutationFn: leaveQueue,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully left the queue");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.studentId],
        });
      } else {
        toast.error(data.message || "Failed to leave queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to leave queue");
      console.error(error);
    },
  });

  const handleLeaveQueue = () => {
    if (!spot.customerId) return;

    leaveQueueMutation.mutate({
      studentId: spot.customerId,
    });
  };

  const isRepresentative =
    spot.reservation?.representativeCustomerId === spot.customerId;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl text-green-700">
              ✓ You&apos;re in the Queue!
            </CardTitle>
            <CardDescription>Your spot has been reserved</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={leaveQueueMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave Queue
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Queue?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isRepresentative ? (
                    <>
                      You are the representative of a reservation. Leaving will{" "}
                      <strong>cancel the entire reservation</strong> and release
                      all spots (including those of people who already joined).
                    </>
                  ) : spot.reservation ? (
                    <>
                      You will be removed from this group reservation. The
                      reservation will continue for other members.
                    </>
                  ) : (
                    <>
                      Are you sure you want to leave this queue? Your spot will
                      become available for others.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveQueue}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {leaveQueueMutation.isPending
                    ? "Leaving..."
                    : "Yes, Leave Queue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold">{spot.queue?.hauntedHouse?.name}</p>
              <p className="text-sm text-muted-foreground">
                Queue {spot.queue?.queueNumber} - Spot #{spot.spotNumber}
              </p>
            </div>
          </div>

          {spot.queue?.queueStartTime && spot.queue?.queueEndTime && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold">
                  {Math.round(
                    (new Date(spot.queue.queueEndTime).getTime() -
                      new Date(spot.queue.queueStartTime).getTime()) /
                      60000
                  )}{" "}
                  minutes
                </p>
                <p className="text-sm text-muted-foreground">
                  Experience duration
                </p>
              </div>
            </div>
          )}

          {spot.reservation && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-semibold">Group Reservation</p>
                <p className="text-sm text-muted-foreground">
                  {spot.reservation.currentSpots} / {spot.reservation.maxSpots}{" "}
                  people joined
                </p>
              </div>
            </div>
          )}

          {spot.occupiedAt && (
            <div className="flex items-center gap-3">
              <TicketIcon className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold">Joined</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(spot.occupiedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Please wait for your turn and have your ticket ready!
              </p>
              {isRepresentative && (
                <p className="text-sm text-orange-600 font-medium mt-2">
                  ⚠️ You are the representative - leaving will cancel the entire
                  reservation
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
