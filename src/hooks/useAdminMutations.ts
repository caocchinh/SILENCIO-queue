"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createHauntedHouse,
  deleteHauntedHouse,
  createQueue,
  deleteQueue,
} from "@/server/admin";
import { ActionResponse } from "@/constants/errors";

interface CreateHouseParams {
  name: string;
  duration: number;
  breakTimePerQueue: number;
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

export function useCreateHauntedHouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateHouseParams): Promise<ActionResponse> => {
      return await createHauntedHouse(params);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to create haunted house");
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
    mutationFn: async (params: DeleteHouseParams): Promise<ActionResponse> => {
      return await deleteHauntedHouse(params);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Haunted house deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to delete haunted house");
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
    mutationFn: async (params: CreateQueueParams): Promise<ActionResponse> => {
      return await createQueue(params);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue created successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to create queue");
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
    mutationFn: async (params: DeleteQueueParams): Promise<ActionResponse> => {
      return await deleteQueue(params);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Queue deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
      } else {
        toast.error(data.message || "Failed to delete queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete queue");
      console.error(error);
    },
  });
}
