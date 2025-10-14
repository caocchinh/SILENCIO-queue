"use client";

import { useQuery } from "@tanstack/react-query";
import { HauntedHouseManager } from "@/components/admin/HauntedHouseManager";
import { QueueManager } from "@/components/admin/QueueManager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { HauntedHouseWithQueues } from "@/lib/types/queue";
import { cn } from "@/lib/utils";

async function fetchHauntedHouses(): Promise<HauntedHouseWithQueues[]> {
  const response = await fetch("/api/haunted-houses");
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch haunted houses");
  }

  return result.data || [];
}

export default function AdminIndex() {
  const {
    data: houses = [],
    isLoading: loading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["haunted-houses"],
    queryFn: fetchHauntedHouses,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-semibold">Bảng điều khiển</h1>
          <Button onClick={() => refetch()} disabled={loading}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")}
            />
            Tải lại
          </Button>
        </div>

        {isError ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <Tabs defaultValue="houses" className="w-full">
            <TabsList>
              <TabsTrigger value="houses">Nhà ma</TabsTrigger>
              <TabsTrigger value="queues">Hàng đợi lấy số</TabsTrigger>
            </TabsList>
            <TabsContent value="houses">
              <HauntedHouseManager houses={houses} />
            </TabsContent>
            <TabsContent value="queues">
              <QueueManager houses={houses} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
