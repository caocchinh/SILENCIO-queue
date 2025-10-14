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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { HauntedHouseWithQueues } from "@/lib/types/queue";
import { createHauntedHouse, deleteHauntedHouse } from "@/server/admin";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Props {
  houses: HauntedHouseWithQueues[];
}

export function HauntedHouseManager({ houses }: Props) {
  const queryClient = useQueryClient();
  const [newHouse, setNewHouse] = useState({
    name: "",
    duration: 0,
    breakTimePerQueue: 0,
  });
  const [validationErrors, setValidationErrors] = useState({
    duration: "",
    breakTimePerQueue: "",
  });

  const validateTimeValue = (value: number, fieldName: string): string => {
    if (value <= 0) {
      return `${fieldName} phải lớn hơn 0`;
    }
    if (value > 120) {
      return `${fieldName} không được vượt quá 120 phút`;
    }
    return "";
  };

  const createHouseMutation = useMutation({
    mutationFn: createHauntedHouse,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setNewHouse({ name: "", duration: 0, breakTimePerQueue: 0 });
        setValidationErrors({ duration: "", breakTimePerQueue: "" });
      } else {
        throw new Error(data.message || "Failed to create haunted house");
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
        throw new Error(data.message || "Failed to delete haunted house");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete haunted house");
      console.error(error);
    },
  });

  const isFormValid = () => {
    return (
      newHouse.name &&
      newHouse.duration > 0 &&
      newHouse.breakTimePerQueue > 0 &&
      !validationErrors.duration &&
      !validationErrors.breakTimePerQueue
    );
  };

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
    <div className="flex flex-wrap gap-4 w-full">
      <Card className="min-w-[100%] sm:min-w-md w-">
        <CardHeader>
          <CardTitle>Tạo nhà ma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-5 items-start w-full flex-col">
            <div className="w-full flex flex-col gap-1 w-full ">
              <Label htmlFor="house-name">Tên nhà ma</Label>
              <Input
                id="house-name"
                type="text"
                placeholder="Tên nhà ma"
                value={newHouse.name}
                onChange={(e) =>
                  setNewHouse({ ...newHouse, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="w -full flex flex-col gap-1 w-full ">
              <Label htmlFor="house-duration">Độ dài mỗi lượt</Label>
              <Input
                id="house-duration"
                type="number"
                placeholder="Thời gian (phút)"
                value={newHouse.duration || ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  const numValue = isNaN(value) ? 0 : value;
                  setNewHouse({
                    ...newHouse,
                    duration: numValue,
                  });
                  setValidationErrors((prev) => ({
                    ...prev,
                    duration: validateTimeValue(numValue, "Độ dài mỗi lượt"),
                  }));
                }}
                className={`mt-1 ${
                  validationErrors.duration ? "border-red-500" : ""
                }`}
                min="1"
                max="120"
              />
              {validationErrors.duration && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.duration}
                </p>
              )}
            </div>
            <div className="w-full flex flex-col gap-1 w-full ">
              <Label htmlFor="house-break-time">
                Thời gian nghỉ giữa mỗi lượt
              </Label>
              <Input
                id="house-break-time"
                type="number"
                placeholder="Thời gian nghỉ"
                value={newHouse.breakTimePerQueue || ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  const numValue = isNaN(value) ? 0 : value;
                  setNewHouse({
                    ...newHouse,
                    breakTimePerQueue: numValue,
                  });
                  setValidationErrors((prev) => ({
                    ...prev,
                    breakTimePerQueue: validateTimeValue(
                      numValue,
                      "Thời gian nghỉ giữa mỗi lượt"
                    ),
                  }));
                }}
                className={`mt-1 ${
                  validationErrors.breakTimePerQueue ? "border-red-500" : ""
                }`}
                min="1"
                max="120"
              />
              {validationErrors.breakTimePerQueue && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.breakTimePerQueue}
                </p>
              )}
            </div>
            <Button
              onClick={handleCreate}
              disabled={createHouseMutation.isPending || !isFormValid()}
              className="mb-1 w-full cursor-pointer"
            >
              {createHouseMutation.isPending ? "Đang tạo..." : "Tạo"}
              {createHouseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-w-[100%] sm:min-w-md">
        {houses.map((house) => (
          <Card key={house.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{house.name}</CardTitle>
                  <CardDescription>
                    Độ dài mỗi lượt: {house.duration} phút
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
                    {house.queues.length} lượt
                    <div className="mt-2 space-y-1">
                      {house.queues.map((q) => (
                        <div key={q.id} className="flex justify-between">
                          <span>Lượt {q.queueNumber}:</span>
                          <span>
                            {q.stats.occupiedSpots}/{q.stats.totalSpots} đã hết
                            chỗ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Chưa có lượt nào</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
