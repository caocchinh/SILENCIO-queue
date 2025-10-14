import { ErrorCard } from "@/components/ErrorCard";
import { verifySession } from "@/dal/verifySession";
import { ERROR_CODES, getErrorMessage } from "@/constants/errors";
import RedirectMessage from "@/components/RedirectMessage";

import AdminIndex from "./Index";

export default async function AdminPage() {
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

  if (session.user.role !== "admin") {
    return (
      <RedirectMessage
        message="Bạn không có quyền truy cập trang này!"
        subMessage="Đang chuyển hướng đến trang đăng nhập..."
        redirectTo={`/?error=${ERROR_CODES.UNAUTHORIZED}`}
      />
    );
  }

  // Redirect customers to queue interface
  return <AdminIndex />;
}
