import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { retryAuth } from "./retry";

export const verifySession = cache(async () => {
  return retryAuth(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return null;
    }
    return session;
  }, "Session verification");
});
