"use client";

import { RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
}

export function RefreshButton({
  className = " px-6 py-2  text-white rounded-lg cursor-pointer ",
  children = "Refresh",
  onClick,
  isLoading = false,
}: RefreshButtonProps) {
  const handleRefresh = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.reload();
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      className={cn("flex items-center gap-2 cursor-pointer", className)}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {children}
        </>
      ) : (
        <>
          {children}
          <RefreshCcw />
        </>
      )}
    </Button>
  );
}
