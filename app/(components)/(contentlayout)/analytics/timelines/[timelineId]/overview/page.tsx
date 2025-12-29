"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from "next/link";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

const TimelineOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.timelineId as string;
  
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview');
  
  const [taskFilters, setTaskFilters] = useState({
    teamMemberId: '',
    startDate: '',
    endDate: '',
    priority: '',
    status: ''
  });
  const [taskPagination, setTaskPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalTasks: 0
  });
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);

  useEffect(() => {
    if (timelineId) {
      fetchTimelineOverview();
    }
  }, [timelineId]);

  useEffect(() => {
    if (timelineData?.tasks?.recent) {
      applyFilters(taskFilters, taskPagination);
    }
  }, [taskFilters, taskPagination.page]);

  const fetchTimelineOverview = async (filters: any = {}, pagination: any = { page: 1, limit: 10 }) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      
      if (filters.teamMemberId) {
        queryParams.append('teamMemberId', filters.teamMemberId);
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
      
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      const url = `${Base_url}analytics/timelines/${timelineId}/overview?${queryParams.toString()}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setTimelineData(response.data.data);
      
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
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline overview');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async (filters: any, pagination: any) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.teamMemberId) {
        queryParams.append('teamMemberId', filters.teamMemberId);
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
      
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      const url = `${Base_url}analytics/timelines/${timelineId}/overview?${queryParams.toString()}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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
      // Silent error handling for filter updates
    }
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setTaskFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    setTaskPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-warning", text: "text-black" },
      completed: { bg: "bg-success", text: "text-black" },
      delayed: { bg: "bg-danger", text: "text-black" },
      ongoing: { bg: "bg-primary", text: "text-black" },
      on_hold: { bg: "bg-orange-100", text: "text-orange-800" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-800" }
    };
    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800" };
    return `${config.bg} ${config.text}`;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { bg: string; text: string }> = {
      low: { bg: "bg-blue-100", text: "text-blue-800" },
      medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
      high: { bg: "bg-orange-100", text: "text-orange-800" },
      urgent: { bg: "bg-red-100", text: "text-red-800" }
    };
    const config = priorityConfig[priority] || { bg: "bg-gray-100", text: "text-gray-800" };
    return `${config.bg} ${config.text}`;
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Timeline Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
            </div>
            <p className="text-gray-500">Loading timeline overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="main-content">
        <Seo title="Timeline Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">{error || 'Timeline not found'}</p>
            <button 
              onClick={() => router.push('/analytics/timelines')}
              className="ti-btn ti-btn-primary"
            >
              Back to Timelines
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { timeline, performance, currentMonth, tasks } = timelineData;

  const monthlyChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 300,
      toolbar: { show: false }
    },
    colors: ['#3B82F6', '#10B981'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: tasks?.monthlyDistribution?.map((m: any) => m.month) || [],
      labels: { 
        style: { colors: '#6B7280' },
        rotate: -45
      }
    },
    yaxis: {
      title: { text: 'Number of Tasks', style: { color: '#6B7280' } },
      labels: { style: { colors: '#6B7280' } }
    },
    legend: {
      position: 'top' as const,
      labels: { colors: '#374151' }
    },
    tooltip: {
      theme: 'light' as const
    }
  };

  const monthlyChartSeries = [
    {
      name: 'Total Tasks',
      data: tasks?.monthlyDistribution?.map((m: any) => m.total) || []
    },
    {
      name: 'Completed Tasks',
      data: tasks?.monthlyDistribution?.map((m: any) => m.completed) || []
    }
  ];

  return (
    <div className="main-content">
      <Seo title="Timeline Overview" />
      
      <div className="box !bg-transparent border-0 shadow-none mb-6">
        <div className="box-header flex justify-between items-center">
          <div>
            <h1 className="box-title text-2xl font-semibold">Timeline Overview</h1>
            <p className="text-gray-600 mt-1">Detailed analytics for timeline</p>
          </div>
          <div className="box-tools flex items-center space-x-2">
            <Link href="/analytics/timelines" className="ti-btn ti-btn-secondary">
              <i className="ri-arrow-left-line me-2"></i>
              Back to Timelines
            </Link>
          </div>
        </div>
      </div>

      {/* Timeline Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold">{performance?.totalTasks || 0}</p>
            </div>
            <i className="ri-task-line text-3xl text-blue-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{performance?.completionRate?.toFixed(1) || 0}%</p>
            </div>
            <i className="ri-check-double-line text-3xl text-green-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Completed Tasks</p>
              <p className="text-3xl font-bold">{performance?.completedTasks || 0}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-purple-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Ongoing Tasks</p>
              <p className="text-3xl font-bold">{performance?.ongoingTasks || 0}</p>
            </div>
            <i className="ri-play-circle-line text-3xl text-orange-200"></i>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="box mb-6">
        <div className="box-body">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks ({performance?.totalTasks || 0})
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Timeline Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(timeline.status)}`}>
                        {timeline.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Period:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.period}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Financial Year:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.financialYear}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Frequency:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.frequency}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Type:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.timelineType}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Start Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(timeline.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">End Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(timeline.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Due Date:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(timeline.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.client.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.client.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.client.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Business Type:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.client.businessType}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Entity Type:</span>
                      <span className="ml-2 text-sm text-gray-900">{timeline.client.entityType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity & Subactivity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
                  <div className="text-sm text-gray-900">{timeline.activity.name}</div>
                </div>

                {timeline.subactivity && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Subactivity</h3>
                    <div className="text-sm text-gray-900">{timeline.subactivity.name}</div>
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-blue-600">{performance?.totalTasks || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{performance?.completedTasks || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{performance?.completionRate?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ongoing</p>
                    <p className="text-2xl font-bold text-orange-600">{performance?.ongoingTasks || 0}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Distribution Chart */}
              {tasks?.monthlyDistribution && tasks.monthlyDistribution.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Task Distribution</h3>
                  {ReactApexChart && (
                    <ReactApexChart
                      options={monthlyChartOptions}
                      series={monthlyChartSeries}
                      type="bar"
                      height={300}
                    />
                  )}
                </div>
              )}

              {/* Tasks by Priority */}
              {tasks?.byPriority && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(tasks.byPriority).map(([priority, count]: [string, any]) => (
                      <div key={priority} className="text-center">
                        <p className="text-sm text-gray-600 capitalize">{priority}</p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Task Filters */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="form-select w-full"
                      value={taskFilters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="delayed">Delayed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="form-select w-full"
                      value={taskFilters.priority}
                      onChange={(e) => handleFilterChange('priority', e.target.value)}
                    >
                      <option value="">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="form-control w-full"
                      value={taskFilters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="form-control w-full"
                      value={taskFilters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap table-bordered min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Team Member</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">End Date</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task: any, index: number) => (
                        <tr
                          key={task.id}
                          className={`border-b border-gray-200 ${
                            index % 2 === 0 ? "bg-gray-50" : ""
                          }`}
                        >
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                              {task.status}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td>
                            <div className="text-sm text-gray-900">{task.teamMember?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{task.teamMember?.email || ''}</div>
                          </td>
                          <td>
                            <span className="text-sm text-gray-900">
                              {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-gray-900">
                              {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-gray-900">{task.remarks || 'N/A'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8">
                          <div className="text-gray-500">No tasks found</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {taskPagination.totalPages > 1 && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {((taskPagination.page - 1) * taskPagination.limit) + 1} to{' '}
                    {Math.min(taskPagination.page * taskPagination.limit, taskPagination.totalTasks)} of{' '}
                    {taskPagination.totalTasks} entries
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="ti-btn ti-btn-secondary"
                      onClick={() => setTaskPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={taskPagination.page === 1}
                    >
                      Previous
                    </button>
                    <button
                      className="ti-btn ti-btn-secondary"
                      onClick={() => setTaskPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={taskPagination.page === taskPagination.totalPages}
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

export default TimelineOverviewPage;

