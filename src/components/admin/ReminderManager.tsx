import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendRemindEmail } from "@/server/admin";
import { errorToast, successToast } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { assignCustomerWithoutSpotToRemainingAvailableSpotAction } from "@/server/admin";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Customer {
  studentId: string;
  name: string;
  email: string;
  homeroom: string;
  ticketType: string;
  reservationAttempts: number;
  createdAt: string;
}

interface FailedEmail {
  studentName: string;
  email: string;
  error: string;
}

const ReminderManager = () => {
  // Single email form state
  const [formData, setFormData] = useState({
    studentName: "",
    email: "",
  });

  const [validationErrors, setValidationErrors] = useState({
    studentName: "",
    email: "",
  });

  // Batch email state - now using selected customers instead of text
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(
    new Set()
  );
  const [batchValidationError, setBatchValidationError] = useState("");

  // Failed emails queue
  const [failedEmails, setFailedEmails] = useState<FailedEmail[]>([]);

  const [retryStatus, setRetryStatus] = useState<string>("");

  // Query to fetch customers without queue spots
  const { data: customersWithoutQueue, isLoading: isLoadingCustomers } =
    useQuery({
      queryKey: ["customers-without-queue"],
      queryFn: async () => {
        const response = await fetch("/api/customer/without-queue");
        if (!response.ok) {
          throw new Error("Failed to fetch customers without queue");
        }
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch customers");
        }
        return result.data as Customer[];
      },
      refetchInterval: 30000, // Refetch every 30 seconds
    });

  // Single email validation
  const validateEmail = (email: string): string => {
    if (!email) {
      return "Email là bắt buộc";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Email không hợp lệ";
    }
    return "";
  };

  const validateStudentName = (name: string): string => {
    if (!name.trim()) {
      return "Tên học sinh là bắt buộc";
    }
    if (name.trim().length < 2) {
      return "Tên học sinh phải có ít nhất 2 ký tự";
    }
    return "";
  };

  const isFormValid = () => {
    return (
      formData.studentName.trim() &&
      formData.email &&
      !validationErrors.studentName &&
      !validationErrors.email
    );
  };

  const isBatchValid = () => {
    return selectedCustomers.size > 0 && !batchValidationError;
  };

  // Customer selection handlers
  const toggleCustomerSelection = (studentId: string) => {
    setSelectedCustomers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
    setBatchValidationError("");
  };

  const selectAllCustomers = () => {
    if (customersWithoutQueue) {
      setSelectedCustomers(
        new Set(customersWithoutQueue.map((c) => c.studentId))
      );
      setBatchValidationError("");
    }
  };

  const clearSelection = () => {
    setSelectedCustomers(new Set());
    setBatchValidationError("");
  };

  // Single email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await sendRemindEmail(formData);
      if (!response.success) {
        throw new Error(response.message);
      }
    },
    onMutate: () => {
      setRetryStatus("Đang gửi email với cơ chế thử lại...");
    },
    onSuccess: () => {
      successToast({
        message: "Email nhắc nhở đã được gửi thành công!",
        description: `Đã gửi email đến ${formData.email}`,
      });
      setRetryStatus("Email đã được gửi thành công!");
      // Reset form on success
      setFormData({
        studentName: "",
        email: "",
      });
      setValidationErrors({
        studentName: "",
        email: "",
      });
    },
    onError: (error: Error) => {
      // Add failed email to queue for single email sends
      setFailedEmails((prev) => [
        ...prev,
        {
          studentName: formData.studentName.trim(),
          email: formData.email.trim(),
          error: error.message,
        },
      ]);
      errorToast({
        message: "Không thể gửi email nhắc nhở",
        description: error.message,
      });
      setRetryStatus("Gửi email thất bại. Cơ chế thử lại đã được kích hoạt.");
    },
  });

  // Batch email mutation
  const sendBatchEmailsMutation = useMutation({
    mutationFn: async (
      emails: Array<{ studentName: string; email: string }>
    ) => {
      const results = [];

      for (let i = 0; i < emails.length; i++) {
        const { studentName, email } = emails[i];

        try {
          const result = await sendRemindEmail({ studentName, email });
          results.push({
            email,
            success: result.success,
            error: result.success ? null : result.message,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.push({ email, success: false, error: errorMessage });

          // Add to failed emails queue
          setFailedEmails((prev) => [
            ...prev,
            { studentName, email, error: errorMessage },
          ]);
        }

        // Small delay between emails to avoid overwhelming the server
        if (i < emails.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return results;
    },
    onMutate: () => {
      setRetryStatus("Đang gửi email hàng loạt...");
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      successToast({
        message: `Hoàn thành gửi ${successCount} email!`,
        description:
          failedCount > 0
            ? `${failedCount} email thất bại đã được thêm vào hàng đợi`
            : "Tất cả email đã được gửi thành công",
      });

      setRetryStatus(
        `${successCount} email thành công, ${failedCount} email thất bại`
      );
      setSelectedCustomers(new Set()); // Clear selection
      setBatchValidationError("");
    },
    onError: (error: Error) => {
      errorToast({
        message: "Lỗi khi gửi email hàng loạt",
        description: error.message,
      });
      setRetryStatus("Gửi email hàng loạt thất bại");
    },
  });

  const queryClient = useQueryClient();

  const assignSpotsMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const response =
        await assignCustomerWithoutSpotToRemainingAvailableSpotAction({
          customerIds,
        });
      if (!response.success) {
        throw new Error(response.message);
      }
      return response;
    },
    onMutate: () => {
      setRetryStatus("Đang phân công chỗ ngồi...");
    },
    onSuccess: () => {
      successToast({
        message: "Phân công chỗ ngồi thành công!",
      });
      setRetryStatus("Chỗ ngồi đã được phân công!");
      setSelectedCustomers(new Set()); // Clear selection
      setBatchValidationError("");
      // Invalidate the query to refetch customers without queue
      queryClient.invalidateQueries({ queryKey: ["customers-without-queue"] });
    },
    onError: (error: Error) => {
      errorToast({
        message: "Không thể phân công chỗ ngồi",
        description: error.message,
      });
      setRetryStatus("Phân công chỗ ngồi thất bại");
    },
  });
  const retryFailedEmailMutation = useMutation({
    mutationFn: ({
      studentName,
      email,
    }: {
      studentName: string;
      email: string;
    }) => sendRemindEmail({ studentName, email }),
    onSuccess: (data, variables) => {
      if (data.success) {
        successToast({
          message: "Gửi lại email thành công!",
          description: `Đã gửi lại email đến ${variables.email}`,
        });

        // Remove from failed emails queue
        setFailedEmails((prev) =>
          prev.filter((f) => f.email !== variables.email)
        );
      } else {
        throw new Error(data.message || "Không thể gửi email");
      }
    },
    onError: (error: Error, variables) => {
      errorToast({
        message: "Gửi lại email thất bại",
        description: `Email: ${variables.email} - ${error.message}`,
      });
    },
  });

  // Retry all failed emails mutation
  const retryAllFailedEmailsMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      const currentFailedEmails = [...failedEmails];

      for (const failedEmail of currentFailedEmails) {
        try {
          const result = await sendRemindEmail({
            studentName: failedEmail.studentName,
            email: failedEmail.email,
          });
          results.push({ email: failedEmail.email, success: result.success });

          if (result.success) {
            setFailedEmails((prev) =>
              prev.filter((f) => f.email !== failedEmail.email)
            );
          }
        } catch {
          results.push({ email: failedEmail.email, success: false });
        }

        // Small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      successToast({
        message: `Gửi lại ${successCount}/${results.length} email thành công!`,
      });
    },
    onError: (error: Error) => {
      errorToast({
        message: "Lỗi khi gửi lại email",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateStudentName(formData.studentName);
    const emailError = validateEmail(formData.email);

    setValidationErrors({
      studentName: nameError,
      email: emailError,
    });

    if (nameError || emailError) {
      return;
    }

    sendEmailMutation.mutate();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customersWithoutQueue) {
      setBatchValidationError("Không thể tải danh sách học sinh");
      return;
    }

    const selectedCustomerList = customersWithoutQueue.filter((customer) =>
      selectedCustomers.has(customer.studentId)
    );

    if (selectedCustomerList.length === 0) {
      setBatchValidationError("Vui lòng chọn ít nhất một học sinh");
      return;
    }

    if (selectedCustomerList.length > 100) {
      setBatchValidationError("Không thể gửi quá 100 email cùng lúc");
      return;
    }

    const emailData: Array<{ studentName: string; email: string }> =
      selectedCustomerList.map((customer) => ({
        studentName: customer.name,
        email: customer.email,
      }));

    sendBatchEmailsMutation.mutate(emailData);
  };

  const handleAssignSpots = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customersWithoutQueue) {
      setBatchValidationError("Không thể tải danh sách học sinh");
      return;
    }

    const selectedCustomerList = customersWithoutQueue.filter((customer) =>
      selectedCustomers.has(customer.studentId)
    );

    if (selectedCustomerList.length === 0) {
      setBatchValidationError("Vui lòng chọn ít nhất một học sinh");
      return;
    }

    const customerIds = selectedCustomerList.map(
      (customer) => customer.studentId
    );

    assignSpotsMutation.mutate(customerIds);
  };

  const handleRetryFailed = (failedEmail: FailedEmail) => {
    retryFailedEmailMutation.mutate({
      studentName: failedEmail.studentName,
      email: failedEmail.email,
    });
  };

  const handleRetryAllFailed = () => {
    if (failedEmails.length === 0) return;
    retryAllFailedEmailsMutation.mutate();
  };

  const handleClearFailedQueue = () => {
    setFailedEmails([]);
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear validation error for this field
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Quản lý nhắc nhở</h2>
          <p className="text-gray-600">
            Gửi email nhắc nhở học sinh chọn khung giờ nhà ma
          </p>
        </div>
        {retryStatus && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
              sendEmailMutation.isSuccess ||
                sendBatchEmailsMutation.isSuccess ||
                assignSpotsMutation.isSuccess
                ? "bg-green-100 text-green-800"
                : sendEmailMutation.isError ||
                  sendBatchEmailsMutation.isError ||
                  assignSpotsMutation.isError
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            )}
          >
            {sendEmailMutation.isSuccess ||
            sendBatchEmailsMutation.isSuccess ? (
              <CheckCircle className="h-4 w-4" />
            ) : sendEmailMutation.isError ||
              sendBatchEmailsMutation.isError ||
              assignSpotsMutation.isError ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            {retryStatus}
          </div>
        )}
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gửi đơn lẻ
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gửi hàng loạt
          </TabsTrigger>
        </TabsList>

        {/* Single Email Tab */}
        <TabsContent value="single">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Gửi email nhắc nhở
                </CardTitle>
                <CardDescription>
                  Gửi email nhắc nhở cho một học sinh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Tên học sinh</Label>
                    <Input
                      id="student-name"
                      type="text"
                      placeholder="Nhập tên học sinh"
                      value={formData.studentName}
                      onChange={handleInputChange("studentName")}
                      className={cn(
                        validationErrors.studentName ? "border-red-500" : ""
                      )}
                    />
                    {validationErrors.studentName && (
                      <p className="text-sm text-red-500">
                        {validationErrors.studentName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Nhập email học sinh"
                      value={formData.email}
                      onChange={handleInputChange("email")}
                      className={cn(
                        validationErrors.email ? "border-red-500" : ""
                      )}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-500">
                        {validationErrors.email}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={sendEmailMutation.isPending || !isFormValid()}
                    className="w-full"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Gửi email nhắc nhở
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Retry Information */}
            <Card>
              <CardHeader>
                <CardTitle>Cơ chế thử lại</CardTitle>
                <CardDescription>
                  Thông tin về hệ thống thử lại khi gửi email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Hệ thống thử lại tự động
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • Tự động thử lại tối đa 2 lần khi gửi email thất bại
                    </li>
                    <li>• Thời gian chờ giữa các lần thử: 1-8 giây</li>
                    <li>• Sử dụng thuật toán exponential backoff với jitter</li>
                    <li>• Tự động xác minh cấu hình email trước khi gửi</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Kiểm tra bổ sung
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Xác minh message ID sau khi gửi</li>
                    <li>• Kiểm tra danh sách recipients được chấp nhận</li>
                    <li>• Ghi log chi tiết cho việc debug</li>
                    <li>• Xử lý lỗi chi tiết và thông báo rõ ràng</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Failed Emails Queue - Single Tab */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Email thất bại ({failedEmails.length})
                  </CardTitle>
                  <CardDescription>Danh sách email cần gửi lại</CardDescription>
                </div>
                {failedEmails.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryAllFailed}
                      disabled={retryAllFailedEmailsMutation.isPending}
                    >
                      {retryAllFailedEmailsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Gửi lại...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Gửi lại tất cả
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearFailedQueue}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {failedEmails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Không có email thất bại</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {failedEmails.map((failedEmail, index) => (
                    <div
                      key={index}
                      className="border border-red-200 rounded-lg p-3 bg-red-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {failedEmail.studentName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {failedEmail.email}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {failedEmail.error}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryFailed(failedEmail)}
                          disabled={retryFailedEmailMutation.isPending}
                          className="flex-shrink-0"
                        >
                          {retryFailedEmailMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Email Tab */}
        <TabsContent value="batch">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Chọn học sinh cần nhắc nhở
                    </CardTitle>
                    <CardDescription>
                      Chọn học sinh chưa có lượt để gửi email nhắc nhở
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllCustomers}
                      disabled={
                        !customersWithoutQueue ||
                        customersWithoutQueue.length === 0
                      }
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={selectedCustomers.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Đang tải danh sách học sinh...
                  </div>
                ) : !customersWithoutQueue ||
                  customersWithoutQueue.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Không có học sinh nào cần nhắc nhở</p>
                    <p className="text-sm">Tất cả học sinh đã có lượt</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>
                        Đã chọn: {selectedCustomers.size}/
                        {customersWithoutQueue.length}
                      </span>
                      {batchValidationError && (
                        <span className="text-red-500">
                          {batchValidationError}
                        </span>
                      )}
                    </div>

                    {customersWithoutQueue.map((customer) => (
                      <div
                        key={customer.studentId}
                        className={cn(
                          "flex items-center space-x-3 p-3 border rounded-lg transition-colors",
                          selectedCustomers.has(customer.studentId)
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          id={customer.studentId}
                          checked={selectedCustomers.has(customer.studentId)}
                          onChange={() =>
                            toggleCustomerSelection(customer.studentId)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={customer.studentId}
                            className="font-medium text-sm cursor-pointer"
                          >
                            {customer.name}
                          </label>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Email: {customer.email}</p>
                            <p>
                              Lớp: {customer.homeroom} • Loại vé:{" "}
                              {customer.ticketType}
                            </p>
                            <p>Lần thử: {customer.reservationAttempts}/2</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleBatchSubmit} className="mt-4">
                  <Button
                    type="submit"
                    disabled={
                      sendBatchEmailsMutation.isPending ||
                      !isBatchValid() ||
                      isLoadingCustomers
                    }
                    className="w-full"
                  >
                    {sendBatchEmailsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi {selectedCustomers.size} email...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Gửi {selectedCustomers.size} email nhắc nhở
                      </>
                    )}
                  </Button>
                </form>

                <Button
                  onClick={handleAssignSpots}
                  disabled={
                    assignSpotsMutation.isPending ||
                    !isBatchValid() ||
                    isLoadingCustomers
                  }
                  className="w-full mt-2"
                  variant="outline"
                >
                  {assignSpotsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang phân công...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Phân công {selectedCustomers.size} chỗ ngồi
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Information - Batch Tab */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin tự động</CardTitle>
                <CardDescription>
                  Hệ thống tự động tìm học sinh chưa có lượt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Tự động cập nhật
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Tự động tải danh sách học sinh chưa có lượt</li>
                    <li>• Cập nhật mỗi 30 giây</li>
                    <li>• Chỉ hiển thị học sinh có thể tham gia</li>
                    <li>• Loại trừ học sinh có vé không hợp lệ</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Tính năng chọn
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Chọn từng học sinh hoặc chọn tất cả</li>
                    <li>• Hiển thị thông tin chi tiết</li>
                    <li>• Validation trước khi gửi</li>
                    <li>• Hạn chế 100 email mỗi lần</li>
                  </ul>
                </div>

                {customersWithoutQueue && customersWithoutQueue.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Thống kê</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>Tổng số: {customersWithoutQueue.length} học sinh</p>
                      <p>Đã chọn: {selectedCustomers.size} học sinh</p>
                      <p>
                        Còn lại:{" "}
                        {customersWithoutQueue.length - selectedCustomers.size}{" "}
                        học sinh
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Failed Emails Queue - Batch Tab (same as single tab) */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Email thất bại ({failedEmails.length})
                  </CardTitle>
                  <CardDescription>Danh sách email cần gửi lại</CardDescription>
                </div>
                {failedEmails.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryAllFailed}
                      disabled={retryAllFailedEmailsMutation.isPending}
                    >
                      {retryAllFailedEmailsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Gửi lại...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Gửi lại tất cả
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearFailedQueue}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {failedEmails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Không có email thất bại</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {failedEmails.map((failedEmail, index) => (
                    <div
                      key={index}
                      className="border border-red-200 rounded-lg p-3 bg-red-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {failedEmail.studentName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {failedEmail.email}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {failedEmail.error}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryFailed(failedEmail)}
                          disabled={retryFailedEmailMutation.isPending}
                          className="flex-shrink-0"
                        >
                          {retryFailedEmailMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReminderManager;
