import React from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
interface YearReportProps {
  report: {
    year: number;
    totalBudget: number;
    hra: number;
    edu: number;
    cm: number;
    duplicatedClients: number;
    unduplicatedClients: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
}
const YearReport = ({ report, isExpanded, onToggle }: YearReportProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
      >
        <div className="flex items-center space-x-4">
          <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {report.year}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Budget: {formatCurrency(report.totalBudget)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon size={20} className="text-gray-400" />
        ) : (
          <ChevronDownIcon size={20} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  HRA
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.hra}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  EDU
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.edu}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  CM
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.cm}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Unduplicated Clients
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.unduplicatedClients}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Duplicated Clients
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.duplicatedClients}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total Services
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {report.hra + report.edu + report.cm}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default YearReport;
