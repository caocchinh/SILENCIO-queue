"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateHouseParams {
  name: string;
  duration: number;
}

interface DeleteHouseParams {
  name: string;
}

interface CreateQueueParams {
  hauntedHouseName: string;
  queueNumber: number;
  maxCustomers: number;
}

interface DeleteQueueParams {
  queueId: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function useCreateHauntedHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateHouseParams): Promise<ApiResponse> => {
      const response = await fetch("/api/haunted-houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.error || "Failed to create haunted house");
      }
    },
    onError: (error) => {
      toast.error("Failed to create haunted house");
      console.error(error);
    },
  });
}

export function useDeleteHauntedHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteHouseParams): Promise<ApiResponse> => {
      const response = await fetch(
        `/api/haunted-houses/${encodeURIComponent(params.name)}`,
        {
          method: "DELETE",
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.error || "Failed to delete haunted house");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete haunted house");
      console.error(error);
    },
  });
}

export function useCreateQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateQueueParams): Promise<ApiResponse> => {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.error || "Failed to create queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to create queue");
      console.error(error);
    },
  });
}

export function useDeleteQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteQueueParams): Promise<ApiResponse> => {
      const response = await fetch(`/api/queues/${params.queueId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.error || "Failed to delete queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete queue");
      console.error(error);
    },
  });
}

