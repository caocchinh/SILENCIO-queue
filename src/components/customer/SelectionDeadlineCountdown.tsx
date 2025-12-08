"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SELECTION_DEADLINE } from "@/constants/constants";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface SelectionDeadlineCountdownProps {
  onExpiredChange?: (isExpired: boolean) => void;
  title?: string;
  description?: string;
}

export function SelectionDeadlineCountdown({
  onExpiredChange,
  title,
  description,
}: SelectionDeadlineCountdownProps) {
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
      const deadline = SELECTION_DEADLINE.getTime();
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

      // Notify parent component of expired state change
      if (onExpiredChange) {
        onExpiredChange(expired);
      }

      if (expired) {
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

    // Notify parent component of initial expired state
    if (onExpiredChange) {
      onExpiredChange(initialExpired);
    }

    return () => clearInterval(timer);
  }, [onExpiredChange]);

  const formatTime = (value: number, unit: string) => {
    if (value === 0 && unit !== "giây") return null;

    return (
      <div className="flex flex-col items-center">
        <div
          className={`text-2xl font-bold ${
            isExpired ? "text-red-600" : "text-purple-600"
          }`}
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

  if (isExpired) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent>
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <div>
              <div className="font-semibold">Deadline has reached!</div>
              <div className="text-sm text-red-600">
                {description ||
                  "You are unable to select anymore, and you will be assigned to a random queue"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <Clock
            className={`h-5 w-5 ${
              isExpired ? "text-red-600" : "text-purple-600"
            }`}
          />
          <div className={`${isExpired ? "text-red-700" : "text-purple-700"}`}>
            <div className="font-semibold">
              {title || "Time left to select haunted house"}
            </div>
            <div className="text-sm text-purple-600">
              Deadline: {SELECTION_DEADLINE.toLocaleString("vi-VN")}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {formatTime(timeLeft.days, "days")}
          {timeLeft.days > 0 && (
            <div className="text-purple-400 text-xl">:</div>
          )}
          {formatTime(timeLeft.hours, "hours")}
          {(timeLeft.days > 0 || timeLeft.hours > 0) && (
            <div className="text-purple-400 text-xl">:</div>
          )}
          {formatTime(timeLeft.minutes, "minutes")}
          {(timeLeft.days > 0 ||
            timeLeft.hours > 0 ||
            timeLeft.minutes > 0) && (
            <div className="text-purple-400 text-xl">:</div>
          )}
          {formatTime(timeLeft.seconds, "seconds")}
        </div>
      </CardContent>
    </Card>
  );
}
