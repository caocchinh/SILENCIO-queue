"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, AlertCircle, Timer, Loader2 } from "lucide-react";
import { ReservationWithDetails } from "@/lib/types/queue";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/RefreshButton";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface ReservationDetailsProps {
  reservation: ReservationWithDetails;
  className?: string;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function ReservationDetails({
  reservation,
  className,
  onRefresh,
  isRefetching = false,
}: ReservationDetailsProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime();
      const deadline = new Date(reservation.expiresAt).getTime();
      const difference = deadline - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      const expired = Object.values(newTimeLeft).every((value) => value === 0);
      setIsExpired(expired);

      if (expired) {
        onRefresh?.();
        clearInterval(timer);
      }
    }, 1000);

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    const initialExpired = Object.values(initialTimeLeft).every(
      (value) => value === 0
    );
    setTimeLeft(initialTimeLeft);
    setIsExpired(initialExpired);

    return () => clearInterval(timer);
  }, [onRefresh, reservation.expiresAt]);

  const formatTime = (value: number, unit: string) => {
    if (value === 0 && unit !== "giây") return null;

    return (
      <div className="flex flex-col items-center">
        <div
          className={`text-xl font-bold transition-all duration-300 ${
            isExpired ? "text-red-600" : "text-purple-600"
          } ${isRefetching ? "animate-pulse" : ""}`}
        >
          {value.toString().padStart(2, "0")}
        </div>
        <div
          className={`text-xs ${
            isExpired ? "text-red-500" : "text-purple-500"
          }`}
        >
          {unit}
        </div>
      </div>
    );
  };

  const getReservationStatusBadge = () => {
    const status = reservation.status;
    switch (status) {
      case "active":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 text-center"
          >
            Đang hoạt động
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-blue-100 text-blue-800 text-center"
          >
            Đã hoàn thành
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" className="text-center">
            Đã hết hạn
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="text-center">
            Đã hủy
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-center">
            {status}
          </Badge>
        );
    }
  };

  if (isExpired && reservation.status === "active") {
    return (
      <Card className={cn("bg-red-50 border-red-200 relative", className)}>
        {/* Loading Overlay for expired state */}
        {isRefetching && (
          <div className="absolute inset-0 bg-purple-100 backdrop-blur rounded-lg w-full z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-purple-100 px-4 py-2 rounded-full">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Đang cập nhật thông tin...
              </span>
            </div>
          </div>
        )}

        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <div>
              <div className="font-semibold">Phòng đã hết hạn!</div>
              <div className="text-sm text-red-600">
                ạn có thể tham gia những chỗ trống còn lại.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 py-2 gap-2 transition-opacity duration-200 relative",
        isRefetching && "opacity-70 pointer-events-none",
        className
      )}
    >
      {/* Loading Overlay */}
      {isRefetching && (
        <div className="absolute inset-0 bg-purple-100 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-purple-100 px-4 py-2 rounded-full">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              Đang cập nhật thông tin...
            </span>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg text-purple-700">
              Thông tin phòng
            </CardTitle>
            {isRefetching && (
              <div className="flex items-center gap-1 text-purple-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Đang cập nhật...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton
              className="px-3 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
              onClick={onRefresh}
              isLoading={isRefetching}
            >
              {isRefetching ? "Đang tải..." : "Tải lại"}
            </RefreshButton>
            {getReservationStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* People Count */}
        <div className="flex items-center gap-2 p-3 bg-white/50 rounded-lg">
          <Users className="h-4 w-4 text-purple-600" />
          <div>
            <div className="font-medium text-gray-800">
              {reservation.currentSpots} / {reservation.maxSpots} người
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="p-3 bg-white/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <div className="flex flex-row items-center justify-center gap-4 flex-wrap">
              <span className="font-medium text-gray-800">
                Thời gian còn lại
              </span>
              {isRefetching && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-sm text-purple-600">
                    Đang cập nhật...
                  </span>
                </div>
              )}
              {!isRefetching && (
                <>
                  {isExpired ? (
                    <div className="text-center py-2">
                      <Timer className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="text-red-600 font-semibold">
                        Đã hết thời gian!
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-3">
                      {formatTime(timeLeft.days, "days")}
                      {timeLeft.days > 0 && (
                        <div className="text-purple-400 text-lg">:</div>
                      )}
                      {formatTime(timeLeft.hours, "hours")}
                      {(timeLeft.days > 0 || timeLeft.hours > 0) && (
                        <div className="text-purple-400 text-lg">:</div>
                      )}
                      {formatTime(timeLeft.minutes, "minutes")}
                      {(timeLeft.days > 0 ||
                        timeLeft.hours > 0 ||
                        timeLeft.minutes > 0) && (
                        <div className="text-purple-400 text-lg">:</div>
                      )}
                      {formatTime(timeLeft.seconds, "seconds")}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expiration Info */}
        <div className="text-xs text-gray-500 text-center">
          Expires at: {new Date(reservation.expiresAt).toLocaleString("vi-VN")}
        </div>
      </CardContent>
    </Card>
  );
}
