import React, { useEffect, useState } from "react";
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import CreateReportModal from "./CreateReportModal";
import YearReport from "./YearReport";
import Toast from "../Toast";
interface FinancialReport {
  year: number;
  totalBudget: number;
  hra: number;
  edu: number;
  cm: number;
  duplicatedClients: number;
  unduplicatedClients: number;
}
const FinancialReports = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  useEffect(() => {
    // Simulating data fetch
    setIsLoading(false);
  }, []);
  const handleCreateReport = (data: any) => {
    try {
      // In a real app, this would be an API call
      setReports((prev) => [...prev, data]);
      setIsModalOpen(false);
      setToast({
        message: "Financial report created successfully",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "Failed to create financial report",
        type: "error",
      });
    }
  };
  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-200">{error}</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Financial Reports
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon size={16} className="mr-1" /> Create New Report
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {reports.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No reports available
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports
                .sort((a, b) => b.year - a.year)
                .map((report) => (
                  <YearReport
                    key={report.year}
                    report={report}
                    isExpanded={expandedYear === report.year}
                    onToggle={() => toggleYear(report.year)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
      <CreateReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateReport}
        existingYears={reports.map((r) => r.year)}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
export default FinancialReports;
