"use client";

import { useState } from "react";
import { HauntedHouseManager } from "@/components/admin/HauntedHouseManager";
import { QueueManager } from "@/components/admin/QueueManager";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useHauntedHouses } from "@/hooks/useHauntedHouses";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"houses" | "queues">("houses");

  const { data: houses = [], isLoading: loading, refetch } = useHauntedHouses();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => refetch()} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab("houses")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "houses"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Haunted Houses
            </button>
            <button
              onClick={() => setActiveTab("queues")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "queues"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Queues
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === "houses" && <HauntedHouseManager houses={houses} />}
            {activeTab === "queues" && <QueueManager houses={houses} />}
          </>
        )}
      </div>
    </div>
  );
}
