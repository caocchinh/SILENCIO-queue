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
import { retryAuth } from "@/dal/retry";
import { CustomerQueueInterface } from "@/components/customer/CustomerQueueInterface";

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

  if (!session) {
    return (
      <RedirectMessage
        message="Bạn chưa đăng nhập!"
        subMessage="Đang chuyển hướng đến trang đăng nhập..."
        redirectTo={`/?error=${ERROR_CODES.NOT_LOGGED_IN}`}
      />
    );
  }

  // Check if user is admin - redirect to admin dashboard
  // if (session.user.role === "admin") {
  //   return (
  //     <RedirectMessage
  //       message="Redirecting to Admin Dashboard..."
  //       subMessage="Please wait..."
  //       redirectTo="/admin"
  //     />
  //   );
  // }

  const currentCustomer = await db.query.customer.findFirst({
    where: eq(customer.email, session.user.email),
  });

  // Check if user should be signed out (no customer or unsupported ticket type)

  if (
    !currentCustomer ||
    UNSUPPORT_TICKET_TYPE.includes(currentCustomer.ticketType)
  ) {
    try {
      await retryAuth(async () => {
        const response = await auth.api.signOut({
          headers: await headers(),
        });
        if (!response.success) {
          throw new Error("Failed to sign out user");
        }
      }, "Sign out");
    } catch (signOutError) {
      console.error("Failed to sign out user:", signOutError);
    }
    // Continue with redirect even if sign out fails
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

  // Redirect customers to queue interface
  return (
    <div className="relative flex items-center min-h-[calc(100vh-40px)] justify-start w-full bg-[url('/assets/bg.png')] overflow-hidden bg-contain p-4 flex-col">
      <CustomerQueueInterface customer={currentCustomer} session={session} />
    </div>
  );
}
