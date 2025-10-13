import { ErrorCard } from "@/components/ErrorCard";
import { verifySession } from "@/dal/verifySession";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
} from "@/constants/errors";
import RedirectMessage from "@/components/RedirectMessage";
import { db } from "@/drizzle/db";
import { eq } from "drizzle-orm";
import { customer } from "@/drizzle/schema";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { UNSUPPORT_TICKET_TYPE } from "@/constants/constants";

export default async function DashboardPage() {
  let session;

  try {
    session = await verifySession();
  } catch (sessionError) {
    console.error("Failed to verify session:", sessionError);
    return (
      <ErrorCard
        message={getErrorMessage(ERROR_CODES.SESSION_VERIFICATION_FAILED)}
      />
    );
  }

  if (session) {
    const currentCustomer = await db.query.customer.findFirst({
      where: eq(customer.email, session.user.email),
    });

    // Check if user should be signed out (no customer or unsupported ticket type)

    if (
      !currentCustomer ||
      UNSUPPORT_TICKET_TYPE.includes(currentCustomer.ticketType)
    ) {
      try {
        await auth.api.signOut({
          headers: await headers(),
        });
      } catch (signOutError) {
        console.error("Failed to sign out user:", signOutError);
        // Continue with redirect even if sign out fails
      }
      let errorCode;
      if (
        currentCustomer &&
        UNSUPPORT_TICKET_TYPE.includes(currentCustomer.ticketType)
      ) {
        errorCode = ERROR_CODES.TICKET_TYPE_NOT_SUPPORTED;
      } else {
        errorCode = ERROR_CODES.DOES_NOT_HAVE_TICKET;
      }
      return (
        <RedirectMessage
          message={ERROR_MESSAGES[errorCode]}
          subMessage="Đang chuyển hướng đến trang đăng nhập..."
          redirectTo={`/?error=${errorCode}`}
        />
      );
    }
  } else {
    return (
      <RedirectMessage
        message="Bạn chưa đăng nhập!"
        subMessage="Đang chuyển hướng đến trang đăng nhập..."
        redirectTo={`/?error=${ERROR_CODES.NOT_LOGGED_IN}`}
      />
    );
  }

  return <div>DashboardPage</div>;
}
