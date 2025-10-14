"use client";

import { useState } from "react";
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
import { Users, Clock, AlertTriangle, Info } from "lucide-react";
import {
  HauntedHouseWithDetailedQueues,
  QueueWithDetails,
} from "@/lib/types/queue";
import { createReservation } from "@/server/customer";

interface Props {
  houses: HauntedHouseWithDetailedQueues[];
  customerData: {
    studentId: string;
    name: string;
    email: string;
    homeroom: string;
    ticketType: string;
  };
  reservationAttempts: number;
}

export function ReservationForm({
  houses,
  customerData,
  reservationAttempts,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedHouse, setSelectedHouse] = useState("");
  const [selectedQueueNumber, setSelectedQueueNumber] = useState<number | "">(
    ""
  );
  const [maxSpots, setMaxSpots] = useState(2);

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (data) => {
      if (data.success) {
        const reservationCode = (data.data as { code?: string })?.code || "N/A";
        toast.success(
          <div className="flex flex-col gap-2">
            <p className="font-bold">Reservation created successfully!</p>
            <p className="text-2xl font-mono bg-white px-3 py-2 rounded text-black">
              {reservationCode}
            </p>
            <p className="text-xs">Share this code with your group members</p>
          </div>,
          {
            duration: 15000,
          }
        );
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });
        // Reset form
        setSelectedHouse("");
        setSelectedQueueNumber("");
        setMaxSpots(2);
      } else {
        toast.error(data.message || "Failed to create reservation");
      }
    },
    onError: (error) => {
      toast.error("Failed to create reservation");
      console.error(error);
    },
  });

  const handleCreateReservation = () => {
    if (!selectedHouse || selectedQueueNumber === "") return;

    createReservationMutation.mutate({
      hauntedHouseName: selectedHouse,
      queueNumber: selectedQueueNumber as number,
      maxSpots,
      customerData,
    });
  };

  const selectedHouseData = houses.find((h) => h.name === selectedHouse);
  const availableQueues =
    selectedHouseData?.queues?.filter(
      (q) => q.stats.availableSpots >= maxSpots
    ) || [];

  const selectedQueue = selectedHouseData?.queues?.find(
    (q) => q.queueNumber === selectedQueueNumber
  );

  const cannotCreateReservation =
    reservationAttempts >= 2 ||
    !selectedHouse ||
    selectedQueueNumber === "" ||
    (selectedQueue && selectedQueue.stats.availableSpots < maxSpots);

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create Group Reservation
        </CardTitle>
        <CardDescription>
          Reserve multiple spots for you and your friends. You&apos;ll get a
          code they can use to join. Each person adds 5 minutes to the
          expiration time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Haunted House Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Haunted House
            </label>
            <select
              value={selectedHouse}
              onChange={(e) => {
                setSelectedHouse(e.target.value);
                setSelectedQueueNumber("");
              }}
              className="w-full px-4 py-2 border rounded-md bg-white"
              disabled={reservationAttempts >= 2}
            >
              <option value="">Choose a haunted house...</option>
              {houses.map((house) => (
                <option key={house.name} value={house.name}>
                  {house.name}
                </option>
              ))}
            </select>
          </div>

          {/* Number of People */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of People (including you)
            </label>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <input
                type="number"
                min="2"
                max="10"
                value={maxSpots}
                onChange={(e) => {
                  setMaxSpots(parseInt(e.target.value) || 2);
                  setSelectedQueueNumber("");
                }}
                className="w-24 px-4 py-2 border rounded-md"
                disabled={reservationAttempts >= 2}
              />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Expires in {maxSpots * 5} minutes
              </span>
            </div>
          </div>

          {/* Queue Selection */}
          {selectedHouse && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Queue
              </label>
              {availableQueues.length > 0 ? (
                <select
                  value={selectedQueueNumber}
                  onChange={(e) =>
                    setSelectedQueueNumber(parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border rounded-md bg-white"
                  disabled={reservationAttempts >= 2}
                >
                  <option value="">Choose a queue...</option>
                  {availableQueues.map((queue) => {
                    const formatTime = (date: Date) => {
                      return new Date(date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    };

                    return (
                      <option key={queue.queueNumber} value={queue.queueNumber}>
                        Queue {queue.queueNumber} -{" "}
                        {formatTime(queue.queueStartTime)}(
                        {queue.stats.availableSpots} spots available)
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No queues have {maxSpots} or more available spots. Try
                    reducing the group size.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selected Queue Info */}
          {selectedQueue && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
              <p className="font-semibold text-green-900 mb-1">
                Selected Queue Details:
              </p>
              <ul className="text-green-800 space-y-1 text-xs">
                <li>• Available spots: {selectedQueue.stats.availableSpots}</li>
                <li>• Reserved spots for your group: {maxSpots}</li>
                <li>
                  • Remaining after reservation:{" "}
                  {selectedQueue.stats.availableSpots - maxSpots}
                </li>
              </ul>
            </div>
          )}

          {/* Important Information */}
          <div
            className={`p-4 rounded-md text-sm ${
              reservationAttempts >= 2
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <p
              className={`font-medium mb-2 flex items-center gap-2 ${
                reservationAttempts >= 2 ? "text-red-900" : "text-blue-900"
              }`}
            >
              {reservationAttempts >= 2 ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Reservation Limit Reached
                </>
              ) : (
                <>
                  <Info className="h-4 w-4" />
                  Important Information
                </>
              )}
            </p>
            {reservationAttempts >= 2 ? (
              <p className="text-red-800">
                You have used all 2 reservation attempts. You can still join
                queues directly or join existing reservations with a code.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>
                  <strong>
                    Attempts remaining: {2 - reservationAttempts} / 2
                  </strong>
                </li>
                <li>
                  If not all {maxSpots} people join before the {maxSpots * 5}
                  -minute timer expires, ALL spots (including yours) will be
                  released
                </li>
                <li>
                  Share the reservation code with your group members immediately
                </li>
                <li>Each member needs a valid ticket to join</li>
              </ul>
            )}
          </div>

          <Button
            onClick={handleCreateReservation}
            disabled={
              createReservationMutation.isPending || cannotCreateReservation
            }
            className="w-full"
            size="lg"
          >
            {createReservationMutation.isPending
              ? "Creating Reservation..."
              : reservationAttempts >= 2
              ? "Maximum Attempts Reached"
              : cannotCreateReservation
              ? "Select a Queue to Continue"
              : `Create Reservation for ${maxSpots} People`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
