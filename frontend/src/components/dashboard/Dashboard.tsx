import React, { useEffect, useState } from "react";
import StatCard from "./StatCard";
import RecentActivity from "./RecentActivity";
import {
  UsersIcon,
  UserPlusIcon,
  StethoscopeIcon,
  CheckCircleIcon,
} from "lucide-react";
import { dashboardApi } from "../../services/api";

// Define types for our metrics data
interface MetricsData {
  total_patients: {
    count: number;
    change_percentage: number | null;
  };
  new_patients: {
    count: number;
    change_percentage: number | null;
  };
  total_visits: {
    count: number;
    change_percentage: number | null;
  };
  follow_up_compliance: {
    percentage: number;
    change_percentage: number | null;
  };
  timeframe: {
    start_date: string;
    end_date: string;
    comparison_start: string;
    comparison_end: string;
  };
}

// Define types for our historical trends data
interface TrendsData {
  trends: {
    total_patients: number[];
    new_patients: number[];
    visits: number[];
    follow_up_compliance: number[];
    date_labels: string[];
  };
  timeframe: {
    start_date: string;
    end_date: string;
    interval_days: number;
    points: number;
  };
}

const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const refreshActivity = () => {
    setActivityRefreshKey((prev) => prev + 1);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  // Format percentage
  const formatPercentage = (percentage: number | null) => {
    if (percentage === null) return "N/A";
    return percentage > 0
      ? `+${percentage.toFixed(1)}%`
      : `${percentage.toFixed(1)}%`;
  };

  // Determine trend direction
  const getTrend = (percentage: number | null) => {
    if (percentage === null) return "up";
    return percentage >= 0 ? "up" : "down";
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const metrics = await dashboardApi.getMetrics(
          dateRange.start,
          dateRange.end,
        );
        setMetricsData(metrics);

        const trends = await dashboardApi.getHistoricalTrends(7, dateRange.end);
        setTrendsData(trends);

        refreshActivity();
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Dashboard
        </h1>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                start: e.target.value,
              }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                end: e.target.value,
              }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && metricsData && trendsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Patients"
            value={formatNumber(metricsData.total_patients.count)}
            change={formatPercentage(
              metricsData.total_patients.change_percentage,
            )}
            timeframe="from previous period"
            trend={getTrend(metricsData.total_patients.change_percentage)}
            icon={<UsersIcon size={24} />}
            color="blue"
            sparklineData={trendsData.trends.total_patients}
          />

          <StatCard
            title="New Patients"
            value={formatNumber(metricsData.new_patients.count)}
            change={formatPercentage(
              metricsData.new_patients.change_percentage,
            )}
            timeframe="from previous period"
            trend={getTrend(metricsData.new_patients.change_percentage)}
            icon={<UserPlusIcon size={24} />}
            color="green"
            sparklineData={trendsData.trends.new_patients}
          />

          <StatCard
            title="Total Visits"
            value={formatNumber(metricsData.total_visits.count)}
            change={formatPercentage(
              metricsData.total_visits.change_percentage,
            )}
            timeframe="from previous period"
            trend={getTrend(metricsData.total_visits.change_percentage)}
            icon={<StethoscopeIcon size={24} />}
            color="purple"
            sparklineData={trendsData.trends.visits}
            showSparkline={true}
          />

          <StatCard
            title="Follow-Up Compliance"
            value={`${metricsData.follow_up_compliance.percentage.toFixed(1)}%`}
            change={formatPercentage(
              metricsData.follow_up_compliance.change_percentage,
            )}
            timeframe="from previous period"
            trend={getTrend(metricsData.follow_up_compliance.change_percentage)}
            icon={<CheckCircleIcon size={24} />}
            color={
              getTrend(metricsData.follow_up_compliance.change_percentage) ===
              "up"
                ? "green"
                : "red"
            }
            sparklineData={trendsData.trends.follow_up_compliance}
          />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Recent Activity
        </h2>
        <RecentActivity />
      </div>
    </div>
  );
};

export default Dashboard;
