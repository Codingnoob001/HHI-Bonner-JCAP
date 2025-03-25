import React, { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: any) => void;
  existingYears: number[];
}
const CreateReportModal = ({
  isOpen,
  onClose,
  onSubmit,
  existingYears,
}: CreateReportModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    totalBudget: "",
    hra: 0,
    edu: 0,
    cm: 0,
    duplicatedClients: 0,
    unduplicatedClients: 0,
  });
  const fetchYearData = async (year: number) => {
    try {
      setIsLoading(true);
      // In a real app, this would be an API call
      const response = await fetch(`/api/financial_reports/${year}`);
      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        hra: data.hra,
        edu: data.edu,
        cm: data.cm,
        duplicatedClients: data.duplicatedClients,
        unduplicatedClients: data.unduplicatedClients,
      }));
    } catch (err) {
      console.error("Failed to fetch year data:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    setFormData((prev) => ({
      ...prev,
      year,
    }));
    fetchYearData(year);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      totalBudget: parseFloat(formData.totalBudget),
    });
  };
  if (!isOpen) return null;
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    {
      length: 5,
    },
    (_, i) => currentYear - i,
  ).filter((year) => !existingYears.includes(year));
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Create New Financial Report
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
          >
            <XIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                value={formData.year}
                onChange={handleYearChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Budget
              </label>
              <input
                type="number"
                value={formData.totalBudget}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    totalBudget: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Computed Values
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  HRA
                </label>
                <input
                  type="number"
                  value={formData.hra}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  EDU
                </label>
                <input
                  type="number"
                  value={formData.edu}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CM
                </label>
                <input
                  type="number"
                  value={formData.cm}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unduplicated Clients
                </label>
                <input
                  type="number"
                  value={formData.unduplicatedClients}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Create Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateReportModal;
