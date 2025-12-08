/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CardDescription, CardTitle } from "./ui/card";
import { LogoutButton } from "./LogoutButton";
import { cn } from "@/lib/utils";
import { Student } from "@/constants/types";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";

const Navbar = ({
  session,
  student,
  className,
  handleRefresh,
  loading,
}: {
  session: any;
  student: Student;
  className?: string;
  handleRefresh: () => void;
  loading: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex p-2 shadow-sm bg-card mx-auto rounded-md items-center justify-between gap-3 flex-col sm:flex-row border-1 w-[90%] md:w-[640px]",
        className
      )}
    >
      <div className="flex items-center">
        <div className="relative">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name || "Ảnh đại diện người dùng"}
              width={35}
              height={35}
              className="rounded-full border-2  h-[35px] mr-1 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-xl font-semibold">
                {session.user.name?.charAt(0) ||
                  session.user.email?.charAt(0) ||
                  "U"}
              </span>
            </div>
          )}
        </div>
        <div>
          <CardTitle className="text-sm">
            {student!.name} - {student?.homeroom} - {student?.ticketType}
          </CardTitle>
          <CardDescription className="text-[10px]">
            {session.user.email}
          </CardDescription>
        </div>
      </div>
      <div className="flex gap-3 items-center justify-center flex-wrap flex-col sm:flex-row w-full sm:w-max">
        <Button
          onClick={handleRefresh}
          className="w-full sm:w-max cursor-pointer"
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={cn("mr-2 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Navbar;
