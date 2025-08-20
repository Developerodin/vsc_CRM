"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

interface DashboardCardData {
  value: number | string;
  growth: string;
  period: string;
}

interface DashboardCardsResponse {
  success: boolean;
  message: string;
  data: {
    totalTeamMembers: DashboardCardData;
    completionRate: DashboardCardData;
    tasksCompleted: DashboardCardData;
    workloadBalance: DashboardCardData;
  };
}

interface CompletionTrend {
  month: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface CompletionTrendsResponse {
  success: boolean;
  message: string;
  data: {
    trends: CompletionTrend[];
    summary: {
      totalCompleted: number;
      totalTasks: number;
      averageCompletionRate: string;
    };
  };
}

interface TopMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: string;
}

interface TopByCompletionResponse {
  success: boolean;
  message: string;
  data: {
    topMembers: TopMember[];
    summary: {
      totalCompleted: number;
      averageCompletion: string;
    };
  };
}

interface BranchTopMembers {
  branchId: string;
  branchName: string;
  topMembers: TopMember[];
  summary: {
    totalCompleted: number;
    averageCompletion: string;
  };
}

interface TopByBranchResponse {
  success: boolean;
  message: string;
  data: {
    branches?: BranchTopMembers[];
    branchId?: string;
    branchName?: string;
    topMembers?: TopMember[];
    summary?: {
      totalCompleted: number;
      averageCompletion: string;
      totalBranches?: number;
    };
  };
}

interface TopByCompletionResponse {
  success: boolean;
  message: string;
  data: {
    topMembers: TopMember[];
    summary: {
      totalCompleted: number;
      averageCompletion: string;
    };
  };
}

interface GlobalTeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: {
    id: string;
    name: string;
  };
  skills: Activity[];
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  name: string;
}

interface GlobalTeamMembersResponse {
  success: boolean;
  message: string;
  data: {
    teamMembers: GlobalTeamMember[];
    total: number;
    page: number;
    limit: number;
  };
}



const AnalyticsPage = () => {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardCardsResponse['data'] | null>(null);
  const [completionTrends, setCompletionTrends] = useState<CompletionTrendsResponse['data'] | null>(null);
  const [topByCompletion, setTopByCompletion] = useState<TopByCompletionResponse['data'] | null>(null);
  const [topByBranch, setTopByBranch] = useState<TopByBranchResponse['data'] | null>(null);
  const [globalTeamMembers, setGlobalTeamMembers] = useState<GlobalTeamMembersResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [topCompletionLoading, setTopCompletionLoading] = useState(true);
  const [topBranchLoading, setTopBranchLoading] = useState(true);
  const [globalTeamLoading, setGlobalTeamLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
    fetchCompletionTrends(selectedMonths);
    fetchTopByCompletion();
    fetchTopByBranch();
    fetchGlobalTeamMembers();
  }, []);

  useEffect(() => {
    fetchCompletionTrends(selectedMonths);
  }, [selectedMonths]);

  useEffect(() => {
    fetchTopByCompletion();
  }, [selectedBranch, dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${Base_url}analytics/team-members/dashboard-cards`,{
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
        const result: DashboardCardsResponse = response.data;
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionTrends = async (months: number) => {
    try {
      setTrendsLoading(true);
      const response = await axios.get(`${Base_url}analytics/team-members/completion-trends?months=${months}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: CompletionTrendsResponse = response.data;
      setCompletionTrends(result.data);
    } catch (err) {
      console.error('Error fetching completion trends:', err);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchTopByCompletion = async () => {
    try {
      setTopCompletionLoading(true);
      let url = `${Base_url}analytics/team-members/top-by-completion?limit=10`;
      
      if (selectedBranch !== "all") {
        url += `&branch=${selectedBranch}`;
      }
      
      if (dateRange.startDate && dateRange.endDate) {
        url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: TopByCompletionResponse = response.data;
      setTopByCompletion(result.data);
    } catch (err) {
      console.error('Error fetching top by completion:', err);
    } finally {
      setTopCompletionLoading(false);
    }
  };

  const fetchTopByBranch = async () => {
    try {
      setTopBranchLoading(true);
      let url = `${Base_url}analytics/team-members/top-by-branch?limit=5`;
      
      if (selectedBranch !== "all") {
        url += `&branchId=${selectedBranch}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: TopByBranchResponse = response.data;
      setTopByBranch(result.data);
    } catch (err) {
      console.error('Error fetching top by branch:', err);
    } finally {
      setTopBranchLoading(false);
    }
  };

  const fetchGlobalTeamMembers = async () => {
    try {
      setGlobalTeamLoading(true);
      const response = await axios.get(`${Base_url}team-members?page=1&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Global team members API response:', response.data);
      
      // The API returns data in response.data.results, not response.data.data
      const apiData = response.data;
      const transformedData = {
        teamMembers: apiData.results || [],
        total: apiData.totalResults || 0,
        page: apiData.page || 1,
        limit: apiData.limit || 5
      };
      
      console.log('Transformed data:', transformedData);
      setGlobalTeamMembers(transformedData);
    } catch (err) {
      console.error('Error fetching global team members:', err);
    } finally {
      setGlobalTeamLoading(false);
    }
  };

  const getScoreColor = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
    if (numValue >= 90) return 'text-green-600';
    if (numValue >= 80) return 'text-blue-600';
    if (numValue >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionRateColor = (rate: string) => {
    const numRate = parseFloat(rate.replace('%', ''));
    if (numRate >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (numRate >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (numRate >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Chart options for completion trends
  const getChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 400,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#3B82F6', '#10B981'],
    dataLabels: { enabled: false },
    grid: { 
      borderColor: '#E5E7EB',
      strokeDashArray: 4
    },
    xaxis: {
      categories: completionTrends?.trends.map(t => t.month) || [],
      labels: { 
        style: { colors: '#6B7280' },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: [
      {
        title: {
          text: 'Number of Tasks',
          style: { color: '#6B7280' }
        },
        labels: { style: { colors: '#6B7280' } }
      },
      {
        opposite: true,
        title: {
          text: 'Completion Rate (%)',
          style: { color: '#6B7280' }
        },
        labels: { style: { colors: '#6B7280' } },
        max: 100
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        endingShape: 'rounded' as const
      }
    },
    legend: {
      position: 'top' as const,
      labels: { colors: '#374151' }
    },
    tooltip: {
      theme: 'light' as const,
      y: [
        {
          formatter: function(value: any) {
            return value + ' tasks';
          }
        },
        {
          formatter: function(value: any) {
            return value + '%';
          }
        }
      ]
    }
  });

  const getChartSeries = () => [
    {
      name: 'Completed Tasks',
      type: 'column',
      data: completionTrends?.trends.map(t => t.completed) || []
    },
    {
      name: 'Total Tasks',
      type: 'column',
      data: completionTrends?.trends.map(t => t.total) || []
    },
    {
      name: 'Completion Rate',
      type: 'line',
      data: completionTrends?.trends.map(t => t.completionRate) || []
    }
  ];

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Analytics" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
            </div>
            <p className="text-gray-500">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Seo title="Analytics" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">Error loading dashboard data</p>
            <button 
              onClick={fetchDashboardData}
              className="ti-btn ti-btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Analytics" />

      {/* Page Header */}
      <div className="box !bg-transparent border-0 shadow-none mb-6">
        <div className="box-header">
          <h1 className="box-title text-3xl font-bold text-gray-900">Team Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Key performance metrics and team insights</p>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Team Members</p>
              <p className="text-3xl font-bold">{dashboardData?.totalTeamMembers.value}</p>
            </div>
            <i className="ri-team-line text-3xl text-blue-200"></i>
          </div>
          <div className="mt-4 text-blue-100 text-sm">
            <span className="font-medium">{dashboardData?.totalTeamMembers.growth}</span> {dashboardData?.totalTeamMembers.period}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{dashboardData?.completionRate.value}</p>
            </div>
            <i className="ri-check-double-line text-3xl text-green-200"></i>
          </div>
          <div className="mt-4 text-green-100 text-sm">
            <span className="font-medium">{dashboardData?.completionRate.growth}</span> {dashboardData?.completionRate.period}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Tasks Completed</p>
              <p className="text-3xl font-bold">{dashboardData?.tasksCompleted.value}</p>
            </div>
            <i className="ri-task-line text-3xl text-purple-200"></i>
          </div>
          <div className="mt-4 text-purple-100 text-sm">
            <span className="font-medium">{dashboardData?.tasksCompleted.growth}</span> {dashboardData?.tasksCompleted.period}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Workload Balance</p>
              <p className="text-3xl font-bold">{dashboardData?.workloadBalance.value}</p>
            </div>
            <i className="ri-balance-line text-3xl text-orange-200"></i>
          </div>
          <div className="mt-4 text-orange-100 text-sm">
            <span className="font-medium">{dashboardData?.workloadBalance.growth}</span> {dashboardData?.workloadBalance.period}
          </div>
        </div>
      </div>

      {/* Task Completion Trends Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Task Completion Trends</h2>
          <div className="flex items-center space-x-3">
            <label htmlFor="months-filter" className="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <select
              id="months-filter"
              className="form-select border-gray-300 rounded-lg text-sm"
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(Number(e.target.value))}
            >
              <option value={1}>Last Month</option>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
              <option value={24}>Last 24 Months</option>
            </select>
          </div>
        </div>

        {trendsLoading ? (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
              </div>
              <p className="text-gray-500">Loading trends data...</p>
            </div>
          </div>
        ) : completionTrends && ReactApexChart ? (
          <div>
            <ReactApexChart
              options={getChartOptions()}
              series={getChartSeries()}
              type="bar"
              height={400}
            />
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Completed</p>
                <p className="text-2xl font-bold text-blue-600">{completionTrends.summary.totalCompleted}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-purple-600">{completionTrends.summary.totalTasks}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Average Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{completionTrends.summary.averageCompletionRate}%</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-bar-chart-line text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No trends data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Section */}
      {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Performance Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              id="branch-filter"
              className="form-select border-gray-300 rounded-lg w-full"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="branch1">Main Branch</option>
              <option value="branch2">North Branch</option>
              <option value="branch3">South Branch</option>
            </select>
          </div>
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              className="form-control border-gray-300 rounded-lg w-full"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              className="form-control border-gray-300 rounded-lg w-full"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </div> */}

      {/* Top Team Members by Completion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Top Team Members by Branch</h2>
          {topByCompletion?.summary && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Completed: <span className="font-semibold text-blue-600">{topByCompletion.summary.totalCompleted}</span></p>
              <p className="text-sm text-gray-600">Average: <span className="font-semibold text-green-600">{topByCompletion.summary.averageCompletion}%</span></p>
            </div>
          )}
        </div>

        {topCompletionLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-xl text-gray-400 animate-spin"></i>
              </div>
              <p className="text-gray-500">Loading top performers...</p>
            </div>
          </div>
        ) : topByCompletion?.topMembers ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topByCompletion.topMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{member.branch}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.completedTasks} / {member.totalTasks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCompletionRateColor(member.completionRate)}`}>
                        {member.completionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-line text-xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No top performers data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Team Members by Branch */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Top Team Members by Completion</h2>
          {topByBranch?.summary && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Branches: <span className="font-semibold text-blue-600">{topByBranch.summary.totalBranches}</span></p>
              <p className="text-sm text-gray-600">Total Completed: <span className="font-semibold text-green-600">{topByBranch.summary.totalCompleted}</span></p>
            </div>
          )}
        </div>

        {topBranchLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-xl text-gray-400 animate-spin"></i>
              </div>
              <p className="text-gray-500">Loading branch data...</p>
            </div>
          </div>
        ) : topByBranch?.branches ? (
          <div className="space-y-6">
            {topByBranch.branches.map((branch) => (
              <div key={branch.branchId} className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{branch.branchName}</h3>
                    <div className="text-sm text-gray-600">
                      Total: <span className="font-semibold text-blue-600">{branch.summary.totalCompleted}</span> | 
                      Average: <span className="font-semibold text-green-600">{branch.summary.averageCompletion}%</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {branch.topMembers.map((member) => (
                        <tr key={member._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{member.email}</div>
                            <div className="text-sm text-gray-500">{member.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{member.completedTasks} / {member.totalTasks}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full border ${getCompletionRateColor(member.completionRate)}`}>
                              {member.completionRate}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : topByBranch?.topMembers ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topByBranch.topMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.completedTasks} / {member.totalTasks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCompletionRateColor(member.completionRate)}`}>
                        {member.completionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-building-line text-xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No branch data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Global Team Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Team Members Overview</h2>
          {globalTeamMembers && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Members: <span className="font-semibold text-blue-600">{globalTeamMembers.total}</span></p>
              <p className="text-sm text-gray-600">Showing: <span className="font-semibold text-green-600">{globalTeamMembers.teamMembers.length}</span> of {globalTeamMembers.total}</p>
            </div>
          )}
        </div>

        {globalTeamLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-xl text-gray-400 animate-spin"></i>
              </div>
              <p className="text-gray-500">Loading team members...</p>
            </div>
          </div>
        ) : globalTeamMembers?.teamMembers ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {globalTeamMembers.teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => router.push(`/analytics/team-members/${member.id}/overview`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {member.name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{member.branch.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={skill.id}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {skill.name}
                          </span>
                        ))}
                        {member.skills.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{member.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full border bg-green-100 text-green-800 border-green-200">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-line text-xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No team members data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
