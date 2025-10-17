/**
 * Error constants for consistent error handling across the application
 */

// Error codes for routing and user feedback
export const ERROR_CODES = {
  NOT_LOGGED_IN: "not-logged-in",
  SESSION_VERIFICATION_FAILED: "session-verification-failed",
  UNAUTHORIZED: "unauthorized",
  DATABASE_ERROR: "database-error",
  INTERNAL_SERVER_ERROR: "internal-server-error",
  UNKNOWN_ERROR: "unknown-error",
  DOES_NOT_HAVE_TICKET: "does-not-have-ticket",
  TICKET_TYPE_NOT_SUPPORTED: "ticket-type-not-supported",
  SELECTION_DEADLINE_EXPIRED: "selection-deadline-expired",
  // Validation errors
  INVALID_INPUT: "invalid-input",
  // Resource errors
  NOT_FOUND: "not-found",
  ALREADY_EXISTS: "already-exists",
  // Queue and reservation errors
  ALREADY_IN_QUEUE: "already-in-queue",
  NO_AVAILABLE_SPOTS: "no-available-spots",
  MAX_RESERVATION_ATTEMPTS: "max-reservation-attempts",
  INVALID_RESERVATION_CODE: "invalid-reservation-code",
  RESERVATION_EXPIRED: "reservation-expired",
  RESERVATION_FULL: "reservation-full",
  NOT_IN_QUEUE: "not-in-queue",
  CANNOT_CANCEL_RESERVATION: "cannot-cancel-reservation",
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.NOT_LOGGED_IN]: "Xác thực thất bại. Vui lòng thử đăng nhập lại.",
  [ERROR_CODES.SESSION_VERIFICATION_FAILED]:
    "Không thể xác minh phiên đăng nhập. Vui lòng thử đăng nhập lại.",
  [ERROR_CODES.UNAUTHORIZED]: "Bạn không có quyền truy cập tài nguyên này",
  [ERROR_CODES.DATABASE_ERROR]: "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.",
  [ERROR_CODES.INTERNAL_SERVER_ERROR]:
    "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
  [ERROR_CODES.UNKNOWN_ERROR]:
    "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
  [ERROR_CODES.DOES_NOT_HAVE_TICKET]: "Bạn chưa mua vé. Vui lòng mua vé trước.",
  [ERROR_CODES.SELECTION_DEADLINE_EXPIRED]: "Hạn chót đã qua.",
  [ERROR_CODES.TICKET_TYPE_NOT_SUPPORTED]:
    "Loại vé bạn mua không được chơi nhà ma.",
  [ERROR_CODES.INVALID_INPUT]: "Dữ liệu đầu vào không hợp lệ",
  [ERROR_CODES.NOT_FOUND]: "Không tìm thấy tài nguyên",
  [ERROR_CODES.ALREADY_EXISTS]: "Tài nguyên đã tồn tại",
  [ERROR_CODES.ALREADY_IN_QUEUE]: "Bạn đã có lượt",
  [ERROR_CODES.NO_AVAILABLE_SPOTS]: "Không còn chỗ trống trong lượt này",
  [ERROR_CODES.MAX_RESERVATION_ATTEMPTS]:
    "Đã đạt giới hạn số lần giữ slot (cho phép 2 lần)",
  [ERROR_CODES.INVALID_RESERVATION_CODE]: "Mã phòng không hợp lệ",
  [ERROR_CODES.RESERVATION_EXPIRED]: "Phòng đã hết hạn",
  [ERROR_CODES.RESERVATION_FULL]: "Phòng đã đầy",
  [ERROR_CODES.NOT_IN_QUEUE]: "Bạn không có trong lượt nào",
  [ERROR_CODES.CANNOT_CANCEL_RESERVATION]: "Không thể hủy phòng này",
} as const;

// HTTP status codes for API responses
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error response structure for API endpoints
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

// Success response structure for server actions
export interface ActionSuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

// Error response structure for server actions
export interface ActionErrorResponse {
  success: false;
  message: string;
  code?: string;
}

// Union type for server action responses
export type ActionResponse<T = unknown> =
  | ActionSuccessResponse<T>
  | ActionErrorResponse;

/**
 * Helper function to create consistent API error responses
 */
export function createApiError(
  code: keyof typeof ERROR_CODES,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  details?: string
): Response {
  const errorCode = ERROR_CODES[code];
  const message = ERROR_MESSAGES[errorCode];

  const response: ApiErrorResponse = {
    error: message,
    code: errorCode,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Helper function to create consistent server action error responses
 */
export function createActionError(
  code: keyof typeof ERROR_CODES,
  customMessage?: string
): ActionErrorResponse {
  const errorCode = ERROR_CODES[code];
  const message = customMessage || ERROR_MESSAGES[errorCode];

  return {
    success: false,
    message,
    code: errorCode,
  };
}

/**
 * Helper function to create consistent server action success responses
 */
export function createActionSuccess<T = unknown>(
  data?: T
): ActionSuccessResponse<T> {
  return {
    success: true,
    ...(data && { data }),
  };
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(errorCode: string): string {
  return (
    ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] ||
    ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
  );
}

// Type exports
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
