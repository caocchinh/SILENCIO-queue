import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import Image from "next/image";
import { ErrorCard } from "@/components/ErrorCard";
import { verifySession } from "@/dal/verifySession";
import { ERROR_CODES, getErrorMessage } from "@/constants/errors";
import RedirectMessage from "@/components/RedirectMessage";

export default async function HomePage() {
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

  // if (session) {
  //   return (
  //     <RedirectMessage
  //       message="Đang chuyển hướng đến trang lấy số thứ tự"
  //       subMessage="Vui lòng chờ trong giây lát.."
  //       redirectTo="/dashboard"
  //     />
  //   );
  // }

  return (
    <div className="h-[calc(100vh-40px)] relative flex items-center justify-center w-full bg-[url('/assets/bg.png')] overflow-hidden bg-no-repeat bg-cover">
      <div className="bg-[url('/assets/bg-2.png')] bg-no-repeat bg-cover bg-top max-w-[90%] relative max-h-[90%]">
        <div className=" absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] flex items-center justify-center flex-col w-[90%]">
          <h1 className="text-[#FFD700] -mt-10 mb-2 login_title text-[42px] font-bold font-italianno text-center  ">
            Cổng đăng nhập lấy số thứ tự
          </h1>
          <GoogleSignInButton />
        </div>
        <Image
          src="/assets/frame.png"
          alt="Frame"
          width={470}
          height={670}
          className="max-h-[90vh]"
        />
      </div>
    </div>
  );
}
