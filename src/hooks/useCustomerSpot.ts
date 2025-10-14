"use client";

import { useQuery } from "@tanstack/react-query";
import { QueueSpotWithDetails } from "@/lib/types/queue";

interface ApiResponse {
  success: boolean;
  data?: QueueSpotWithDetails | null;
  error?: string;
}

async function fetchCustomerSpot(studentId: string): Promise<QueueSpotWithDetails | null> {
  const response = await fetch(`/api/customer/my-spot?studentId=${studentId}`);
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    return null;
  }
  
  return result.data || null;
}

export function useCustomerSpot(studentId: string) {
  return useQuery({
    queryKey: ["customer-spot", studentId],
    queryFn: () => fetchCustomerSpot(studentId),
    // Refetch every 30 seconds to keep data fresh
    refetchInterval: 30000,
    enabled: !!studentId,
  });
}

