"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  HauntedHouseWithDetailedQueues,
  QueueWithDetails,
} from "@/lib/types/queue";
import {
  createHauntedHouse,
  deleteHauntedHouse,
  deleteQueue,
  updateQueue,
} from "@/server/admin";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { errorToast, sucessToast } from "@/lib/utils";
import { QueueAccordion } from "./QueueAccordion";
import { UpdateQueueDialog } from "./UpdateQueueDialog";

interface Props {
  houses: HauntedHouseWithDetailedQueues[];
}

export function HauntedHouseManager({ houses }: Props) {
  const queryClient = useQueryClient();
  const [newHouse, setNewHouse] = useState({
    name: "",
  });
  const [selectedQueue, setSelectedQueue] = useState<QueueWithDetails | null>(
    null
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const createHouseMutation = useMutation({
    mutationFn: createHauntedHouse,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Nhà ma đã được tạo thành công!",
          description:
            "Nhà ma đã được tạo thành công. Vui lòng thêm lượt cho nhà ma này.",
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setNewHouse({ name: "" });
      } else {
        throw new Error(
          data.message || "Không thể tạo nhà ma. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể tạo nhà ma. Đã có lỗi xảy ra. " + error.message,
      });
      console.error(error);
    },
  });

  const deleteHouseMutation = useMutation({
    mutationFn: deleteHauntedHouse,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Nhà ma đã được xóa thành công!",
          description: "Tất cả lượt của nhà ma đã bị xóa.",
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        throw new Error(
          data.message || "Không thể xóa nhà ma. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể xóa nhà ma. Đã có lỗi xảy ra. " + error.message,
      });
      console.error(error);
    },
  });

  const deleteQueueMutation = useMutation({
    mutationFn: deleteQueue,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Lượt đã được xóa thành công!",
          description: "Lượt và tất cả các chỗ đã bị xóa.",
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        throw new Error(
          data.message || "Không thể xóa lượt. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể xóa lượt. Đã có lỗi xảy ra. " + error.message,
      });
      console.error(error);
    },
  });

  const updateQueueMutation = useMutation({
    mutationFn: updateQueue,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Lượt đã được cập nhật thành công!",
          description: "Thông tin lượt đã được cập nhật.",
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setUpdateDialogOpen(false);
        setSelectedQueue(null);
      } else {
        throw new Error(
          data.message || "Không thể cập nhật lượt. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể cập nhật lượt. Đã có lỗi xảy ra. " + error.message,
      });
      console.error(error);
    },
  });

  const isFormValid = () => {
    return newHouse.name.trim().length > 0;
  };

  const handleCreate = () => {
    createHouseMutation.mutate(newHouse);
  };

  const handleDelete = (name: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa "${name}"? Điều này sẽ xóa tất cả các lượt và chỗ liên quan.`
      )
    ) {
      return;
    }

    deleteHouseMutation.mutate({ name });
  };

  const handleDeleteQueue = (queueId: string) => {
    if (
      !confirm(`Bạn có chắc chắn muốn xóa lượt này? Tất cả các chỗ sẽ bị xóa.`)
    ) {
      return;
    }

    deleteQueueMutation.mutate({ id: queueId });
  };

  const handleUpdateQueue = (queue: QueueWithDetails) => {
    setSelectedQueue(queue);
    setUpdateDialogOpen(true);
  };

  const handleUpdateSubmit = async (data: {
    id: string;
    queueNumber?: number;
    maxCustomers?: number;
    queueStartTime?: Date;
    queueEndTime?: Date;
  }) => {
    await updateQueueMutation.mutateAsync(data);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      <Card className="w-full lg:w-96 lg:flex-shrink-0">
        <CardHeader>
          <CardTitle>Tạo nhà ma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="house-name">Tên nhà ma</Label>
              <Input
                id="house-name"
                type="text"
                placeholder="Tên nhà ma"
                value={newHouse.name}
                onChange={(e) =>
                  setNewHouse({ ...newHouse, name: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createHouseMutation.isPending || !isFormValid()}
              className="w-full cursor-pointer"
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

      <div className="flex-1 w-full space-y-4">
        {houses.map((house) => (
          <Card key={house.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{house.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {house.queues && house.queues.length > 0
                      ? `${house.queues.length} lượt`
                      : "Chưa có lượt nào"}
                  </p>
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
              {house.queues && house.queues.length > 0 ? (
                <QueueAccordion
                  queues={house.queues}
                  onDelete={handleDeleteQueue}
                  onUpdate={handleUpdateQueue}
                  showDelete={true}
                  showUpdate={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có lượt nào cho nhà ma này
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <UpdateQueueDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        queue={selectedQueue}
        onUpdate={handleUpdateSubmit}
        isUpdating={updateQueueMutation.isPending}
      />
    </div>
  );
}
