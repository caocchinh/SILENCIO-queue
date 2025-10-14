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
import { HauntedHouseWithQueues } from "@/lib/types/queue";
import { createHauntedHouse, deleteHauntedHouse } from "@/server/admin";

interface Props {
  houses: HauntedHouseWithQueues[];
}

export function HauntedHouseManager({ houses }: Props) {
  const queryClient = useQueryClient();
  const [newHouse, setNewHouse] = useState({
    name: "",
    duration: 15,
    breakTimePerQueue: 5,
  });

  const createHouseMutation = useMutation({
    mutationFn: createHauntedHouse,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setNewHouse({ name: "", duration: 15, breakTimePerQueue: 5 });
      } else {
        toast.error(data.message || "Failed to create haunted house");
      }
    },
    onError: (error) => {
      toast.error("Failed to create haunted house");
      console.error(error);
    },
  });

  const deleteHouseMutation = useMutation({
    mutationFn: deleteHauntedHouse,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to delete haunted house");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete haunted house");
      console.error(error);
    },
  });

  const handleCreate = () => {
    createHouseMutation.mutate(newHouse);
  };

  const handleDelete = (name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This will delete all associated queues and spots.`
      )
    ) {
      return;
    }

    deleteHouseMutation.mutate({ name });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo nhà ma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Tên nhà ma"
              value={newHouse.name}
              onChange={(e) =>
                setNewHouse({ ...newHouse, name: e.target.value })
              }
              className="flex-1 px-4 py-2 border rounded-md"
            />
            <input
              type="number"
              placeholder="Thời gian (phút)"
              value={newHouse.duration}
              onChange={(e) =>
                setNewHouse({
                  ...newHouse,
                  duration: parseInt(e.target.value),
                })
              }
              className="w-32 px-4 py-2 border rounded-md"
              min="1"
              max="120"
            />
            <Button
              onClick={handleCreate}
              disabled={createHouseMutation.isPending || !newHouse.name}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createHouseMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {houses.map((house) => (
          <Card key={house.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{house.name}</CardTitle>
                  <CardDescription>
                    Duration: {house.duration} minutes
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(house.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {house.queues && house.queues.length > 0 ? (
                  <div>
                    {house.queues.length} queue(s)
                    <div className="mt-2 space-y-1">
                      {house.queues.map((q) => (
                        <div key={q.id} className="flex justify-between">
                          <span>Queue {q.queueNumber}:</span>
                          <span>
                            {q.stats.occupiedSpots}/{q.stats.totalSpots}{" "}
                            occupied
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>No queues yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
