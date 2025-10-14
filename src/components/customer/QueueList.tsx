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
import { Users } from "lucide-react";
import { HauntedHouseWithQueues, QueueWithStats } from "@/lib/types/queue";
import { joinQueue } from "@/server/customer";

interface Props {
  houses: HauntedHouseWithQueues[];
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

  const handleJoinQueue = (queueId: string) => {
    joinQueueMutation.mutate({
      queueId,
      customerData,
    });
  };

  return (
    <div className="space-y-6">
      {houses.map((house) => (
        <Card key={house.name} className="bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">{house.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {house.queues && house.queues.length > 0 ? (
              <div className="grid gap-3">
                {house.queues.map((queue: QueueWithStats) => (
                  <div
                    key={queue.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        Queue {queue.queueNumber}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {queue.stats.availableSpots} spots available out of{" "}
                        {queue.stats.totalSpots}
                      </div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-green-600">
                          ✓ {queue.stats.availableSpots} Available
                        </span>
                        <span className="text-blue-600">
                          ● {queue.stats.occupiedSpots} Occupied
                        </span>
                        {queue.stats.reservedSpots > 0 && (
                          <span className="text-orange-600">
                            ◆ {queue.stats.reservedSpots} Reserved
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinQueue(queue.id)}
                      disabled={
                        joinQueueMutation.isPending ||
                        queue.stats.availableSpots === 0
                      }
                    >
                      {joinQueueMutation.isPending
                        ? "Joining..."
                        : queue.stats.availableSpots === 0
                        ? "Full"
                        : "Join Queue"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No queues available yet</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
