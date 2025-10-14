"use client";

import { useState } from "react";
import { QueueList } from "./QueueList";
import { ReservationForm } from "./ReservationForm";
import { JoinReservation } from "./JoinReservation";
import { MyQueueSpot } from "./MyQueueSpot";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Customer } from "@/lib/types/queue";
import { useHauntedHouses } from "@/hooks/useHauntedHouses";
import { useCustomerSpot } from "@/hooks/useCustomerSpot";

interface Props {
  customer: Customer;
}

export function CustomerQueueInterface({ customer }: Props) {
  const [activeTab, setActiveTab] = useState<"join" | "reserve" | "code">(
    "join"
  );

  const customerData = {
    studentId: customer.studentId,
    name: customer.name,
    email: customer.email,
    homeroom: customer.homeroom,
    ticketType: customer.ticketType,
  };

  // Use TanStack Query hooks
  const {
    data: houses = [],
    isLoading: housesLoading,
    refetch: refetchHouses,
  } = useHauntedHouses();
  const {
    data: mySpot = null,
    isLoading: spotLoading,
    refetch: refetchSpot,
  } = useCustomerSpot(customer.studentId);

  const loading = housesLoading || spotLoading;

  const handleRefresh = () => {
    refetchHouses();
    refetchSpot();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Queue System</h1>
            <p className="text-white/70 mt-1">
              Welcome, {customer.name} ({customer.studentId})
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="secondary"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-white/60 text-sm">Student ID</p>
              <p className="font-semibold">{customer.studentId}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Homeroom</p>
              <p className="font-semibold">{customer.homeroom}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Ticket Type</p>
              <p className="font-semibold">{customer.ticketType}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Reservation Attempts</p>
              <p className="font-semibold">
                {customer.reservationAttempts} / 2 used
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {mySpot ? (
          <div className="mb-8">
            <MyQueueSpot spot={mySpot} />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 border-b border-white/20">
                <button
                  onClick={() => setActiveTab("join")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "join"
                      ? "border-b-2 border-white text-white"
                      : "text-white/60 hover:text-white/90"
                  }`}
                >
                  Join Queue
                </button>
                <button
                  onClick={() => setActiveTab("reserve")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "reserve"
                      ? "border-b-2 border-white text-white"
                      : "text-white/60 hover:text-white/90"
                  }`}
                  disabled={customer.reservationAttempts >= 2}
                >
                  Create Reservation
                  {customer.reservationAttempts >= 2 && (
                    <span className="ml-2 text-xs text-red-400">
                      (Max reached)
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "code"
                      ? "border-b-2 border-white text-white"
                      : "text-white/60 hover:text-white/90"
                  }`}
                >
                  Join with Code
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-white/60">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === "join" && (
                  <QueueList houses={houses} customerData={customerData} />
                )}
                {activeTab === "reserve" && (
                  <ReservationForm
                    houses={houses}
                    customerData={customerData}
                    reservationAttempts={customer.reservationAttempts}
                  />
                )}
                {activeTab === "code" && (
                  <JoinReservation customerData={customerData} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
