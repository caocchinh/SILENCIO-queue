"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface RedirectMessageProps {
  message: string;
  subMessage: string;
  redirectTo: string;
}

export default function RedirectMessage({
  message,
  subMessage,
  redirectTo,
}: RedirectMessageProps) {
  const router = useRouter();

  useEffect(() => {
    router.push(redirectTo);
  }, [redirectTo, router]);

  return (
    <div className="h-screen -mb-5 -mt-5 overflow-hidden w-full flex flex-col justify-center items-center gap-1 relative z-10">
      <div className="flex w-full flex-col items-center justify-center gap-5 bg-transparent">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">{message}</p>
          <p className="text-sm text-gray-600">{subMessage}</p>
        </div>
      </div>
      <Loader2 className="animate-spin mt-2" size={35} />
    </div>
  );
}
