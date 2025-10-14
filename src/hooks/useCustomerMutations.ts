"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  joinQueue,
  leaveQueue,
  createReservation,
  joinReservation,
} from "@/actions/customer";

interface CustomerData {
  studentId: string;
  name: string;
  email: string;
  homeroom: string;
  ticketType: string;
}

interface JoinQueueParams {
  queueId: string;
  customerData: CustomerData;
}

interface CreateReservationParams {
  queueId: string;
  maxSpots: number;
  customerData: CustomerData;
}

interface JoinReservationParams {
  code: string;
  customerData: CustomerData;
}

interface LeaveQueueParams {
  studentId: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useJoinQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JoinQueueParams): Promise<ApiResponse> => {
      return await joinQueue(params);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully joined the queue!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.customerData.studentId],
        });
      } else {
        toast.error(data.error || "Failed to join queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to join queue");
      console.error(error);
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: CreateReservationParams
    ): Promise<ApiResponse> => {
      return await createReservation(params);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(`Reservation created! Your code is: ${data.data.code}`, {
          duration: 10000,
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.customerData.studentId],
        });
      } else {
        toast.error(data.error || "Failed to create reservation");
      }
    },
    onError: (error) => {
      toast.error("Failed to create reservation");
      console.error(error);
    },
  });
}

export function useJoinReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JoinReservationParams): Promise<ApiResponse> => {
      return await joinReservation(params);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully joined the reservation!");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.customerData.studentId],
        });
      } else {
        toast.error(data.error || "Failed to join reservation");
      }
    },
    onError: (error) => {
      toast.error("Failed to join reservation");
      console.error(error);
    },
  });
}

export function useLeaveQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LeaveQueueParams): Promise<ApiResponse> => {
      return await leaveQueue(params);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully left the queue");
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.studentId],
        });
      } else {
        toast.error(data.error || "Failed to leave queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to leave queue");
      console.error(error);
    },
  });
}
