import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getColumnNumber = (columnLetter: string): number => {
  return columnLetter.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
};

/**
 * Safely trims a string, handling null/undefined values
 * @param str - The input string to trim
 * @returns The trimmed string, or empty string if input is null/undefined
 * @example
 * safeTrim("  hello  ") // returns "hello"
 * safeTrim(null) // returns ""
 * safeTrim(undefined) // returns ""
 * safeTrim("") // returns ""
 */
export const safeTrim = (str: string | null | undefined): string => {
  if (str == null || str == undefined) return "";
  if (typeof str !== "string") return "";
  return str.trim();
};

export const successToast = ({
  message,
  description,
}: {
  message: string;
  description?: string;
}) => {
  const toastId = toast.success(message, {
    description: description,
    duration: 3000,
    style: {
      backgroundColor: "#00a63e",
      color: "white",
      textAlign: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    descriptionClassName: "!text-white font-medium",
    className: "flex items-center justify-center flex-col gap-5 w-[300px]",
    actionButtonStyle: {
      backgroundColor: "white",
      color: "black",
      border: "none",
      padding: "8px 16px",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      pointerEvents: "auto",
      zIndex: 9999,
    },
    action: {
      label: "Đóng",
      onClick: () => toast.dismiss(toastId),
    },
  });
  return toastId;
};

export const errorToast = ({
  message,
  description,
}: {
  message: string;
  description?: string;
}) => {
  const toastId = toast.error(message, {
    description: description,
    duration: 3000,
    style: {
      backgroundColor: "#e7000b",
      color: "white",
      textAlign: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    descriptionClassName: "!text-white font-medium",
    className: "flex items-center justify-center flex-col gap-5 w-[300px]",
    actionButtonStyle: {
      backgroundColor: "white",
      color: "black",
      border: "none",
      padding: "8px 16px",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      pointerEvents: "auto",
      zIndex: 9999,
    },
    action: {
      label: "Đóng",
      onClick: () => toast.dismiss(toastId),
    },
  });
  return toastId;
};

/**
 * Utility functions for checking queue spot status
 */
export const spotStatusUtils = {
  /**
   * Check if a spot is available
   * @param spot - The queue spot to check
   * @returns True if the spot status is "available"
   */
  isAvailable: (spot: { status: string }): boolean => {
    return spot.status === "available";
  },

  /**
   * Check if a spot is occupied (has someone but no reservation)
   * @param spot - The queue spot to check
   * @returns True if the spot status is "occupied" and has no reservationId
   */
  isOccupied: (spot: {
    status: string;
    reservationId?: string | null;
  }): boolean => {
    return spot.status === "occupied" && !spot.reservationId;
  },

  /**
   * Check if a spot is reserved (has a reservation)
   * @param spot - The queue spot to check
   * @returns True if the spot has a reservation (either reserved status with reservationId or occupied with reservationId)
   */
  isReserved: (spot: {
    status: string;
    reservationId?: string | null;
  }): boolean => {
    return (
      (spot.status === "reserved" && !!spot.reservationId) ||
      (spot.status === "occupied" && !!spot.reservationId)
    );
  },

  /**
   * Calculate statistics for an array of spots
   * @param spots - Array of queue spots
   * @returns Object containing counts for available, occupied, reserved, and total spots
   */
  calculateStats: (
    spots: Array<{ status: string; reservationId?: string | null }>
  ) => {
    const availableSpots = spots.filter(spotStatusUtils.isAvailable).length;
    const occupiedSpots = spots.filter(spotStatusUtils.isOccupied).length;
    const reservedSpots = spots.filter(spotStatusUtils.isReserved).length;

    return {
      availableSpots,
      occupiedSpots,
      reservedSpots,
      totalSpots: spots.length,
    };
  },

  /**
   * Get display status for UI purposes
   * @param spot - The queue spot to check
   * @returns Object with boolean flags for available, occupied, and reserved states
   */
  getDisplayStatus: (spot: {
    status: string;
    reservationId?: string | null;
  }) => {
    const isAvailable = spotStatusUtils.isAvailable(spot);
    const isOccupied = spotStatusUtils.isOccupied(spot);
    const isReserved = spotStatusUtils.isReserved(spot);

    return {
      isAvailable,
      isOccupied,
      isReserved,
    };
  },
};
