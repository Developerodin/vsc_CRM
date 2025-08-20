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
  const [activeTab, setActiveTab] = useState<'personal' | 'activity' | 'task' | 'team'>('personal');

  useEffect(() => {
    if (clientId) {
      fetchClientOverview();
    }
  }, [clientId]);

  const fetchClientOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${Base_url}analytics/clients/${clientId}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Client overview API response:', response.data);
      setClientData(response.data.data);
    } catch (err) {
      console.error('Error fetching client overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch client overview');
    } finally {
      setLoading(false);
    }
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
            <button
              onClick={() => setActiveTab('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Team Member
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-3xl font-bold text-blue-600">{activities.summary.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Timelines</p>
                  <p className="text-3xl font-bold text-green-600">{timelines.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-3xl font-bold text-purple-600">{Object.keys(activities.byCategory).length}</p>
                </div>
              </div>

              {activities.summary && activities.summary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frequency Config
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
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {activity.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              {activity.frequency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activity.frequency === 'Monthly' && activity.frequencyConfig?.monthlyDay && activity.frequencyConfig?.monthlyTime ? (
                                `Day ${activity.frequencyConfig.monthlyDay} at ${activity.frequencyConfig.monthlyTime}`
                              ) : activity.frequency === 'Weekly' && activity.frequencyConfig?.weeklyDays ? (
                                `Days: ${activity.frequencyConfig.weeklyDays.join(', ')}`
                              ) : activity.frequency === 'Quarterly' && activity.frequencyConfig?.quarterlyMonths ? (
                                `Months: ${activity.frequencyConfig.quarterlyMonths.join(', ')}`
                              ) : activity.frequency === 'Yearly' && activity.frequencyConfig?.yearlyMonth ? (
                                `Month: ${activity.frequencyConfig.yearlyMonth.join(', ')}`
                              ) : 'Default'
                              }
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

              {/* Timeline Details */}
              {timelines.summary && timelines.summary.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline Details</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Activity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Frequency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Progress
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Due
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timelines.summary.map((timeline: any) => (
                          <tr key={timeline.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{timeline.activity?.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full border ${
                                timeline.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                timeline.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {timeline.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                {timeline.frequency}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${(timeline.completedPeriods / timeline.totalPeriods) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {timeline.completedPeriods}/{timeline.totalPeriods}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(timeline.startDate).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

              {tasks.recent && tasks.recent.length > 0 ? (
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
                      {tasks.recent.map((task: any) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              Professional Tax Payment
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
            </div>
          )}

          {/* Team Member Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Team Members Overview</h3>
              
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-gray-600">Total Team Members</p>
                <p className="text-3xl font-bold text-blue-600">{teamMembers.total}</p>
              </div>

              {teamMembers.summary && teamMembers.summary.length > 0 ? (
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
                          Skills
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamMembers.summary.map((member: any) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{member.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {member.skills.slice(0, 3).map((skill: any) => (
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
                            <div className="text-sm text-gray-900">
                              {member.taskStats.completedTasks} / {member.taskStats.totalTasks}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full border bg-green-100 text-green-800 border-green-200">
                              {member.taskStats.completionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No team members found for this client.</p>
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
