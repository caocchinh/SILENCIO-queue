"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { HauntedHouseWithQueues } from "@/lib/types/queue";
import { createQueue, deleteQueue } from "@/server/admin";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { errorToast, sucessToast } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  const [validationErrors, setValidationErrors] = useState({
    hauntedHouseName: "",
    queueNumber: "",
    maxCustomers: "",
  });
  const [open, setOpen] = useState(false);

  const validateQueueNumber = (value: number): string => {
    if (value <= 0) {
      return "Số lượt phải lớn hơn 0";
    }
    if (value > 100) {
      return "Số lượt không được vượt quá 100";
    }
    return "";
  };

  const validateMaxCustomers = (value: number): string => {
    if (value <= 0) {
      return "Số học sinh tối đa phải lớn hơn 0";
    }
    if (value > 100) {
      return "Số học sinh tối đa không được vượt quá 100";
    }
    return "";
  };

  const createQueueMutation = useMutation({
    mutationFn: createQueue,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Lượt đã được tạo thành công!",
          description: "Lượt mới đã được tạo và sẵn sàng nhận khách.",
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setNewQueue({
          hauntedHouseName: "",
          queueNumber: 1,
          maxCustomers: 20,
        });
        setValidationErrors({
          hauntedHouseName: "",
          queueNumber: "",
          maxCustomers: "",
        });
      } else {
        throw new Error(
          data.message || "Không thể tạo lượt. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể tạo lượt. Đã có lỗi xảy ra. " + error.message,
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
          description: "Lượt và tất cả các đặt chỗ liên quan đã bị xóa.",
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

  const isFormValid = () => {
    return (
      newQueue.hauntedHouseName &&
      newQueue.queueNumber > 0 &&
      newQueue.maxCustomers > 0 &&
      !validationErrors.hauntedHouseName &&
      !validationErrors.queueNumber &&
      !validationErrors.maxCustomers
    );
  };

  const handleCreate = () => {
    // Validate all fields before submitting
    const houseError = !newQueue.hauntedHouseName ? "Vui lòng chọn nhà ma" : "";
    const queueNumberError = validateQueueNumber(newQueue.queueNumber);
    const maxCustomersError = validateMaxCustomers(newQueue.maxCustomers);

    setValidationErrors({
      hauntedHouseName: houseError,
      queueNumber: queueNumberError,
      maxCustomers: maxCustomersError,
    });

    if (houseError || queueNumberError || maxCustomersError) {
      return;
    }

    createQueueMutation.mutate(newQueue);
  };

  const handleDelete = (queueId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa lượt này? Tất cả các đặt chỗ liên quan sẽ bị xóa."
      )
    ) {
      return;
    }

    deleteQueueMutation.mutate({ queueId });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      <Card className="w-full lg:w-96 lg:flex-shrink-0">
        <CardHeader>
          <CardTitle>Tạo lượt mới</CardTitle>
          <CardDescription>Thêm lượt mới cho nhà ma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="house-select">Chọn nhà ma</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "w-full justify-between",
                      validationErrors.hauntedHouseName && "border-red-500"
                    )}
                  >
                    {newQueue.hauntedHouseName
                      ? houses.find(
                          (house) => house.name === newQueue.hauntedHouseName
                        )?.name
                      : "Chọn nhà ma"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm nhà ma..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy nhà ma.</CommandEmpty>
                      <CommandGroup>
                        {houses.map((house) => (
                          <CommandItem
                            key={house.name}
                            value={house.name}
                            onSelect={(currentValue) => {
                              setNewQueue({
                                ...newQueue,
                                hauntedHouseName: currentValue,
                              });
                              setValidationErrors((prev) => ({
                                ...prev,
                                hauntedHouseName: !currentValue
                                  ? "Vui lòng chọn nhà ma"
                                  : "",
                              }));
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newQueue.hauntedHouseName === house.name
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {house.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.hauntedHouseName && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.hauntedHouseName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-number">Số lượt</Label>
              <Input
                id="queue-number"
                type="number"
                placeholder="Số lượt"
                value={newQueue.queueNumber || ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  const numValue = isNaN(value) ? 0 : value;
                  setNewQueue({
                    ...newQueue,
                    queueNumber: numValue,
                  });
                  setValidationErrors((prev) => ({
                    ...prev,
                    queueNumber: validateQueueNumber(numValue),
                  }));
                }}
                className={`${
                  validationErrors.queueNumber ? "border-red-500" : ""
                }`}
                min="1"
                max="100"
              />
              {validationErrors.queueNumber && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.queueNumber}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-customers">Số học sinh tối đa</Label>
              <Input
                id="max-customers"
                type="number"
                placeholder="Số học sinh tối đa"
                value={newQueue.maxCustomers || ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  const numValue = isNaN(value) ? 0 : value;
                  setNewQueue({
                    ...newQueue,
                    maxCustomers: numValue,
                  });
                  setValidationErrors((prev) => ({
                    ...prev,
                    maxCustomers: validateMaxCustomers(numValue),
                  }));
                }}
                className={`${
                  validationErrors.maxCustomers ? "border-red-500" : ""
                }`}
                min="1"
                max="100"
              />
              {validationErrors.maxCustomers && (
                <p className="text-sm text-red-500 mt-1">
                  {validationErrors.maxCustomers}
                </p>
              )}
            </div>
            <Button
              onClick={handleCreate}
              disabled={createQueueMutation.isPending || !isFormValid()}
              className="w-full"
            >
              {createQueueMutation.isPending ? "Đang tạo..." : "Tạo lượt"}
              {createQueueMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 w-full">
        {houses.map((house) => (
          <Card key={house.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{house.name}</CardTitle>
                  <CardDescription>
                    {house.queues && house.queues.length > 0
                      ? `${house.queues.length} lượt đang hoạt động`
                      : "Chưa có lượt nào"}
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
