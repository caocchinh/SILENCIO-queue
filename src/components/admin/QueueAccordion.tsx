"use client";

import { QueueWithDetails } from "@/lib/types/queue";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Clock,
  Users,
  Calendar,
  User,
  Mail,
  Home,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Props {
  queues: QueueWithDetails[];
  onDelete?: (queueId: string) => void;
  onUpdate?: (queue: QueueWithDetails) => void;
  showDelete?: boolean;
  showUpdate?: boolean;
}

export function QueueAccordion({
  queues,
  onDelete,
  onUpdate,
  showDelete = false,
  showUpdate = false,
}: Props) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: "Còn trống", variant: "default" as const },
      occupied: { label: "Đã chiếm", variant: "secondary" as const },
      reserved: { label: "Đã đặt", variant: "outline" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "default" as const,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatTime = (date: Date) => {
    try {
      return format(new Date(date), "HH:mm", { locale: vi });
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (date: Date) => {
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });
    } catch {
      return "N/A";
    }
  };

  if (!queues || queues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có lượt nào
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {queues.map((queue) => (
        <AccordionItem
          key={queue.id}
          value={queue.id}
          className="border rounded-lg bg-white"
        >
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    Lượt {queue.queueNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(queue.queueStartTime)} -{" "}
                    {formatTime(queue.queueEndTime)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {queue.stats.occupiedSpots}/{queue.stats.totalSpots}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showUpdate && onUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(queue);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {showDelete && onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(queue.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 mt-2">
              {/* Stats Section */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Thống kê
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Tổng chỗ</p>
                      <p className="text-2xl font-bold">
                        {queue.stats.totalSpots}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Đã chiếm</p>
                      <p className="text-2xl font-bold text-green-600">
                        {queue.stats.occupiedSpots}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Đã đặt</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {queue.stats.reservedSpots}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Còn trống</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {queue.stats.availableSpots}
                      </p>
                    </div>
                  </div>
                  {queue.stats.activeReservations !== undefined && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Đặt chỗ đang hoạt động:{" "}
                        <span className="font-semibold text-foreground">
                          {queue.stats.activeReservations}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Queue Info Section */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Thông tin lượt
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID lượt:</span>
                      <span className="font-mono text-xs">{queue.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số lượt:</span>
                      <span className="font-semibold">{queue.queueNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Thời gian bắt đầu:
                      </span>
                      <span>{formatDateTime(queue.queueStartTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Thời gian kết thúc:
                      </span>
                      <span>{formatDateTime(queue.queueEndTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Số học sinh tối đa:
                      </span>
                      <span className="font-semibold">
                        {queue.maxCustomers}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customers Section */}
              {queue.spots && queue.spots.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Danh sách học sinh ({queue.spots.length} chỗ)
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {queue.spots
                        .sort((a, b) => a.spotNumber - b.spotNumber)
                        .map((spot) => (
                          <div
                            key={spot.id}
                            className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  Chỗ #{spot.spotNumber}
                                </span>
                                {getStatusBadge(spot.status)}
                              </div>
                              {spot.customer && (
                                <div className="space-y-1 text-sm mt-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">
                                      {spot.customer.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span>{spot.customer.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Home className="h-3 w-3" />
                                    <span>
                                      {spot.customer.homeroom} •{" "}
                                      {spot.customer.ticketType}
                                    </span>
                                  </div>
                                  {spot.customer.studentId && (
                                    <div className="text-xs text-muted-foreground">
                                      MSSV: {spot.customer.studentId}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!spot.customer &&
                                spot.status === "available" && (
                                  <p className="text-sm text-muted-foreground italic">
                                    Chỗ còn trống
                                  </p>
                                )}
                              {spot.reservationId && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Mã đặt chỗ: {spot.reservationId}
                                </div>
                              )}
                              {spot.occupiedAt && (
                                <div className="text-xs text-muted-foreground">
                                  Chiếm lúc: {formatDateTime(spot.occupiedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
