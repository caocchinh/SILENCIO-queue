import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import Image from "next/image";
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

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HomePage({ searchParams }: HomeProps) {
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

    // Valid customer with supported ticket type - redirect to dashboard
    return (
      <RedirectMessage
        message="Đang chuyển hướng đến trang lấy số thứ tự"
        subMessage="Vui lòng chờ trong giây lát.."
        redirectTo="/dashboard"
      />
    );
  }

  let errorMessage = null;
  try {
    const resolvedSearchParams = await searchParams;
    errorMessage = resolvedSearchParams.error
      ? getErrorMessage(resolvedSearchParams.error as string)
      : null;
  } catch (searchParamsError) {
    console.error("Failed to resolve search params:", searchParamsError);
    errorMessage = getErrorMessage(ERROR_CODES.UNKNOWN_ERROR);
  }

  return (
    <div className="h-[calc(100vh-40px)] relative flex items-center justify-center w-full bg-[url('/assets/bg.png')] overflow-hidden bg-no-repeat bg-cover">
      <div className="bg-[url('/assets/bg-2.png')] bg-no-repeat bg-cover bg-top max-w-[90%] relative">
        <div className=" absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-[40%] flex items-center justify-center flex-col min-w-[330px] w-[90%]">
          <h1 className="text-[#FFD700] -mt-10 mb-2 login_title text-[42px] font-bold font-italianno text-center  ">
            Login portal
          </h1>
          <GoogleSignInButton />
          {errorMessage && (
            <p className="text-red-500 mt-3 text-center">{errorMessage}</p>
          )}
        </div>
        <Image
          src="/assets/frame.png"
          alt="Frame"
          width={540}
          height={675}
          className="max-h-[90vh] h-auto w-auto"
        />
      </div>
    </div>
  );
}
