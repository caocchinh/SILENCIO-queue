import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { retryAuth, retryDatabase } from "./retry";
import { db } from "@/drizzle/db";
import { customer } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { UNSUPPORT_TICKET_TYPE } from "@/constants/constants";

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

/**
 * Verifies session and checks if customer has valid ticket type
 * Returns null if session is invalid or customer has unsupported ticket type
 */
export const verifyCustomerSession = cache(async () => {
  const session = await verifySession();

  if (!session) {
    return { session, customer: null };
  }

  if (!session || session.user.role === "admin") {
    return { session, customer: null };
  }

  const currentCustomer = await retryDatabase(
    () =>
      db.query.customer.findFirst({
        where: eq(customer.email, session.user.email),
      }),
    "fetch customer for session verification"
  );

  // Return null if customer doesn't exist or has unsupported ticket type
  if (
    !currentCustomer ||
    UNSUPPORT_TICKET_TYPE.includes(currentCustomer.ticketType)
  ) {
    return { session, customer: null };
  }

  return { session, customer: currentCustomer };
});
