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
import { Users, Clock, AlertTriangle, Info } from "lucide-react";
import { HauntedHouseWithDetailedQueues } from "@/lib/types/queue";
import { createReservation } from "@/server/customer";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { SelectionDeadlineCountdown } from "./SelectionDeadlineCountdown";
import { useCallback } from "react";

interface Props {
  houses: HauntedHouseWithDetailedQueues[];
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
  const queryClient = useQueryClient();
  const [selectedHouse, setSelectedHouse] = useState("");
  const [selectedQueueNumber, setSelectedQueueNumber] = useState<number | "">(
    ""
  );
  const [numberOfSpotsForReservation, setNumberOfSpotsForReservation] =
    useState(2);
  const [isDeadlineExpired, setIsDeadlineExpired] = useState(false);

  const handleDeadlineExpiredChange = useCallback((expired: boolean) => {
    setIsDeadlineExpired(expired);
  }, []);

  // Guard against NaN and 0 values
  const safeNumberOfSpots =
    isNaN(numberOfSpotsForReservation) || numberOfSpotsForReservation <= 0
      ? 2
      : numberOfSpotsForReservation;

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (data) => {
      if (data.success) {
        const reservationCode = (data.data as { code?: string })?.code || "N/A";
        toast.success(
          <div className="flex flex-col gap-2">
            <p className="font-bold">Đặt chỗ thành công!</p>
            <p className="text-2xl font-mono bg-white px-3 py-2 rounded text-black">
              {reservationCode}
            </p>
            <p className="text-xs">Chia sẻ mã này với các thành viên nhóm</p>
          </div>,
          {
            duration: 15000,
          }
        );
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });
        queryClient.invalidateQueries({ queryKey: ["reservation-code"] });
        // Reset form
        setSelectedHouse("");
        setSelectedQueueNumber("");
        setNumberOfSpotsForReservation(2);
      } else {
        throw new Error(data.message || "Giữ slot thất bại");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Giữ slot thất bại");
      console.error(error.message);
    },
  });

  const handleCreateReservation = () => {
    if (!selectedHouse || selectedQueueNumber === "") return;

    createReservationMutation.mutate({
      hauntedHouseName: selectedHouse,
      queueNumber: selectedQueueNumber as number,
      numberOfSpotsForReservation,
      customerData,
    });
  };

  const selectedHouseData = houses.find((h) => h.name === selectedHouse);
  const availableQueues =
    selectedHouseData?.queues?.filter(
      (q) => q.stats.availableSpots >= safeNumberOfSpots
    ) || [];

  const selectedQueue = selectedHouseData?.queues?.find(
    (q) => q.queueNumber === selectedQueueNumber
  );

  const cannotCreateReservation =
    reservationAttempts >= 2 ||
    isDeadlineExpired ||
    !selectedHouse ||
    selectedQueueNumber === "" ||
    numberOfSpotsForReservation <= 0 ||
    isNaN(numberOfSpotsForReservation) ||
    (selectedQueue && selectedQueue.stats.availableSpots < safeNumberOfSpots);

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tạo phòng/giữ slot
        </CardTitle>
        <CardDescription>
          Giữ slot cho bạn và bạn bè. Bạn sẽ nhận được mã để họ có thể tham gia.
          Mỗi người thêm 5 phút vào thời gian hết hạn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SelectionDeadlineCountdown
            onExpiredChange={handleDeadlineExpiredChange}
            title="Thời gian còn lại để tạo phòng"
          />
          {/* Haunted House Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Chọn nhà ma
            </label>
            <select
              value={selectedHouse}
              onChange={(e) => {
                setSelectedHouse(e.target.value);
                setSelectedQueueNumber("");
              }}
              className="w-full px-4 py-2 border rounded-md bg-white"
              disabled={reservationAttempts >= 2 || isDeadlineExpired}
            >
              <option value="">Chọn nhà ma...</option>
              {houses.map((house) => (
                <option key={house.name} value={house.name}>
                  {house.name}
                </option>
              ))}
            </select>
          </div>

          {/* Number of People */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Số người (bao gồm bạn)
            </label>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center border rounded-md bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-l-md rounded-r-none border-r"
                  onClick={() => {
                    const newValue = Math.max(
                      2,
                      numberOfSpotsForReservation - 1
                    );
                    setNumberOfSpotsForReservation(newValue);
                    setSelectedQueueNumber("");
                  }}
                  disabled={
                    reservationAttempts >= 2 ||
                    isDeadlineExpired ||
                    numberOfSpotsForReservation <= 2
                  }
                >
                  −
                </Button>
                <Input
                  id="queue-number"
                  type="number"
                  placeholder="Số lượt"
                  className="w-20 border-0 focus-visible:ring-0 text-center"
                  value={numberOfSpotsForReservation}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 2) {
                      setNumberOfSpotsForReservation(value);
                      setSelectedQueueNumber("");
                    }
                  }}
                  disabled={reservationAttempts >= 2 || isDeadlineExpired}
                  min={2}
                  max={10}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-r-md rounded-l-none border-l"
                  onClick={() => {
                    const newValue = Math.min(
                      10,
                      numberOfSpotsForReservation + 1
                    );
                    setNumberOfSpotsForReservation(newValue);
                    setSelectedQueueNumber("");
                  }}
                  disabled={
                    reservationAttempts >= 2 ||
                    isDeadlineExpired ||
                    numberOfSpotsForReservation >= 10
                  }
                >
                  +
                </Button>
              </div>

              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Hết hạn sau {safeNumberOfSpots * 5} phút
              </span>
            </div>
          </div>

          {/* Queue Selection */}
          {selectedHouse && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Chọn lượt
              </label>
              {availableQueues.length > 0 ? (
                <select
                  value={selectedQueueNumber}
                  onChange={(e) =>
                    setSelectedQueueNumber(parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border rounded-md bg-white"
                  disabled={reservationAttempts >= 2 || isDeadlineExpired}
                >
                  <option value="">Chọn lượt...</option>
                  {availableQueues.map((queue) => {
                    const formatTime = (date: Date) => {
                      return new Date(date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    };

                    return (
                      <option key={queue.queueNumber} value={queue.queueNumber}>
                        Lượt {queue.queueNumber} -{" "}
                        {formatTime(queue.queueStartTime)} -{" "}
                        {formatTime(queue.queueEndTime)} (
                        {queue.stats.availableSpots} chỗ trống)
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Không có lượt nào có {numberOfSpotsForReservation} hoặc
                    nhiều hơn chỗ trống. Thử giảm số người.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selected Queue Info */}
          {selectedQueue && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
              <p className="font-semibold text-green-900 mb-1">
                Chi tiết lượt:
              </p>
              <ul className="text-green-800 space-y-1 text-xs">
                <li>• Chỗ trống: {selectedQueue.stats.availableSpots}</li>
                <li>• Chỗ trống cho nhóm bạn: {safeNumberOfSpots}</li>
                <li>
                  • Chỗ trống còn lại sau khi đặt chỗ:{" "}
                  {Math.max(
                    0,
                    selectedQueue.stats.availableSpots - safeNumberOfSpots
                  )}
                </li>
              </ul>
            </div>
          )}

          {/* Important Information */}
          <div
            className={cn(
              "p-4 rounded-md text-sm",
              reservationAttempts >= 2
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            )}
          >
            <p
              className={cn(
                "font-medium mb-2 flex items-center gap-2",
                reservationAttempts >= 2 ? "text-red-900" : "text-blue-900"
              )}
            >
              {reservationAttempts >= 2 ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Đã đạt giới hạn đặt chỗ
                </>
              ) : (
                <>
                  <Info className="h-4 w-4" />
                  Thông tin quan trọng
                </>
              )}
            </p>
            {reservationAttempts >= 2 ? (
              <p className="text-red-800">
                Bạn đã sử dụng tất cả 2 lần đặt chỗ. Bạn vẫn có thể tham gia
                lượt trực tiếp hoặc tham gia phòng đã đặt với mã.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>
                  <strong>
                    Lần giữ chỗ còn lại: {2 - reservationAttempts} / 2
                  </strong>
                </li>
                <li>
                  Nếu không phải tất cả {safeNumberOfSpots} người tham gia trước
                  khi hết thời gian {safeNumberOfSpots * 5} phút, TẤT CẢ chỗ
                  trống (bao gồm chỗ của bạn) sẽ được giải phóng cho người khác.
                </li>
                <li>Chia sẻ mã đặt chỗ với các thành viên nhóm ngay lập tức</li>
                <li>Mỗi thành viên cần có vé hợp lệ để tham gia</li>
              </ul>
            )}
          </div>

          <Button
            onClick={handleCreateReservation}
            disabled={
              createReservationMutation.isPending || cannotCreateReservation
            }
            className={cn(
              "w-full",
              isDeadlineExpired && "opacity-50 cursor-not-allowed"
            )}
            size="lg"
          >
            {createReservationMutation.isPending
              ? "Đang tạo phòng..."
              : isDeadlineExpired
              ? "Hạn chót đã qua"
              : reservationAttempts >= 2
              ? "Đã đạt giới hạn đặt chỗ"
              : cannotCreateReservation
              ? "Vui lòng điền đủ số người tham gia và chọn lượt"
              : `Tạo phòng cho ${safeNumberOfSpots} người`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
