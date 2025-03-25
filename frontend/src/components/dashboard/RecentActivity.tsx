import React, { useEffect, useState, useCallback } from "react";
import {
  UserIcon,
  ClipboardIcon,
  CheckCircleIcon,
  UserPlusIcon,
  Trash2,
  EditIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { dashboardApi } from "../../services/api";
import { Link } from "react-router-dom";

interface Activity {
  type: string;
  patient_name: string;
  client_id: string;
  date: string;
  time?: string;
  visit_id?: number;
  acquired_by?: string;
  entity_type?: string;
  description: string;
  created_at?: string;
}

interface RecentActivityProps {
  refreshTrigger?: number;
}

const RecentActivity = ({ refreshTrigger = 0 }: RecentActivityProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingActivities, setClearingActivities] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetchRecentActivity = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardApi.getRecentActivity(8);
      console.log("Activity data received:", response);

      if (response && response.activities) {
        setActivities(response.activities);
      } else {
        console.error("Invalid response format:", response);
        setError("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error fetching recent activities:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load recent activities",
      );
      setActivities([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearActivities = () => {
    setShowConfirmation(true);
  };

  const confirmClearActivities = async () => {
    if (clearingActivities) return;

    try {
      setClearingActivities(true);
      await dashboardApi.clearRecentActivity();

      // Refresh the activity list
      fetchRecentActivity();

      // Hide confirmation modal
      setShowConfirmation(false);
    } catch (err) {
      console.error("Error clearing activities:", err);
      setError(
        err instanceof Error ? err.message : "Failed to clear activities",
      );
    } finally {
      setClearingActivities(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity, refreshTrigger]);

  // Format date to relative time (today, yesterday, 2 days ago, etc.)
  const formatRelativeTime = (dateStr: string, timeStr?: string) => {
    try {
      if (!dateStr) return "Unknown date";

      console.log("Formatting date:", dateStr, timeStr); // Debug log

      // Handle YYYY-MM-DD format (from SQLite)
      let date: Date;
      if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
        // YYYY-MM-DD format
        const [year, month, day] = dateStr
          .split("-")
          .map((n) => parseInt(n, 10));
        date = new Date(year, month - 1, day); // month is 0-indexed
      }
      // Handle MM/DD/YYYY format
      else if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        const month = parseInt(parts[0], 10) - 1; // month is 0-indexed
        const day = parseInt(parts[1], 10);
        const year =
          parts[2].length === 2
            ? 2000 + parseInt(parts[2], 10)
            : parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
      // Fallback to standard parsing
      else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", dateStr);
        return dateStr;
      }

      // Get "today" at midnight for proper day comparison
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

      // Calculate day difference
      const timeDiff = today.getTime() - dateDay.getTime();
      const diffDays = Math.round(timeDiff / (1000 * 3600 * 24));

      console.log("Date comparison:", {
        today: today.toISOString(),
        dateDay: dateDay.toISOString(),
        diffDays,
      }); // Debug log

      if (diffDays === 0) {
        return timeStr ? `Today at ${formatTime(timeStr)}` : "Today";
      } else if (diffDays === 1) {
        return timeStr ? `Yesterday at ${formatTime(timeStr)}` : "Yesterday";
      } else if (diffDays > 1 && diffDays < 7) {
        return timeStr
          ? `${diffDays} days ago at ${formatTime(timeStr)}`
          : `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch (e) {
      console.error("Error formatting relative time:", e, { dateStr, timeStr });
      return dateStr; // Return original on error
    }
  };

  // Format time from 24h to 12h format with timezone adjustment
  const formatTime = (timeStr: string) => {
    try {
      if (!timeStr) return "";

      // Remove any existing AM/PM if present
      let cleanTime = timeStr.replace(/\s*(AM|PM)\s*/i, "").trim();

      // Split the time string into hours and minutes
      const [hours, minutes, seconds] = cleanTime.split(":");
      if (!hours || !minutes) {
        return timeStr; // Return original if parsing fails
      }

      // Convert UTC time to local time
      const now = new Date();
      const utcDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          parseInt(hours, 10),
          parseInt(minutes, 10),
          seconds ? parseInt(seconds, 10) : 0,
        ),
      );

      // Format the time using local timezone
      const localHours = utcDate.getHours();
      const localMinutes = utcDate.getMinutes();

      // Format as 12-hour time with AM/PM
      const ampm = localHours >= 12 ? "PM" : "AM";
      const hours12 = localHours % 12 || 12; // Convert 0 to 12

      // Add leading zero to minutes if needed
      const minutesFormatted =
        localMinutes < 10 ? `0${localMinutes}` : localMinutes;

      return `${hours12}:${minutesFormatted} ${ampm}`;
    } catch (e) {
      console.error("Error formatting time:", e, timeStr);
      return timeStr;
    }
  };

  // Get appropriate icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "create":
      case "new_patient":
        return <UserPlusIcon size={16} className="text-green-500" />;
      case "visit":
        return <ClipboardIcon size={16} className="text-blue-500" />;
      case "update":
        return <EditIcon size={16} className="text-amber-500" />;
      case "delete":
        return <Trash2 size={16} className="text-red-500" />;
      case "goals":
        return <CheckCircleIcon size={16} className="text-purple-500" />;
      default:
        return <UserIcon size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 p-4">
        Error loading activities: {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        No recent activities found.
      </div>
    );
  }

  const renderConfirmationModal = () => {
    if (!showConfirmation) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
          <div className="flex items-center mb-4">
            <AlertTriangle className="text-amber-500 mr-2" size={24} />
            <h3 className="text-lg font-medium">Clear All Activities?</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This will remove all activity history. This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={clearingActivities}
            >
              Cancel
            </button>
            <button
              onClick={confirmClearActivities}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              disabled={clearingActivities}
            >
              {clearingActivities ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Clearing...
                </>
              ) : (
                "Clear All"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Recent Activity
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={fetchRecentActivity}
            disabled={loading}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center"
            title="Refresh activities"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleClearActivities}
            disabled={loading || clearingActivities || activities.length === 0}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center"
            title="Clear all activities"
          >
            <Trash2 size={14} />
            <span className="ml-1">Clear</span>
          </button>
        </div>
      </div>
      {activities.map((activity, index) => (
        <div
          key={index}
          className="flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
        >
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-2 mr-3">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatRelativeTime(activity.date, activity.time)}
            </p>
          </div>
          {/* Only show View Patient link for non-delete activities or if entity_type is not 'patient' */}
          {(activity.type !== "delete" || activity.entity_type !== "patient") &&
            activity.client_id && (
              <div>
                <Link
                  to={`/patients/${activity.client_id}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Patient
                </Link>
              </div>
            )}
        </div>
      ))}
      {renderConfirmationModal()}
      <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 mt-2">
        View all activity
      </button>
    </div>
  );
};

export default RecentActivity;
