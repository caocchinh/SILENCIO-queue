"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueueWithDetails } from "@/lib/types/queue";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: QueueWithDetails | null;
  onUpdate: (data: {
    id: string;
    queueNumber?: number;
    maxCustomers?: number;
    queueStartTime?: Date;
    queueEndTime?: Date;
  }) => Promise<void>;
  isUpdating?: boolean;
}

export function UpdateQueueDialog({
  open,
  onOpenChange,
  queue,
  onUpdate,
  isUpdating = false,
}: Props) {
  const [formData, setFormData] = useState({
    queueNumber: 1,
    maxCustomers: 20,
    queueStartTime: "",
    queueEndTime: "",
  });
  const [errors, setErrors] = useState({
    queueNumber: "",
    maxCustomers: "",
    queueStartTime: "",
    queueEndTime: "",
  });

  useEffect(() => {
    if (queue) {
      setFormData({
        queueNumber: queue.queueNumber,
        maxCustomers: queue.maxCustomers,
        queueStartTime: format(
          new Date(queue.queueStartTime),
          "yyyy-MM-dd'T'HH:mm"
        ),
        queueEndTime: format(
          new Date(queue.queueEndTime),
          "yyyy-MM-dd'T'HH:mm"
        ),
      });
      setErrors({
        queueNumber: "",
        maxCustomers: "",
        queueStartTime: "",
        queueEndTime: "",
      });
    }
  }, [queue]);

  const validateForm = () => {
    const newErrors = {
      queueNumber: "",
      maxCustomers: "",
      queueStartTime: "",
      queueEndTime: "",
    };
    let isValid = true;

    if (formData.queueNumber <= 0) {
      newErrors.queueNumber = "Số lượt phải lớn hơn 0";
      isValid = false;
    }

    if (formData.maxCustomers <= 0) {
      newErrors.maxCustomers = "Số học sinh tối đa phải lớn hơn 0";
      isValid = false;
    } else if (formData.maxCustomers > 100) {
      newErrors.maxCustomers = "Số học sinh tối đa không được vượt quá 100";
      isValid = false;
    }

    if (!formData.queueStartTime) {
      newErrors.queueStartTime = "Thời gian bắt đầu là bắt buộc";
      isValid = false;
    }

    if (!formData.queueEndTime) {
      newErrors.queueEndTime = "Thời gian kết thúc là bắt buộc";
      isValid = false;
    }

    if (
      formData.queueStartTime &&
      formData.queueEndTime &&
      new Date(formData.queueStartTime) >= new Date(formData.queueEndTime)
    ) {
      newErrors.queueEndTime = "Thời gian kết thúc phải sau thời gian bắt đầu";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!queue || !validateForm()) {
      return;
    }

    await onUpdate({
      id: queue.id,
      queueNumber: formData.queueNumber,
      maxCustomers: formData.maxCustomers,
      queueStartTime: new Date(formData.queueStartTime),
      queueEndTime: new Date(formData.queueEndTime),
    });
  };

  if (!queue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cập nhật lượt {queue.queueNumber}</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin của lượt này. Những thay đổi sẽ ảnh hưởng đến
            các học sinh đã đặt chỗ.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queueNumber">Số lượt</Label>
              <Input
                id="queueNumber"
                type="number"
                min={1}
                value={formData.queueNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    queueNumber: parseInt(e.target.value) || 1,
                  })
                }
                disabled={isUpdating}
              />
              {errors.queueNumber && (
                <p className="text-sm text-red-500">{errors.queueNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCustomers">Số học sinh tối đa</Label>
              <Input
                id="maxCustomers"
                type="number"
                min={1}
                max={100}
                value={formData.maxCustomers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxCustomers: parseInt(e.target.value) || 20,
                  })
                }
                disabled={isUpdating}
              />
              {errors.maxCustomers && (
                <p className="text-sm text-red-500">{errors.maxCustomers}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Hiện có {queue.stats.occupiedSpots} chỗ đã bị chiếm
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="queueStartTime">Thời gian bắt đầu</Label>
              <Input
                id="queueStartTime"
                type="datetime-local"
                value={formData.queueStartTime}
                onChange={(e) =>
                  setFormData({ ...formData, queueStartTime: e.target.value })
                }
                disabled={isUpdating}
              />
              {errors.queueStartTime && (
                <p className="text-sm text-red-500">{errors.queueStartTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="queueEndTime">Thời gian kết thúc</Label>
              <Input
                id="queueEndTime"
                type="datetime-local"
                value={formData.queueEndTime}
                onChange={(e) =>
                  setFormData({ ...formData, queueEndTime: e.target.value })
                }
                disabled={isUpdating}
              />
              {errors.queueEndTime && (
                <p className="text-sm text-red-500">{errors.queueEndTime}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
