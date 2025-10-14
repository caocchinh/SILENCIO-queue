"use client";

import { useQuery } from "@tanstack/react-query";
import { HauntedHouseWithQueues } from "@/lib/types/queue";

interface ApiResponse {
  success: boolean;
  data?: HauntedHouseWithQueues[];
  error?: string;
}

async function fetchHauntedHouses(): Promise<HauntedHouseWithQueues[]> {
  const response = await fetch("/api/haunted-houses");
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch haunted houses");
  }
  
  return result.data || [];
}

export function useHauntedHouses() {
  return useQuery({
    queryKey: ["haunted-houses"],
    queryFn: fetchHauntedHouses,
    // Refetch every 30 seconds to keep data fresh
    refetchInterval: 30000,
  });
}

