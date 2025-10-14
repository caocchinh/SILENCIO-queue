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
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { HauntedHouseWithQueues } from "@/lib/types/queue";

interface Props {
  houses: HauntedHouseWithQueues[];
  onRefresh: () => void;
}

export function HauntedHouseManager({ houses, onRefresh }: Props) {
  const [creating, setCreating] = useState(false);
  const [newHouse, setNewHouse] = useState({ name: "", duration: 15 });

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch("/api/haunted-houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHouse),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Haunted house created successfully!");
        setNewHouse({ name: "", duration: 15 });
        onRefresh();
      } else {
        toast.error(result.error || "Failed to create haunted house");
      }
    } catch (error) {
      toast.error("Failed to create haunted house");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all associated queues and spots.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/haunted-houses/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Haunted house deleted successfully!");
        onRefresh();
      } else {
        toast.error(result.error || "Failed to delete haunted house");
      }
    } catch (error) {
      toast.error("Failed to delete haunted house");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Haunted House</CardTitle>
          <CardDescription>Add a new haunted house attraction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Haunted House Name"
              value={newHouse.name}
              onChange={(e) =>
                setNewHouse({ ...newHouse, name: e.target.value })
              }
              className="flex-1 px-4 py-2 border rounded-md"
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={newHouse.duration}
              onChange={(e) =>
                setNewHouse({
                  ...newHouse,
                  duration: parseInt(e.target.value) || 15,
                })
              }
              className="w-32 px-4 py-2 border rounded-md"
              min="1"
              max="120"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !newHouse.name}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
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
                            {q.stats.occupiedSpots}/{q.stats.totalSpots} occupied
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

