"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function useJoinQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JoinQueueParams): Promise<ApiResponse> => {
      const response = await fetch("/api/customer/join-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully joined the queue!");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({ 
          queryKey: ["customer-spot", variables.customerData.studentId] 
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
    mutationFn: async (params: CreateReservationParams): Promise<ApiResponse> => {
      const response = await fetch("/api/customer/create-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(
          `Reservation created! Your code is: ${data.data.code}`,
          { duration: 10000 }
        );
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({ 
          queryKey: ["customer-spot", variables.customerData.studentId] 
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
      const response = await fetch("/api/customer/join-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully joined the reservation!");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({ 
          queryKey: ["customer-spot", variables.customerData.studentId] 
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
      const response = await fetch("/api/customer/leave-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success("Successfully left the queue");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["haunted-houses"] });
        queryClient.invalidateQueries({ 
          queryKey: ["customer-spot", variables.studentId] 
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

