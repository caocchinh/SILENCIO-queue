"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  joinQueue,
  leaveQueue,
  createReservation,
  joinReservation,
} from "@/server/customer";
import { ActionResponse } from "@/constants/errors";

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

export function useJoinQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JoinQueueParams): Promise<ActionResponse> => {
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
        toast.error(data.message || "Failed to join queue");
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
    ): Promise<ActionResponse> => {
      return await createReservation(params);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        const reservationCode = (data.data as { code?: string })?.code || "N/A";
        toast.success(`Reservation created! Your code is: ${reservationCode}`, {
          duration: 10000,
        });
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({
          queryKey: ["customer-spot", variables.customerData.studentId],
        });
      } else {
        toast.error(data.message || "Failed to create reservation");
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
    mutationFn: async (
      params: JoinReservationParams
    ): Promise<ActionResponse> => {
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
        toast.error(data.message || "Failed to join reservation");
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
    mutationFn: async (params: LeaveQueueParams): Promise<ActionResponse> => {
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
        toast.error(data.message || "Failed to leave queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to leave queue");
      console.error(error);
    },
  });
}
