"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import { HauntedHouseWithQueues, QueueWithStats } from "@/lib/types/queue";
import { useCreateReservation } from "@/hooks/useCustomerMutations";

interface Props {
  houses: HauntedHouseWithQueues[];
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
  const [selectedQueue, setSelectedQueue] = useState("");
  const [maxSpots, setMaxSpots] = useState(2);

  const createReservationMutation = useCreateReservation();

  const handleCreateReservation = () => {
    createReservationMutation.mutate({
      queueId: selectedQueue,
      maxSpots,
      customerData,
    });
  };

  const queues = houses.flatMap((house) =>
    (house.queues || []).map((q: QueueWithStats) => ({
      ...q,
      houseName: house.name,
    }))
  );

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Create Group Reservation</CardTitle>
        <CardDescription>
          Reserve multiple spots for you and your friends. You'll get a code
          they can use to join. Each person adds 5 minutes to the expiration
          time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Queue
            </label>
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="">Choose a queue...</option>
              {queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.houseName} - Queue {queue.queueNumber} (
                  {queue.stats.availableSpots} available)
                </option>
              ))}
            </select>
          </div>

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
                onChange={(e) => setMaxSpots(parseInt(e.target.value) || 2)}
                className="w-24 px-4 py-2 border rounded-md"
              />
              <span className="text-sm text-muted-foreground">
                (Expires in {maxSpots * 5} minutes)
              </span>
            </div>
          </div>

          <div
            className={`p-4 rounded-md text-sm ${
              reservationAttempts >= 2 ? "bg-red-50" : "bg-blue-50"
            }`}
          >
            <p
              className={`font-medium mb-2 ${
                reservationAttempts >= 2 ? "text-red-900" : "text-blue-900"
              }`}
            >
              {reservationAttempts >= 2
                ? "Reservation Limit Reached"
                : "Important:"}
            </p>
            {reservationAttempts >= 2 ? (
              <p className="text-red-800">
                You have used all 2 reservation attempts. You can still join
                queues directly or join existing reservations with a code.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>
                  You have {2 - reservationAttempts} reservation attempt
                  {2 - reservationAttempts === 1 ? "" : "s"} remaining
                </li>
                <li>
                  If not all spots are filled before expiration, ALL spots
                  (including yours) will be released
                </li>
                <li>Share the code with friends so they can join</li>
              </ul>
            )}
          </div>

          <Button
            onClick={handleCreateReservation}
            disabled={
              createReservationMutation.isPending ||
              !selectedQueue ||
              reservationAttempts >= 2
            }
            className="w-full"
          >
            {createReservationMutation.isPending
              ? "Creating..."
              : reservationAttempts >= 2
              ? "Max Attempts Reached"
              : "Create Reservation"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
