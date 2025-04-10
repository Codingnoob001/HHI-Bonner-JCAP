import React, { useState, useEffect } from "react";
import { FilterIcon, DownloadIcon, AlertCircle } from "lucide-react";
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
import { reportsApi } from "../../services/api";

// Defining types for our report data
interface ReportData {
  gender_distribution?: Array<{ gender: string; count: number; percentage: number }>;
  age_distribution?: Array<{ range: string; count: number; percentage: number }>;
  event_attendance?: Array<{ event_type: string; count: number; percentage: number }>;
  zipcode_distribution?: {
    zipcodes: Array<{ zipcode: string; count: number; percentage: number }>;
    regions: Array<{ region: string; count: number; percentage: number }>;
  };
  demographics?: {
    race_distribution: Array<{ race: string; count: number; percentage: number }>;
    language_distribution: Array<{ language: string; count: number; percentage: number }>;
  };
  health_improvements?: {
    metrics: Array<{ 
      metric: string; 
      eligible_patients: number; 
      improved_count: number; 
      percentage_improved: number;
      total_improvement: number;
      average_improvement: number;
    }>;
  };
  bmi_changes?: {
    decrease: {
      count: number;
      percentage: number;
      total_bmi_decrease: number;
      average_decrease_per_client: number;
    };
    increase: {
      count: number;
      percentage: number;
      total_bmi_increase: number;
      average_increase_per_client: number;
    };
    maintained: {
      count: number;
      percentage: number;
    };
  };
  weight_changes?: {
    loss: {
      count: number;
      percentage: number;
      total_pounds_lost: number;
      average_loss_per_client: number;
    };
    gain: {
      count: number;
      percentage: number;
      total_pounds_gained: number;
      average_gain_per_client: number;
    };
    maintained: {
      count: number;
      percentage: number;
    };
  };
  totals?: {
    patients: number;
    visits: number;
    services: number;
    eligible_for_improvements: number;
  };
  services?: {
    hra: { count: number; percentage: number };
    education: { count: number; percentage: number };
    case_management: { count: number; percentage: number };
  };
}

const Reports = () => {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Process data for charts
  const [genderData, setGenderData] = useState<Array<{ name: string; value: number }>>([]);
  const [ageDistributionData, setAgeDistributionData] = useState<Array<{ age: string; count: number }>>([]);
  const [raceData, setRaceData] = useState<Array<{ race: string; count: number }>>([]);
  const [languageData, setLanguageData] = useState<Array<{ name: string; value: number }>>([]);
  const [eventAttendanceData, setEventAttendanceData] = useState<Array<{ event: string; attendance: number }>>([]);
  const [healthMetricsData, setHealthMetricsData] = useState<Array<any>>([]);

  // Fetch report data when date range changes
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get comprehensive summary
        const summaryData = await reportsApi.getComprehensiveSummary(
          dateRange.start,
          dateRange.end
        );
        
        // Update the report data
        setReportData(summaryData);
        
        // Process data for charts
        processChartData(summaryData);
      } catch (err) {
        console.error("Error fetching report data:", err);
        setError(err instanceof Error ? err.message : "Failed to load report data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [dateRange]);

  // Process data for each chart
  const processChartData = (data: ReportData) => {
    // Gender Distribution
    if (data.gender_distribution) {
      setGenderData(
        data.gender_distribution.map(item => ({
          name: item.gender,
          value: item.count
        }))
      );
    }
    
    // Age Distribution
    if (data.age_distribution) {
      setAgeDistributionData(
        data.age_distribution.map(item => ({
          age: item.range,
          count: item.count
        }))
      );
    }
    
    // Race Distribution
    if (data.demographics?.race_distribution) {
      setRaceData(
        data.demographics.race_distribution.map(item => ({
          race: item.race,
          count: item.count
        }))
      );
    }
    
    // Language Distribution
    if (data.demographics?.language_distribution) {
      setLanguageData(
        data.demographics.language_distribution.map(item => ({
          name: item.language,
          value: item.count
        }))
      );
    }
    
    // Event Attendance
    if (data.event_attendance) {
      setEventAttendanceData(
        data.event_attendance.map(item => ({
          event: item.event_type,
          attendance: item.count
        }))
      );
    }
    
    // Health Metrics
    // Note: We'll need to adapt this based on the actual data structure
    // This is a placeholder that would need real metrics trend data
    if (data.health_improvements?.metrics) {
      // For now, we'll create a simple representation 
      // In a real implementation, you might fetch time-series data from another endpoint
      const healthMetrics = [
        {
          month: "Current Period",
          avgSystolic: data.health_improvements.metrics.find(m => m.metric === "BLOOD PRESSURE (Systolic)")?.average_improvement || 0,
          avgDiastolic: data.health_improvements.metrics.find(m => m.metric === "BLOOD PRESSURE (Diastolic)")?.average_improvement || 0,
          avgCholesterol: data.health_improvements.metrics.find(m => m.metric === "CHOLESTEROL")?.average_improvement || 0,
          avgBMI: data.health_improvements.metrics.find(m => m.metric === "BODY MASS INDEX")?.average_improvement || 0,
        }
      ];
      
      setHealthMetricsData(healthMetrics);
    }
  };

  // Handle report export
  const handleExportReport = async (format: 'pdf' | 'excel') => {
    setExportLoading(true);
    
    try {
      const response = await reportsApi.exportReport(dateRange.start, dateRange.end, format);
      
      // Check if the endpoint exists and response is valid
      if (!response) {
        throw new Error("Export endpoint not implemented on server");
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-analytics-${dateRange.start}-to-${dateRange.end}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report:", err);
      setError(err instanceof Error ? err.message : "Failed to export report");
      
      // Show a more user-friendly error message if export is not implemented
      if (err instanceof Error && err.message.includes("not implemented")) {
        setError("Report export is not available yet. This feature will be coming soon.");
      }
    } finally {
      setExportLoading(false);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  const DARK_COLORS = ["#1F2937", "#212529", "#24292e", "#272c34", "#2b2f36"];

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

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
          <button 
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => handleExportReport('pdf')}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <div className="animate-spin h-4 w-4 border-b-2 border-gray-500 rounded-full mr-2"></div>
            ) : (
              <DownloadIcon size={16} className="mr-1" />
            )}
            Export Report
          </button>
        </div>
      </div>
      
      {/* Display totals at the top */}
      {reportData.totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Patients</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{reportData.totals.patients}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Visits</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{reportData.totals.visits}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Services</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{reportData.totals.services}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Eligible for Improvements</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{reportData.totals.eligible_for_improvements}</p>
          </div>
        </div>
      )}
      
      {/* Main charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Distribution */}
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
                        theme === "dark" ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length]
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
        
        {/* Age Distribution */}
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
        
        {/* Race/Ethnicity Distribution */}
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
        
        {/* Primary Language */}
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
                        theme === "dark" ? DARK_COLORS[index % DARK_COLORS.length] : COLORS[index % COLORS.length]
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
        
        {/* Event Attendance */}
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
        
        {/* Health Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Health Improvements
          </h2>
          {reportData.health_improvements?.metrics && reportData.health_improvements.metrics.length > 0 ? (
            <div className="space-y-4">
              {reportData.health_improvements.metrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{metric.metric}</p>
                    <p className="text-xs text-gray-500">
                      {metric.improved_count} of {metric.eligible_patients} patients improved
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{metric.percentage_improved}%</p>
                    <p className="text-xs text-gray-500">
                      Avg improvement: {metric.average_improvement.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400">
              No improvement data available for this period
            </div>
          )}
        </div>
      </div>

      {/* Weight and BMI Changes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Weight & BMI Changes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Weight Changes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Weight Changes</h3>
            {reportData.weight_changes ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Weight Loss</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {reportData.weight_changes.loss.count} patients ({reportData.weight_changes.loss.percentage}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      {reportData.weight_changes.loss.total_pounds_lost.toFixed(1)} lbs
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Avg {reportData.weight_changes.loss.average_loss_per_client.toFixed(1)} lbs per patient
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Weight Gain</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {reportData.weight_changes.gain.count} patients ({reportData.weight_changes.gain.percentage}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {reportData.weight_changes.gain.total_pounds_gained.toFixed(1)} lbs
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Avg {reportData.weight_changes.gain.average_gain_per_client.toFixed(1)} lbs per patient
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintained Weight</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {reportData.weight_changes.maintained.count} patients ({reportData.weight_changes.maintained.percentage}%)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                No weight change data available for this period
              </div>
            )}
          </div>
          
          {/* BMI Changes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">BMI Changes</h3>
            {reportData.bmi_changes ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">BMI Decrease</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {reportData.bmi_changes.decrease.count} patients ({reportData.bmi_changes.decrease.percentage}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      {reportData.bmi_changes.decrease.total_bmi_decrease.toFixed(1)} total
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Avg {reportData.bmi_changes.decrease.average_decrease_per_client.toFixed(1)} decrease per patient
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">BMI Increase</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {reportData.bmi_changes.increase.count} patients ({reportData.bmi_changes.increase.percentage}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {reportData.bmi_changes.increase.total_bmi_increase.toFixed(1)} total
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Avg {reportData.bmi_changes.increase.average_increase_per_client.toFixed(1)} increase per patient
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintained BMI</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {reportData.bmi_changes.maintained.count} patients ({reportData.bmi_changes.maintained.percentage}%)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                No BMI change data available for this period
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Service Breakdown */}
      {reportData.services && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Service Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                HRA Services
              </h3>
              <p className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
                {reportData.services.hra.count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reportData.services.hra.percentage.toFixed(1)}% of all services
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                Education Services
              </h3>
              <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                {reportData.services.education.count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reportData.services.education.percentage.toFixed(1)}% of all services
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                Case Management
              </h3>
              <p className="text-3xl font-semibold text-purple-600 dark:text-purple-400">
                {reportData.services.case_management.count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reportData.services.case_management.percentage.toFixed(1)}% of all services
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Follow-up Compliance */}
      {reportData.follow_up_compliance && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Follow-up Compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                Compliant Patients
              </h3>
              <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                {reportData.follow_up_compliance.compliant.count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reportData.follow_up_compliance.compliant.percentage.toFixed(1)}% of patients
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                Non-Compliant Patients
              </h3>
              <p className="text-3xl font-semibold text-red-600 dark:text-red-400">
                {reportData.follow_up_compliance.non_compliant.count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reportData.follow_up_compliance.non_compliant.percentage.toFixed(1)}% of patients
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;