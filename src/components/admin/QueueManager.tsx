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
import { createQueue, createBatchQueues, deleteQueue } from "@/server/admin";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  houses: HauntedHouseWithQueues[];
}

export function QueueManager({ houses }: Props) {
  const queryClient = useQueryClient();
  const [newQueue, setNewQueue] = useState({
    hauntedHouseName: "",
    queueNumber: 1,
    queueStartTime: "",
    queueEndTime: "",
    maxCustomers: 20,
  });
  const [batchQueue, setBatchQueue] = useState({
    hauntedHouseName: "",
    startingQueueNumber: 1,
    numberOfQueues: 5,
    maxCustomers: 20,
    durationPerQueue: 15,
    breakTimePerQueue: 5,
    firstQueueStartTime: "",
  });
  const [validationErrors, setValidationErrors] = useState({
    hauntedHouseName: "",
    queueNumber: "",
    maxCustomers: "",
    queueStartTime: "",
    queueEndTime: "",
  });
  const [batchValidationErrors, setBatchValidationErrors] = useState({
    hauntedHouseName: "",
    startingQueueNumber: "",
    numberOfQueues: "",
    maxCustomers: "",
    durationPerQueue: "",
    breakTimePerQueue: "",
    firstQueueStartTime: "",
  });
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

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

  const validateNumberOfQueues = (value: number): string => {
    if (value <= 0) {
      return "Số lượt phải lớn hơn 0";
    }
    if (value > 20) {
      return "Không thể tạo quá 20 lượt cùng lúc";
    }
    return "";
  };

  const validateDuration = (value: number): string => {
    if (value <= 0) {
      return "Thời gian phải lớn hơn 0";
    }
    if (value > 120) {
      return "Thời gian không được vượt quá 120 phút";
    }
    return "";
  };

  const validateBreakTime = (value: number): string => {
    if (value < 0) {
      return "Thời gian nghỉ không được âm";
    }
    if (value > 60) {
      return "Thời gian nghỉ không được vượt quá 60 phút";
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
          queueStartTime: "",
          queueEndTime: "",
          maxCustomers: 20,
        });
        setValidationErrors({
          hauntedHouseName: "",
          queueNumber: "",
          maxCustomers: "",
          queueStartTime: "",
          queueEndTime: "",
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

  const createBatchQueuesMutation = useMutation({
    mutationFn: createBatchQueues,
    onSuccess: (data) => {
      if (data.success) {
        sucessToast({
          message: "Các lượt đã được tạo thành công!",
          description: `${batchQueue.numberOfQueues} lượt đã được tạo và sẵn sàng nhận khách.`,
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        setBatchQueue({
          hauntedHouseName: "",
          startingQueueNumber: 1,
          numberOfQueues: 5,
          maxCustomers: 20,
          durationPerQueue: 15,
          breakTimePerQueue: 5,
          firstQueueStartTime: "",
        });
        setBatchValidationErrors({
          hauntedHouseName: "",
          startingQueueNumber: "",
          numberOfQueues: "",
          maxCustomers: "",
          durationPerQueue: "",
          breakTimePerQueue: "",
          firstQueueStartTime: "",
        });
      } else {
        throw new Error(
          data.message || "Không thể tạo các lượt. Đã có lỗi xảy ra."
        );
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể tạo các lượt. Đã có lỗi xảy ra. " + error.message,
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
      newQueue.queueStartTime &&
      newQueue.queueEndTime &&
      !validationErrors.hauntedHouseName &&
      !validationErrors.queueNumber &&
      !validationErrors.maxCustomers &&
      !validationErrors.queueStartTime &&
      !validationErrors.queueEndTime
    );
  };

  const isBatchFormValid = () => {
    return (
      batchQueue.hauntedHouseName &&
      batchQueue.startingQueueNumber > 0 &&
      batchQueue.numberOfQueues > 0 &&
      batchQueue.maxCustomers > 0 &&
      batchQueue.durationPerQueue > 0 &&
      batchQueue.breakTimePerQueue >= 0 &&
      batchQueue.firstQueueStartTime &&
      !batchValidationErrors.hauntedHouseName &&
      !batchValidationErrors.startingQueueNumber &&
      !batchValidationErrors.numberOfQueues &&
      !batchValidationErrors.maxCustomers &&
      !batchValidationErrors.durationPerQueue &&
      !batchValidationErrors.breakTimePerQueue &&
      !batchValidationErrors.firstQueueStartTime
    );
  };

  const handleCreate = () => {
    // Validate all fields before submitting
    const houseError = !newQueue.hauntedHouseName ? "Vui lòng chọn nhà ma" : "";
    const queueNumberError = validateQueueNumber(newQueue.queueNumber);
    const maxCustomersError = validateMaxCustomers(newQueue.maxCustomers);
    const startTimeError = !newQueue.queueStartTime
      ? "Vui lòng chọn thời gian bắt đầu"
      : "";
    const endTimeError = !newQueue.queueEndTime
      ? "Vui lòng chọn thời gian kết thúc"
      : "";

    setValidationErrors({
      hauntedHouseName: houseError,
      queueNumber: queueNumberError,
      maxCustomers: maxCustomersError,
      queueStartTime: startTimeError,
      queueEndTime: endTimeError,
    });

    if (
      houseError ||
      queueNumberError ||
      maxCustomersError ||
      startTimeError ||
      endTimeError
    ) {
      return;
    }

    createQueueMutation.mutate({
      ...newQueue,
      queueStartTime: new Date(newQueue.queueStartTime),
      queueEndTime: new Date(newQueue.queueEndTime),
    });
  };

  const handleBatchCreate = () => {
    // Validate all fields before submitting
    const houseError = !batchQueue.hauntedHouseName
      ? "Vui lòng chọn nhà ma"
      : "";
    const queueNumberError = validateQueueNumber(
      batchQueue.startingQueueNumber
    );
    const numberOfQueuesError = validateNumberOfQueues(
      batchQueue.numberOfQueues
    );
    const maxCustomersError = validateMaxCustomers(batchQueue.maxCustomers);
    const durationError = validateDuration(batchQueue.durationPerQueue);
    const breakTimeError = validateBreakTime(batchQueue.breakTimePerQueue);
    const startTimeError = !batchQueue.firstQueueStartTime
      ? "Vui lòng chọn thời gian bắt đầu"
      : "";

    setBatchValidationErrors({
      hauntedHouseName: houseError,
      startingQueueNumber: queueNumberError,
      numberOfQueues: numberOfQueuesError,
      maxCustomers: maxCustomersError,
      durationPerQueue: durationError,
      breakTimePerQueue: breakTimeError,
      firstQueueStartTime: startTimeError,
    });

    if (
      houseError ||
      queueNumberError ||
      numberOfQueuesError ||
      maxCustomersError ||
      durationError ||
      breakTimeError ||
      startTimeError
    ) {
      return;
    }

    createBatchQueuesMutation.mutate({
      ...batchQueue,
      firstQueueStartTime: new Date(batchQueue.firstQueueStartTime),
    });
  };

  const handleDelete = (queueId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa lượt này? Tất cả các đặt chỗ liên quan sẽ bị xóa."
      )
    ) {
      return;
    }

    deleteQueueMutation.mutate({ id: queueId });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      <Card className="w-full h-max lg:w-[400px] lg:flex-shrink-0">
        <CardHeader>
          <CardTitle>Tạo lượt mới</CardTitle>
          <CardDescription>Thêm lượt mới cho nhà ma</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Tạo đơn lẻ</TabsTrigger>
              <TabsTrigger value="batch">Tạo hàng loạt</TabsTrigger>
            </TabsList>

            {/* Single Queue Creation */}
            <TabsContent value="single" className="space-y-4">
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
                <Label htmlFor="queue-start-time">Thời gian bắt đầu</Label>
                <Input
                  id="queue-start-time"
                  type="datetime-local"
                  value={newQueue.queueStartTime}
                  onChange={(e) => {
                    setNewQueue({
                      ...newQueue,
                      queueStartTime: e.target.value,
                    });
                    setValidationErrors((prev) => ({
                      ...prev,
                      queueStartTime: "",
                    }));
                  }}
                  className={`${
                    validationErrors.queueStartTime ? "border-red-500" : ""
                  }`}
                />
                {validationErrors.queueStartTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.queueStartTime}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="queue-end-time">Thời gian kết thúc</Label>
                <Input
                  id="queue-end-time"
                  type="datetime-local"
                  value={newQueue.queueEndTime}
                  onChange={(e) => {
                    setNewQueue({
                      ...newQueue,
                      queueEndTime: e.target.value,
                    });
                    setValidationErrors((prev) => ({
                      ...prev,
                      queueEndTime: "",
                    }));
                  }}
                  className={`${
                    validationErrors.queueEndTime ? "border-red-500" : ""
                  }`}
                />
                {validationErrors.queueEndTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.queueEndTime}
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
            </TabsContent>

            {/* Batch Queue Creation */}
            <TabsContent value="batch" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-house-select">Chọn nhà ma</Label>
                <Popover open={batchOpen} onOpenChange={setBatchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={batchOpen}
                      className={cn(
                        "w-full justify-between",
                        batchValidationErrors.hauntedHouseName &&
                          "border-red-500"
                      )}
                    >
                      {batchQueue.hauntedHouseName
                        ? houses.find(
                            (house) =>
                              house.name === batchQueue.hauntedHouseName
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
                                setBatchQueue({
                                  ...batchQueue,
                                  hauntedHouseName: currentValue,
                                });
                                setBatchValidationErrors((prev) => ({
                                  ...prev,
                                  hauntedHouseName: !currentValue
                                    ? "Vui lòng chọn nhà ma"
                                    : "",
                                }));
                                setBatchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  batchQueue.hauntedHouseName === house.name
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
                {batchValidationErrors.hauntedHouseName && (
                  <p className="text-sm text-red-500 mt-1">
                    {batchValidationErrors.hauntedHouseName}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starting-queue-number">Số lượt bắt đầu</Label>
                  <Input
                    id="starting-queue-number"
                    type="number"
                    placeholder="1"
                    value={batchQueue.startingQueueNumber || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const numValue = isNaN(value) ? 0 : value;
                      setBatchQueue({
                        ...batchQueue,
                        startingQueueNumber: numValue,
                      });
                      setBatchValidationErrors((prev) => ({
                        ...prev,
                        startingQueueNumber: validateQueueNumber(numValue),
                      }));
                    }}
                    className={`${
                      batchValidationErrors.startingQueueNumber
                        ? "border-red-500"
                        : ""
                    }`}
                    min="1"
                    max="100"
                  />
                  {batchValidationErrors.startingQueueNumber && (
                    <p className="text-sm text-red-500 mt-1">
                      {batchValidationErrors.startingQueueNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number-of-queues">Số lượt cần tạo</Label>
                  <Input
                    id="number-of-queues"
                    type="number"
                    placeholder="5"
                    value={batchQueue.numberOfQueues || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const numValue = isNaN(value) ? 0 : value;
                      setBatchQueue({
                        ...batchQueue,
                        numberOfQueues: numValue,
                      });
                      setBatchValidationErrors((prev) => ({
                        ...prev,
                        numberOfQueues: validateNumberOfQueues(numValue),
                      }));
                    }}
                    className={`${
                      batchValidationErrors.numberOfQueues
                        ? "border-red-500"
                        : ""
                    }`}
                    min="1"
                    max="20"
                  />
                  {batchValidationErrors.numberOfQueues && (
                    <p className="text-sm text-red-500 mt-1">
                      {batchValidationErrors.numberOfQueues}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration-per-queue">
                    Độ dài mỗi lượt (phút)
                  </Label>
                  <Input
                    id="duration-per-queue"
                    type="number"
                    placeholder="15"
                    value={batchQueue.durationPerQueue || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const numValue = isNaN(value) ? 0 : value;
                      setBatchQueue({
                        ...batchQueue,
                        durationPerQueue: numValue,
                      });
                      setBatchValidationErrors((prev) => ({
                        ...prev,
                        durationPerQueue: validateDuration(numValue),
                      }));
                    }}
                    className={`${
                      batchValidationErrors.durationPerQueue
                        ? "border-red-500"
                        : ""
                    }`}
                    min="1"
                    max="120"
                  />
                  {batchValidationErrors.durationPerQueue && (
                    <p className="text-sm text-red-500 mt-1">
                      {batchValidationErrors.durationPerQueue}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-time">Thời gian nghỉ (phút)</Label>
                  <Input
                    id="break-time"
                    type="number"
                    placeholder="5"
                    value={batchQueue.breakTimePerQueue || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const numValue = isNaN(value) ? 0 : value;
                      setBatchQueue({
                        ...batchQueue,
                        breakTimePerQueue: numValue,
                      });
                      setBatchValidationErrors((prev) => ({
                        ...prev,
                        breakTimePerQueue: validateBreakTime(numValue),
                      }));
                    }}
                    className={`${
                      batchValidationErrors.breakTimePerQueue
                        ? "border-red-500"
                        : ""
                    }`}
                    min="0"
                    max="60"
                  />
                  {batchValidationErrors.breakTimePerQueue && (
                    <p className="text-sm text-red-500 mt-1">
                      {batchValidationErrors.breakTimePerQueue}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-max-customers">
                  Số học sinh tối đa mỗi lượt
                </Label>
                <Input
                  id="batch-max-customers"
                  type="number"
                  placeholder="20"
                  value={batchQueue.maxCustomers || ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    const numValue = isNaN(value) ? 0 : value;
                    setBatchQueue({
                      ...batchQueue,
                      maxCustomers: numValue,
                    });
                    setBatchValidationErrors((prev) => ({
                      ...prev,
                      maxCustomers: validateMaxCustomers(numValue),
                    }));
                  }}
                  className={`${
                    batchValidationErrors.maxCustomers ? "border-red-500" : ""
                  }`}
                  min="1"
                  max="100"
                />
                {batchValidationErrors.maxCustomers && (
                  <p className="text-sm text-red-500 mt-1">
                    {batchValidationErrors.maxCustomers}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-queue-start-time">
                  Thời gian bắt đầu lượt đầu tiên
                </Label>
                <Input
                  id="first-queue-start-time"
                  type="datetime-local"
                  value={batchQueue.firstQueueStartTime}
                  onChange={(e) => {
                    setBatchQueue({
                      ...batchQueue,
                      firstQueueStartTime: e.target.value,
                    });
                    setBatchValidationErrors((prev) => ({
                      ...prev,
                      firstQueueStartTime: "",
                    }));
                  }}
                  className={`${
                    batchValidationErrors.firstQueueStartTime
                      ? "border-red-500"
                      : ""
                  }`}
                />
                {batchValidationErrors.firstQueueStartTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {batchValidationErrors.firstQueueStartTime}
                  </p>
                )}
              </div>
              <Button
                onClick={handleBatchCreate}
                disabled={
                  createBatchQueuesMutation.isPending || !isBatchFormValid()
                }
                className="w-full"
              >
                {createBatchQueuesMutation.isPending
                  ? "Đang tạo..."
                  : `Tạo ${batchQueue.numberOfQueues} lượt`}
                {createBatchQueuesMutation.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="ml-2 h-4 w-4" />
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex-1 w-full">
        {houses.map((house) => (
          <Card key={house.name}>
            <CardHeader>
              <CardTitle>{house.name}</CardTitle>
              <CardDescription>
                {house.queues && house.queues.length > 0
                  ? `${house.queues.length} lượt đang hoạt động`
                  : "Chưa có lượt nào"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {house.queues && house.queues.length > 0 ? (
                  <div>
                    {house.queues.length} lượt
                    <div className="mt-2 space-y-2">
                      {house.queues.map((q) => (
                        <div
                          key={q.id}
                          className="flex justify-between items-center p-2 border rounded-lg bg-gray-50"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              Lượt {q.queueNumber}
                            </span>
                            <span className="ml-4 text-muted-foreground">
                              {q.stats.occupiedSpots}/{q.stats.totalSpots} đã
                              đặt
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
