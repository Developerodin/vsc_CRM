"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from "next/link";

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

const ClientOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'activity' | 'task'>('personal');
  
  // Task tab filters and pagination state
  const [taskFilters, setTaskFilters] = useState({
    activitySearch: '',
    startDate: '',
    endDate: '',
    priority: '',
    status: '',
    teamMemberId: ''
  });
  const [taskPagination, setTaskPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalTasks: 0
  });
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);

  useEffect(() => {
    if (clientId) {
      fetchClientOverview();
    }
  }, [clientId]);

  // Apply filters when they change
  useEffect(() => {
    if (clientData?.tasks?.recent) {
      // Call API with current filters and pagination
      fetchClientOverview(taskFilters, taskPagination);
    }
  }, [taskFilters, taskPagination.page]);

  const fetchClientOverview = async (filters: any = {}, pagination: any = { page: 1, limit: 10 }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters.activitySearch) {
        queryParams.append('activitySearch', filters.activitySearch);
      }
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate);
      }
      if (filters.priority) {
        queryParams.append('priority', filters.priority);
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      if (filters.teamMemberId) {
        queryParams.append('teamMemberId', filters.teamMemberId);
      }
      
      // Add pagination
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      const url = `${Base_url}analytics/clients/${clientId}/overview?${queryParams.toString()}`;
      console.log('API URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Client overview API response:', response.data);
      setClientData(response.data.data);
      
      // Update filtered tasks and pagination from API response
      if (response.data.data?.tasks?.recent) {
        setFilteredTasks(response.data.data.tasks.recent);
        setTaskPagination({
          page: response.data.data.tasks.pagination?.page || 1,
          limit: response.data.data.tasks.pagination?.limit || 10,
          totalPages: response.data.data.tasks.pagination?.totalPages || 1,
          totalTasks: response.data.data.tasks.pagination?.totalTasks || 0
        });
      }
    } catch (err) {
      console.error('Error fetching client overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch client overview');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName: string, value: string) => {
    setTaskFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    // Reset to first page when filters change
    setTaskPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setTaskPagination(prev => ({
      ...prev,
      page: newPage
    }));
    
    // API call will be triggered by useEffect
  };

  // Clear all filters
  const clearFilters = () => {
    setTaskFilters({
      activitySearch: '',
      startDate: '',
      endDate: '',
      priority: '',
      status: '',
      teamMemberId: ''
    });
    
    setTaskPagination(prev => ({
      ...prev,
      page: 1
    }));
    
    // API call will be triggered by useEffect
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Client Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
            </div>
            <p className="text-gray-500">Loading client overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="main-content">
        <Seo title="Client Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">Error loading client overview</p>
            <button 
              onClick={fetchClientOverview}
              className="ti-btn ti-btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { client, performance, activities, tasks, teamMembers, timelines } = clientData;

  // Chart options for task performance
  const getChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    dataLabels: { enabled: false },
    grid: { 
      borderColor: '#E5E7EB',
      strokeDashArray: 4
    },
    xaxis: {
      categories: tasks.monthlyDistribution?.map((item: any) => item.month) || [],
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
        labels: { 
          style: { colors: '#6B7280' }
        },
        min: 0
      },
      {
        opposite: true,
        title: {
          text: 'Completion Rate (%)',
          style: { color: '#6B7280' }
        },
        labels: { 
          style: { colors: '#6B7280' }
        },
        min: 0,
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
      shared: true,
      intersect: false,
      y: [
        { formatter: function(value: any) { return String(Math.round(Number(value) || 0)) + ' tasks'; } },
        { formatter: function(value: any) { return String(Math.round(Number(value) || 0)) + '%'; } }
      ]
    }
  });

  const getChartSeries = () => [
    {
      name: 'Total Tasks',
      type: 'column',
      data: tasks.monthlyDistribution?.map((item: any) => Number(item.total)) || []
    },
    {
      name: 'Completed Tasks',
      type: 'column',
      data: tasks.monthlyDistribution?.map((item: any) => Number(item.completed)) || []
    },
    {
      name: 'Completion Rate',
      type: 'line',
      data: tasks.monthlyDistribution?.map((item: any) => Number(item.completionRate)) || []
    }
  ];

  return (
    <div className="main-content">
      <Seo title={`${client.name} - Overview`} />
      <div className="mb-2 mt-2">
        <Link 
          href="/analytics"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          <i className="ri-arrow-left-line mr-2"></i>
          Back to Analytics
        </Link>
      </div>

      {/* Page Header */}
      
      <div className="box !bg-transparent border-0 shadow-none mb-6">
        <div className="box-header">
          <h1 className="box-title text-3xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-gray-600 mt-1">Client overview and performance analytics</p>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold">{performance.totalTasks}</p>
            </div>
            <i className="ri-task-line text-3xl text-blue-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed Tasks</p>
              <p className="text-3xl font-bold">{performance.completedTasks}</p>
            </div>
            <i className="ri-check-double-line text-3xl text-green-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{performance.completionRate}%</p>
            </div>
            <i className="ri-percent-line text-3xl text-purple-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Team Members</p>
              <p className="text-3xl font-bold">{performance.totalTeamMembers}</p>
            </div>
            <i className="ri-team-line text-3xl text-orange-200"></i>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      {tasks.monthlyDistribution && tasks.monthlyDistribution.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Task Performance Trend</h2>
          
          {/* Chart Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Current Month</p>
              <p className="text-2xl font-bold text-blue-600">
                {tasks.monthlyDistribution[tasks.monthlyDistribution.length - 1]?.total || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Completed This Month</p>
              <p className="text-2xl font-bold text-green-600">
                {tasks.monthlyDistribution[tasks.monthlyDistribution.length - 1]?.completed || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Monthly Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {tasks.monthlyDistribution[tasks.monthlyDistribution.length - 1]?.completionRate || 0}%
              </p>
            </div>
          </div>

          {ReactApexChart ? (
            <ReactApexChart
              options={getChartOptions()}
              series={getChartSeries()}
              type="bar"
              height={300}
            />
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
                </div>
                <p className="text-gray-500">Loading chart...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('task')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'task'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Task
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{client.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{client.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{client.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{client.address || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <p className="mt-1 text-sm text-gray-900">{client.businessType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                    <p className="mt-1 text-sm text-gray-900">{client.entityType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GST Number</label>
                    <p className="mt-1 text-sm text-gray-900">{client.gstNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    <p className="mt-1 text-sm text-gray-900">{client.branch?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Activities Overview</h3>

              {activities.summary && activities.summary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activities.summary.map((activity: any) => (
                        <tr key={activity.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activity.frequency === 'Monthly' && activity.frequencyConfig?.monthlyDay && activity.frequencyConfig?.monthlyTime ? (
                                `Monthly on day ${activity.frequencyConfig.monthlyDay} at ${activity.frequencyConfig.monthlyTime}`
                              ) : activity.frequency === 'Weekly' && activity.frequencyConfig?.weeklyDays ? (
                                `Weekly on ${activity.frequencyConfig.weeklyDays.join(', ')} at ${activity.frequencyConfig.weeklyTime || 'Default time'}`
                              ) : activity.frequency === 'Quarterly' && activity.frequencyConfig?.quarterlyMonths ? (
                                `Quarterly in ${activity.frequencyConfig.quarterlyMonths.join(', ')} on day ${activity.frequencyConfig.quarterlyDay || 'Default'} at ${activity.frequencyConfig.quarterlyTime || 'Default time'}`
                              ) : activity.frequency === 'Yearly' && activity.frequencyConfig?.yearlyMonth ? (
                                `Yearly in ${activity.frequencyConfig.yearlyMonth.join(', ')} on day ${activity.frequencyConfig.yearlyDate || 'Default'} at ${activity.frequencyConfig.yearlyTime || 'Default time'}`
                              ) : activity.frequency === 'Daily' && activity.frequencyConfig?.dailyTime ? (
                                `Daily at ${activity.frequencyConfig.dailyTime}`
                              ) : activity.frequency === 'Hourly' && activity.frequencyConfig?.hourlyInterval ? (
                                `Every ${activity.frequencyConfig.hourlyInterval} hour(s)`
                              ) : (
                                activity.frequency
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No activities found for this client.</p>
                </div>
              )}
            </div>
          )}

          {/* Task Tab */}
          {activeTab === 'task' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Tasks Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-600">{performance.totalTasks}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{performance.completedTasks}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Ongoing</p>
                  <p className="text-3xl font-bold text-yellow-600">{tasks.byStatus.ongoing?.length || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-red-600">{tasks.byStatus.pending?.length || 0}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Activity Search */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Activity</label>
                    <input
                      type="text"
                      placeholder="Search by activity name..."
                      value={taskFilters.activitySearch}
                      onChange={(e) => handleFilterChange('activitySearch', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={taskFilters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Date */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={taskFilters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={taskFilters.priority}
                      onChange={(e) => handleFilterChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Priority</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={taskFilters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="delayed">Delayed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Team Member Filter */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                    <select
                      value={taskFilters.teamMemberId}
                      onChange={(e) => handleFilterChange('teamMemberId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Team Members</option>
                      {clientData?.teamMembers?.summary?.map((member: any) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div> */}
                </div>

                {/* Filter Actions */}
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {filteredTasks.length} of {taskPagination.totalTasks} tasks
                  </div>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {filteredTasks && filteredTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map((task: any) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {task.activity?.name || 'Professional Tax Payment'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {task.teamMember?.name || 'Unassigned'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full border ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              task.status === 'on_hold' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full border ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-green-100 text-green-800 border-green-200'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{task.remarks || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(task.startDate).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tasks found for this client.</p>
            </div>
          )}

              {/* Pagination */}
              {taskPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {taskPagination.page} of {taskPagination.totalPages}
              </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(taskPagination.page - 1)}
                      disabled={taskPagination.page <= 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(taskPagination.page + 1)}
                      disabled={taskPagination.page >= taskPagination.totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                              </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOverviewPage;
