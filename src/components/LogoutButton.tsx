"use client";

import { useState } from "react";
import { Button } from "./ui/button";

import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { errorToast } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      errorToast({ message: "Đăng xuất thất bại! Vui lòng thử lại" });
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 text-sm cursor-pointer sm:w-auto w-full"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm signout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                Đang đăng xuất...
                <Loader2 className="animate-spin" />
              </>
            ) : (
              "Signout"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
