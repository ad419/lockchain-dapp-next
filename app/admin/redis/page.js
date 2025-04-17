"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RedisAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/redis-stats");

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching Redis stats:", err);
      setError(err.message || "Failed to fetch Redis stats");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/redis-stats", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh cache: ${response.status}`);
      }

      await fetchStats();
    } catch (err) {
      console.error("Error refreshing Redis cache:", err);
      setError(err.message || "Failed to refresh Redis cache");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchStats();

      // Refresh stats every 10 seconds
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // If not authenticated or not admin, redirect to home
  if (status === "loading") {
    return <div className="container p-8">Loading authentication...</div>;
  }

  if (!session || !session.user?.isAdmin) {
    if (status !== "loading") {
      router.push("/");
    }
    return <div className="container p-8">Unauthorized: Admin access only</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Redis Cache Monitor</h1>

      <div className="flex justify-between items-center mb-8">
        <p className="text-gray-600">
          Monitor your Redis cache status and performance
        </p>

        <div className="space-x-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Stats"}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Clear & Refresh Cache"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Leaderboard Cache</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <span
                  className={
                    stats.stats.leaderboard.available
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {stats.stats.leaderboard.available ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span>{stats.stats.leaderboard.lastUpdated || "Never"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entries:</span>
                <span>{stats.stats.leaderboard.entries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TTL:</span>
                <span>
                  {stats.stats.leaderboard.ttl > 0
                    ? `${stats.stats.leaderboard.ttl}s`
                    : "Expired"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Social Data Cache</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Cached Profiles:</span>
                <span>{stats.stats.socialData.count}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Token Price Cache</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <span
                  className={
                    stats.stats.tokenPrice.available
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {stats.stats.tokenPrice.available ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TTL:</span>
                <span>
                  {stats.stats.tokenPrice.ttl > 0
                    ? `${stats.stats.tokenPrice.ttl}s`
                    : "Expired"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">System Info</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Server Time:</span>
                <span>{stats.serverTime}</span>
              </div>
              {stats.stats.holdersData && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Holders Data Available:</span>
                  <span
                    className={
                      stats.stats.holdersData.available
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {stats.stats.holdersData.available ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
