import React, { useEffect, useState } from 'react';
import StatCard from './StatCard';
import RecentActivity from './RecentActivity';
import { UsersIcon, UserPlusIcon, StethoscopeIcon, CheckCircleIcon } from 'lucide-react';
const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    totalPatients: {
      value: '1,248',
      change: '+12.5%',
      timeframe: 'from previous period',
      trend: 'up',
      sparklineData: [40, 35, 45, 42, 47, 42, 48]
    },
    newPatients: {
      value: '156',
      change: '+28.3%',
      timeframe: 'from previous period',
      trend: 'up',
      sparklineData: [20, 18, 25, 22, 27, 22, 28]
    },
    totalVisits: {
      value: '3,427',
      change: '-2.3%',
      timeframe: 'from previous period',
      trend: 'down',
      sparklineData: [180, 165, 190, 175, 160, 175, 170]
    },
    followUpCompliance: {
      value: '78.5%',
      change: '+5.2%',
      timeframe: 'from previous period',
      trend: 'up',
      sparklineData: [65, 63, 68, 70, 72, 75, 78]
    }
  });
  useEffect(() => {
    const fetchStatsForDateRange = () => {
      console.log('Fetching stats for date range:', dateRange);
      setStats(prevStats => ({
        ...prevStats,
        totalPatients: {
          ...prevStats.totalPatients,
          timeframe: 'in selected period'
        },
        newPatients: {
          ...prevStats.newPatients,
          timeframe: 'in selected period'
        },
        totalVisits: {
          ...prevStats.totalVisits,
          timeframe: 'in selected period'
        },
        followUpCompliance: {
          ...prevStats.followUpCompliance,
          timeframe: 'in selected period'
        }
      }));
    };
    fetchStatsForDateRange();
  }, [dateRange]);
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Dashboard
        </h1>
        <div className="flex items-center space-x-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({
          ...prev,
          start: e.target.value
        }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({
          ...prev,
          end: e.target.value
        }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={stats.totalPatients.value} change={stats.totalPatients.change} timeframe={stats.totalPatients.timeframe} trend={stats.totalPatients.trend} icon={<UsersIcon size={24} />} color="blue" sparklineData={stats.totalPatients.sparklineData} />
        <StatCard title="New Patients This Month" value={stats.newPatients.value} change={stats.newPatients.change} timeframe={stats.newPatients.timeframe} trend={stats.newPatients.trend} icon={<UserPlusIcon size={24} />} color="green" sparklineData={stats.newPatients.sparklineData} />
        <StatCard title="Total Visits" value={stats.totalVisits.value} change={stats.totalVisits.change} timeframe={stats.totalVisits.timeframe} trend={stats.totalVisits.trend} icon={<StethoscopeIcon size={24} />} color="purple" sparklineData={stats.totalVisits.sparklineData} showSparkline={true} />
        <StatCard title="Follow-Up Compliance" value={stats.followUpCompliance.value} change={stats.followUpCompliance.change} timeframe={stats.followUpCompliance.timeframe} trend={stats.followUpCompliance.trend} icon={<CheckCircleIcon size={24} />} color={stats.followUpCompliance.trend === 'up' ? 'green' : 'red'} sparklineData={stats.followUpCompliance.sparklineData} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Recent Activity
        </h2>
        <RecentActivity />
      </div>
    </div>;
};
export default Dashboard;