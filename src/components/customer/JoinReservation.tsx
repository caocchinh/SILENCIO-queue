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
import { Ticket } from "lucide-react";
import { joinReservation } from "@/server/customer";

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
        toast.success("Successfully joined the reservation!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", customerData.studentId],
        });
        setCode("");
      } else {
        toast.error(data.message || "Failed to join reservation");
      }
    },
    onError: (error) => {
      toast.error("Failed to join reservation");
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
        <CardTitle>Join Reservation</CardTitle>
        <CardDescription>
          Have a reservation code from a friend? Enter it here to join their
          group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Reservation Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter code (e.g., ABC123)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2 border rounded-md uppercase"
                  maxLength={10}
                />
              </div>
              <Button
                onClick={handleJoinReservation}
                disabled={joinReservationMutation.isPending || code.length < 6}
              >
                {joinReservationMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
