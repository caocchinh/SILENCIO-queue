/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { QueueList } from "./QueueList";
import { ReservationForm } from "./ReservationForm";
import { JoinReservation } from "./JoinReservation";
import { MyQueueSpot } from "./MyQueueSpot";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Customer,
  HauntedHouseWithDetailedQueues,
  QueueSpotWithDetails,
} from "@/lib/types/queue";
import Navbar from "../Navbar";
import { Loader2 } from "lucide-react";

async function fetchHauntedHouses(): Promise<HauntedHouseWithDetailedQueues[]> {
  const response = await fetch("/api/haunted-houses");
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch haunted houses");
  }

  return result.data || [];
}

async function fetchCustomerSpot(
  studentId: string
): Promise<QueueSpotWithDetails | null> {
  const response = await fetch(`/api/customer/my-spot?studentId=${studentId}`);
  const result = await response.json();

  if (!result.success) {
    return null;
  }

  return result.data || null;
}

interface Props {
  customer: Customer;
  session: any;
}

export function CustomerQueueInterface({ customer, session }: Props) {
  const customerData = {
    studentId: customer.studentId,
    name: customer.name,
    email: customer.email,
    homeroom: customer.homeroom,
    ticketType: customer.ticketType,
  };

  const {
    data: houses = [],
    isLoading: housesLoading,
    isRefetching: housesRefetching,
    refetch: refetchHouses,
  } = useQuery({
    queryKey: ["haunted-houses"],
    queryFn: fetchHauntedHouses,
    refetchInterval: 30000,
  });

  const {
    data: mySpot = null,
    isLoading: spotLoading,
    isRefetching: spotRefetching,
    refetch: refetchSpot,
  } = useQuery({
    queryKey: ["customer-spot", customer.studentId],
    queryFn: () => fetchCustomerSpot(customer.studentId),
    refetchInterval: 30000,
    enabled: !!customer.studentId,
  });

  const loading = housesLoading || spotLoading;

  const handleRefresh = () => {
    refetchHouses();
    refetchSpot();
  };

  return (
    <>
      <Navbar
        session={session}
        student={customer}
        loading={housesRefetching || spotRefetching}
        handleRefresh={handleRefresh}
      />

      <div className="p-4 hi md:p-6 flex flex-col min-w-[300px] md:w-[700px] gap-4 items-center justify-center w-full mx-auto">
        {mySpot ? (
          <MyQueueSpot
            spot={mySpot}
            isRefetching={spotRefetching}
            onRefresh={refetchSpot}
          />
        ) : (
          <Tabs defaultValue="join" className="mb-6 w-full">
            <TabsList className="bg-white/10 border border-white/20 w-full mb-2 flex flex-wrap !h-max">
              <TabsTrigger
                value="join"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white cursor-pointer"
              >
                Join queue
              </TabsTrigger>
              <TabsTrigger
                value="reserve"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white cursor-pointer"
              >
                Create room
                {customer.reservationAttempts >= 2 && (
                  <span className="text-xs text-red-400">(Limit reached)</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="code"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white cursor-pointer"
              >
                Join with code
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="text-center py-12 text-white/60 flex flex-row items-center justify-center gap-2">
                <p>Đang tải...</p>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <TabsContent value="join" className="mt-0">
                  <QueueList
                    houses={houses}
                    customerData={customerData}
                    onRefresh={() => {
                      refetchHouses();
                      refetchSpot();
                    }}
                    isRefetching={housesRefetching || spotRefetching}
                  />
                </TabsContent>
                <TabsContent value="reserve" className="mt-0">
                  <ReservationForm
                    houses={houses}
                    customerData={customerData}
                    reservationAttempts={customer.reservationAttempts}
                  />
                </TabsContent>
                <TabsContent value="code" className="mt-0">
                  <JoinReservation customerData={customerData} />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>
    </>
  );
}
