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
import { Plus, Trash2 } from "lucide-react";
import { HauntedHouseWithQueues, QueueWithStats } from "@/lib/types/queue";
import { createQueue, deleteQueue } from "@/server/admin";

interface Props {
  houses: HauntedHouseWithQueues[];
}

export function QueueManager({ houses }: Props) {
  const queryClient = useQueryClient();
  const [newQueue, setNewQueue] = useState({
    hauntedHouseName: "",
    queueNumber: 1,
    maxCustomers: 20,
  });

  const createQueueMutation = useMutation({
    mutationFn: createQueue,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setNewQueue({
          hauntedHouseName: "",
          queueNumber: 1,
          maxCustomers: 20,
        });
      } else {
        toast.error(data.message || "Failed to create queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to create queue");
      console.error(error);
    },
  });

  const deleteQueueMutation = useMutation({
    mutationFn: deleteQueue,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to delete queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete queue");
      console.error(error);
    },
  });

  const handleCreate = () => {
    createQueueMutation.mutate(newQueue);
  };

  const handleDelete = (queueId: string) => {
    if (!confirm("Are you sure you want to delete this queue?")) {
      return;
    }

    deleteQueueMutation.mutate({ queueId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Queue</CardTitle>
          <CardDescription>Add a new queue to a haunted house</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <select
              value={newQueue.hauntedHouseName}
              onChange={(e) =>
                setNewQueue({ ...newQueue, hauntedHouseName: e.target.value })
              }
              className="flex-1 px-4 py-2 border rounded-md"
            >
              <option value="">Select Haunted House</option>
              {houses.map((house) => (
                <option key={house.name} value={house.name}>
                  {house.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Queue Number"
              value={newQueue.queueNumber}
              onChange={(e) =>
                setNewQueue({
                  ...newQueue,
                  queueNumber: parseInt(e.target.value) || 1,
                })
              }
              className="w-32 px-4 py-2 border rounded-md"
              min="1"
            />
            <input
              type="number"
              placeholder="Max Customers"
              value={newQueue.maxCustomers}
              onChange={(e) =>
                setNewQueue({
                  ...newQueue,
                  maxCustomers: parseInt(e.target.value) || 20,
                })
              }
              className="w-40 px-4 py-2 border rounded-md"
              min="1"
              max="100"
            />
            <Button
              onClick={handleCreate}
              disabled={
                createQueueMutation.isPending || !newQueue.hauntedHouseName
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {createQueueMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {houses.map((house) => (
          <div key={house.name}>
            {house.queues && house.queues.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">{house.name}</h3>
                <div className="grid gap-3">
                  {house.queues.map((queue: QueueWithStats) => (
                    <Card key={queue.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>Queue {queue.queueNumber}</CardTitle>
                            <CardDescription>
                              Max: {queue.maxCustomers} customers
                            </CardDescription>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(queue.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Available</p>
                            <p className="text-2xl font-bold text-green-600">
                              {queue.stats.availableSpots}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Occupied</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {queue.stats.occupiedSpots}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reserved</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {queue.stats.reservedSpots}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">
                              {queue.stats.totalSpots}
                            </p>
                          </div>
                        </div>
                        {queue.stats.activeReservations !== undefined &&
                          queue.stats.activeReservations > 0 && (
                            <div className="mt-4 text-sm text-muted-foreground">
                              Active reservations:{" "}
                              {queue.stats.activeReservations}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
