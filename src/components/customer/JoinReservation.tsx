"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerData: {
    studentId: string;
    name: string;
    email: string;
    homeroom: string;
    ticketType: string;
  };
  onJoined: () => void;
}

export function JoinReservation({ customerData, onJoined }: Props) {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");

  const handleJoinReservation = async () => {
    try {
      setJoining(true);
      const response = await fetch("/api/customer/join-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          customerData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Successfully joined the reservation!");
        setCode("");
        onJoined();
      } else {
        toast.error(result.error || "Failed to join reservation");
      }
    } catch (error) {
      toast.error("Failed to join reservation");
      console.error(error);
    } finally {
      setJoining(false);
    }
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
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase())
                  }
                  className="w-full pl-10 pr-4 py-2 border rounded-md uppercase"
                  maxLength={10}
                />
              </div>
              <Button
                onClick={handleJoinReservation}
                disabled={joining || code.length < 6}
              >
                {joining ? "Joining..." : "Join"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

