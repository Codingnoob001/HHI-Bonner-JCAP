import React from "react";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  timeframe: string;
  trend: "up" | "down";
  icon: React.ReactNode;
  color: string;
  sparklineData?: number[];
  showSparkline?: boolean;
}
const StatCard = ({
  title,
  value,
  change,
  timeframe,
  trend,
  icon,
  color,
  sparklineData = [],
  showSparkline = false,
}: StatCardProps) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
    green: "bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300",
    red: "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
    purple:
      "bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300",
  };
  const trendColorClasses = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
  };
  const renderSparkline = () => {
    if (!sparklineData.length || !showSparkline) return null;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min;
    const height = 30;
    const width = 60;
    const points = sparklineData
      .map((value, index) => {
        const x = (index / (sparklineData.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <div className="absolute bottom-2 right-2 opacity-30">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={trend === "up" ? "text-green-500" : "text-red-500"}
          />
        </svg>
      </div>
    );
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative overflow-hidden">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
            {value}
          </p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="mt-4 flex items-center">
        {trend === "up" ? (
          <TrendingUpIcon
            size={16}
            className="text-green-600 dark:text-green-400"
          />
        ) : (
          <TrendingDownIcon
            size={16}
            className="text-red-600 dark:text-red-400"
          />
        )}
        <span
          className={`ml-1 text-sm font-medium ${trendColorClasses[trend]}`}
        >
          {change}
        </span>
        <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
          {timeframe}
        </span>
      </div>
      {renderSparkline()}
    </div>
  );
};
export default StatCard;
