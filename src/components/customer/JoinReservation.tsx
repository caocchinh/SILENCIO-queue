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
import { Loader2, Ticket } from "lucide-react";
import { joinReservation } from "@/server/customer";
import { errorToast, successToast } from "@/lib/utils";

interface Props {
  customerData: {
    studentId: string;
    name: string;
    email: string;
    homeroom: string;
    ticketType: string;
  };
}

export function JoinReservation({ customerData }: Props) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const joinReservationMutation = useMutation({
    mutationFn: joinReservation,
    onSuccess: (data) => {
      if (data.success) {
        successToast({ message: "Đã tham gia phòng thành công!" });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });
        setCode("");
      } else {
        throw new Error(data.message || "Không thể tham gia phòng");
      }
    },
    onError: (error) => {
      errorToast({
        message: "Không thể tham gia phòng",
        description: error.message,
      });
      console.error(error);
    },
  });

  const handleJoinReservation = () => {
    joinReservationMutation.mutate({
      code: code.toUpperCase(),
      customerData,
    });
  };

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Tham gia phòng</CardTitle>
        <CardDescription>
          Có mã phòng từ bạn bè? Nhập mã vào đây để tham gia nhóm của họ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mã phòng</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Nhập mã (ví dụ: ABC123)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2 border rounded-md uppercase"
                  maxLength={10}
                />
              </div>
              <Button
                onClick={handleJoinReservation}
                className="flex items-center gap-2 cursor-pointer"
                disabled={joinReservationMutation.isPending || code.length < 6}
              >
                {joinReservationMutation.isPending ? (
                  <>
                    Đang tham gia...
                    <Loader2 className="animate-spin" />
                  </>
                ) : (
                  "Tham gia"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
