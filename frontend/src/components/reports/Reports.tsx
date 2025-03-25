import React, { useState } from "react";
import { FilterIcon, DownloadIcon } from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
const Reports = () => {
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState("month");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const genderData = [
    {
      name: "Female",
      value: 580,
    },
    {
      name: "Male",
      value: 420,
    },
    {
      name: "Other",
      value: 20,
    },
  ];
  const ageDistributionData = [
    {
      age: "18-24",
      count: 120,
    },
    {
      age: "25-34",
      count: 250,
    },
    {
      age: "35-44",
      count: 180,
    },
    {
      age: "45-54",
      count: 220,
    },
    {
      age: "55-64",
      count: 150,
    },
    {
      age: "65+",
      count: 100,
    },
  ];
  const raceData = [
    {
      race: "White",
      count: 400,
    },
    {
      race: "Black",
      count: 250,
    },
    {
      race: "Hispanic",
      count: 200,
    },
    {
      race: "Asian",
      count: 100,
    },
    {
      race: "Other",
      count: 70,
    },
  ];
  const languageData = [
    {
      name: "English",
      value: 600,
    },
    {
      name: "Spanish",
      value: 250,
    },
    {
      name: "Creole",
      value: 120,
    },
    {
      name: "Other",
      value: 50,
    },
  ];
  const eventAttendanceData = [
    {
      event: "HRA",
      attendance: 300,
    },
    {
      event: "Los Amigos",
      attendance: 250,
    },
    {
      event: "Health Fair",
      attendance: 400,
    },
    {
      event: "Education",
      attendance: 200,
    },
  ];
  const healthMetricsData = [
    {
      month: "Jan",
      avgSystolic: 128,
      avgDiastolic: 82,
      avgCholesterol: 185,
      avgBMI: 24.5,
    },
    {
      month: "Feb",
      avgSystolic: 126,
      avgDiastolic: 80,
      avgCholesterol: 182,
      avgBMI: 24.3,
    },
    {
      month: "Mar",
      avgSystolic: 127,
      avgDiastolic: 81,
      avgCholesterol: 183,
      avgBMI: 24.4,
    },
  ];
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  const DARK_COLORS = ["#1F2937", "#212529", "#24292e", "#272c34", "#2b2f36"];
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Patient Analytics
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
          <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <DownloadIcon size={16} className="mr-1" /> Export Report
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Gender Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        theme === "dark" ? DARK_COLORS[index] : COLORS[index]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
                    color: theme === "dark" ? "#F3F4F6" : "#111827",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-gray-800 dark:text-gray-200">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Age Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Patients" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Race/Ethnicity Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={raceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="race" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Patients" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Primary Language
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {languageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        theme === "dark" ? DARK_COLORS[index] : COLORS[index]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
                    color: theme === "dark" ? "#F3F4F6" : "#111827",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-gray-800 dark:text-gray-200">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Event Attendance
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" name="Attendees" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Health Metrics Trends
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthMetricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgSystolic"
                  name="Avg. Systolic"
                  stroke="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="avgDiastolic"
                  name="Avg. Diastolic"
                  stroke="#82ca9d"
                />
                <Line
                  type="monotone"
                  dataKey="avgCholesterol"
                  name="Avg. Cholesterol"
                  stroke="#ffc658"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Key Health Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              Avg. Blood Pressure
            </h3>
            <p className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
              127/81
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last 30 days
            </p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              Avg. Cholesterol
            </h3>
            <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
              183
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              mg/dL
            </p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              Avg. BMI
            </h3>
            <p className="text-3xl font-semibold text-purple-600 dark:text-purple-400">
              24.4
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              kg/m²
            </p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              Health Screenings
            </h3>
            <p className="text-3xl font-semibold text-orange-600 dark:text-orange-400">
              85%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Completion rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Reports;
