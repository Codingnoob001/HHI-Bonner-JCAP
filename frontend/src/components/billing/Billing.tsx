import React, { useState } from "react";
import {
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
const Billing = () => {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [sortField, setSortField] = useState("dateOfService");
  const [sortDirection, setSortDirection] = useState("desc");
  const financialMetrics = {
    totalBudget: 1200000,
    budgetUsed: 850000,
    budgetRemaining: 350000,
    utilizationRate: 71,
    avgCostPerClient: 425,
    monthlyVariance: -2800,
    wvhaReimbursements: 320000,
    pendingReimbursements: 45000,
  };
  const serviceRecords = [
    {
      id: "SVC-2023-001",
      dateOfService: "2023-07-15",
      dateBilled: "2023-07-18",
      client: "Sarah Johnson",
      service: "Health Screening",
      actualCost: 350,
      budgetedCost: 300,
      difference: -50,
      reimbursementStatus: "Pending",
      program: "Community Health",
    },
  ];
  const monthlyData = [
    {
      month: "Jan",
      budgeted: 100000,
      actual: 95000,
      reimbursed: 85000,
    },
    {
      month: "Feb",
      budgeted: 100000,
      actual: 102000,
      reimbursed: 90000,
    },
  ];
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Financial Management
        </h1>
        <div className="flex items-center space-x-4">
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Budget Utilization
            </p>
            <span
              className={`text-xs px-2 py-1 rounded-full ${financialMetrics.utilizationRate > 75 ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200" : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"}`}
            >
              {financialMetrics.utilizationRate}%
            </span>
          </div>
          <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100">
            {formatCurrency(financialMetrics.budgetUsed)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            of {formatCurrency(financialMetrics.totalBudget)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Average Cost per Client
          </p>
          <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100">
            {formatCurrency(financialMetrics.avgCostPerClient)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Per service average
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            WVHA Reimbursements
          </p>
          <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100">
            {formatCurrency(financialMetrics.wvhaReimbursements)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pending: {formatCurrency(financialMetrics.pendingReimbursements)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Monthly Variance
          </p>
          <p
            className={`text-2xl font-semibold mt-2 ${financialMetrics.monthlyVariance < 0 ? "text-red-600" : "text-green-600"}`}
          >
            {formatCurrency(financialMetrics.monthlyVariance)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            From budgeted amount
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Monthly Budget vs. Actual
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  style={{
                    fontSize: "12px",
                  }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{
                    fontSize: "12px",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
                    color: theme === "dark" ? "#F3F4F6" : "#111827",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="budgeted"
                  name="Budgeted"
                  fill={theme === "dark" ? "#60A5FA" : "#93C5FD"}
                />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill={theme === "dark" ? "#2563EB" : "#3B82F6"}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Budget Utilization Trend
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(value)
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="budgeted"
                  name="Budgeted"
                  stroke="#93c5fd"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            Service Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date of Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Billed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budgeted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {serviceRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(record.dateOfService)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(record.dateBilled)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {record.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.service}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.program}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {formatCurrency(record.budgetedCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {formatCurrency(record.actualCost)}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${record.difference < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {formatCurrency(record.difference)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.reimbursementStatus === "Pending" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"}`}
                    >
                      {record.reimbursementStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Billing;
