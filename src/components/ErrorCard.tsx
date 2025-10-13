import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RefreshButton } from "@/components/RefreshButton";
import { TriangleAlert } from "lucide-react";

interface ErrorCardProps {
  message: string;
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className="h-screen flex items-center justify-center p-2 w-full -mt-10">
      <Card className="w-[90%] max-w-md border-red-500">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <TriangleAlert
              size={95}
              strokeWidth={1.5}
              className="text-red-500"
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Lỗi</h2>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <RefreshButton />
        </CardContent>
      </Card>
    </div>
  );
}
