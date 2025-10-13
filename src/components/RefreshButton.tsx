"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface RefreshButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function RefreshButton({
  className = " px-6 py-2  text-white rounded-lg cursor-pointer ",
  children = "Tải lại trang",
}: RefreshButtonProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Button onClick={handleRefresh} className={className}>
      {children}
      <RefreshCcw />
    </Button>
  );
}
