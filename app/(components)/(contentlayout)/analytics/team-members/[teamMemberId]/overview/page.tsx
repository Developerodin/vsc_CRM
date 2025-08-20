"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useParams, useRouter } from 'next/navigation';
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  skills: Array<{id: string; name: string} | string>;
  branch: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Performance {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  currentMonthCompleted: number;
  activeTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
}

interface CurrentMonth {
  start: string;
  end: string;
  completedTasks: number;
  totalTasks: number;
}

interface TaskBreakdown {
  byStatus: Record<string, Array<{
    priority: string;
    timeline: Array<{
      status: string;
      activity: {
        name: string;
        id: string;
      };
      client: {
        name: string;
        id: string;
        phone?: string;
        email?: string;
        address?: string;
        state?: string;
        country?: string;
      };
      startDate: string;
      endDate: string;
      frequency?: string;
      frequencyConfig?: {
        weeklyDays: string[];
        quarterlyMonths: string[];
        yearlyMonth: string[];
        monthlyDay: number;
        monthlyTime: string;
      };
      branch?: string;
      frequencyStatus?: Array<{
        status: string;
        period: string;
        notes: string;
      }>;
      udin?: string[];
      createdAt: string;
      id: string;
    }>;
    status: string;
    teamMember: string;
    startDate: string;
    endDate: string;
    branch: {
      name: string;
      id: string;
    };
    remarks: string;
    attachments: Array<{
      _id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
    }>;
    createdAt: string;
    id: string;
  }>>;
  byPriority: Record<string, number>;
  recent: Array<{
    priority: string;
    timeline: Array<{
      status: string;
      activity: {
        name: string;
        id: string;
      };
      client: {
        name: string;
        id: string;
        phone?: string;
        email?: string;
        address?: string;
        state?: string;
        country?: string;
      };
      startDate: string;
      endDate: string;
      frequency?: string;
      frequencyConfig?: {
        weeklyDays: string[];
        quarterlyMonths: string[];
        yearlyMonth: string[];
        monthlyDay: number;
        monthlyTime: string;
      };
      branch?: string;
      frequencyStatus?: Array<{
        status: string;
        period: string;
        notes: string;
      }>;
      udin?: string[];
      createdAt: string;
      id: string;
    }>;
    status: string;
    teamMember: string;
    startDate: string;
    endDate: string;
    branch: {
      name: string;
      id: string;
    };
    remarks: string;
    attachments: Array<{
      _id: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: string;
    }>;
    createdAt: string;
    id: string;
  }>;
  monthlyDistribution: Array<{
    month: string;
    total: number;
    completed: number;
    completionRate: string | number;
  }>;
}

interface ClientSummary {
  total: number;
  summary: Array<{
    clientId: string;
    clientName: string;
    tasksCompleted: number;
    totalTasks: number;
  }>;
  timelines: Array<{
    timelineId: string;
    title: string;
    status: string;
    progress: number;
  }>;
  timelineDetails: Array<{
    taskId: string;
    taskStatus: string;
    taskPriority: string;
    taskRemarks: string;
    taskStartDate: string;
    taskEndDate: string;
    timeline: {
      client: any;
      activity: any;
    };
  }>;
}

interface TeamMemberOverviewResponse {
  success: boolean;
  message: string;
  data: {
    teamMember: TeamMember;
    performance: Performance;
    currentMonth: CurrentMonth;
    tasks: TaskBreakdown;
    clients: ClientSummary;
    generatedAt: string;
  };
}

const TeamMemberOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const teamMemberId = params.teamMemberId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<TeamMemberOverviewResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (teamMemberId) {
      fetchTeamMemberOverview();
    }
  }, [teamMemberId]);

  const fetchTeamMemberOverview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${Base_url}analytics/team-members/${teamMemberId}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Team member overview API response:', response.data);
      
      const result: TeamMemberOverviewResponse = response.data;
      console.log('Parsed result:', result);
      console.log('Team member data:', result.data?.teamMember);
      console.log('Skills data:', result.data?.teamMember?.skills);
      
      setOverviewData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team member overview');
      console.error('Error fetching team member overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Team Member Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
            </div>
            <p className="text-gray-500">Loading team member overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !overviewData) {
    return (
      <div className="main-content">
        <Seo title="Team Member Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">Error loading team member overview</p>
            <button 
              onClick={fetchTeamMemberOverview}
              className="ti-btn ti-btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { teamMember, performance, currentMonth, tasks, clients } = overviewData;
  
  // Debug logging
  console.log('Rendering with teamMember:', teamMember);
  console.log('Skills type:', typeof teamMember.skills);
  console.log('Skills value:', teamMember.skills);
  console.log('Tasks data:', tasks);
  console.log('Clients data:', clients);
  
  // Safety check for data
  if (!tasks || !clients) {
    console.error('Missing tasks or clients data');
    return (
      <div className="main-content">
        <Seo title="Team Member Overview" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">Missing required data</p>
            <button 
              onClick={fetchTeamMemberOverview}
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
      <Seo title={`${teamMember.name} - Team Member Overview`} />

      {/* Back to Analytics */}
      <div className="mb-6">
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
          <h1 className="box-title text-3xl font-bold text-gray-900">{teamMember.name}</h1>
          <p className="text-gray-600 mt-1">Team Member Overview & Performance Analytics</p>
        </div>
      </div>

      {/* Team Member Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold">{performance.totalTasks}</p>
            </div>
            <i className="ri-task-line text-3xl text-blue-200"></i>
          </div>
          <div className="mt-4 text-blue-100 text-sm">
            <span className="font-medium">{performance.completedTasks} completed</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{performance.completionRate}%</p>
            </div>
            <i className="ri-check-double-line text-3xl text-green-200"></i>
          </div>
          <div className="mt-4 text-green-100 text-sm">
            <span className="font-medium">{performance.currentMonthCompleted} this month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Tasks</p>
              <p className="text-3xl font-bold">{performance.activeTasks}</p>
            </div>
            <i className="ri-play-circle-line text-3xl text-purple-200"></i>
          </div>
          <div className="mt-4 text-purple-100 text-sm">
            <span className="font-medium">{performance.overdueTasks} overdue</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Avg. Completion</p>
              <p className="text-3xl font-bold">{performance.averageCompletionTime}d</p>
            </div>
            <i className="ri-time-line text-3xl text-orange-200"></i>
          </div>
          <div className="mt-4 text-orange-100 text-sm">
            <span className="font-medium">days per task</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
              { id: 'tasks', label: 'Tasks', icon: 'ri-task-line' },
              { id: 'clients', label: 'Clients', icon: 'ri-user-line' },
              { id: 'performance', label: 'Performance', icon: 'ri-line-chart-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {teamMember.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">{teamMember.name}</h4>
                  <p className="text-gray-600">{teamMember.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-sm text-gray-900">{teamMember.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Branch</p>
                  <p className="text-sm text-gray-900">{teamMember.branch.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">City</p>
                  <p className="text-sm text-gray-900">{teamMember.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Joined</p>
                  <p className="text-sm text-gray-900">{formatDate(teamMember.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(teamMember.skills) && teamMember.skills.length > 0 ? (
                    teamMember.skills.map((skill, index) => {
                      // Handle both object format {id, name} and string format
                      if (typeof skill === 'object' && skill !== null && 'name' in skill) {
                        return (
                          <span
                            key={skill.id || index}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                          >
                            {skill.name}
                          </span>
                        );
                      } else if (typeof skill === 'string') {
                        return (
                          <span
                            key={index}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                          >
                            {skill}
                          </span>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <span className="text-sm text-gray-500">No skills available</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Month Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Month Performance</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {currentMonth.totalTasks > 0 
                        ? Math.round((currentMonth.completedTasks / currentMonth.totalTasks) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600">Tasks</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {currentMonth.completedTasks}/{currentMonth.totalTasks}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{currentMonth.completedTasks}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{currentMonth.totalTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Task Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tasks.byStatus && typeof tasks.byStatus === 'object' ? (
                Object.entries(tasks.byStatus).map(([status, tasksArray]) => (
                  <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 capitalize">{String(status)}</p>
                    <p className="text-2xl font-bold text-gray-900">{Array.isArray(tasksArray) ? tasksArray.length : 0}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center py-8">
                  <p className="text-gray-500">No task status data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Ongoing Tasks with Frequency Details */}
          {tasks.byStatus?.ongoing && Array.isArray(tasks.byStatus.ongoing) && tasks.byStatus.ongoing.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ongoing Tasks - Frequency Details</h3>
              <div className="space-y-4">
                {tasks.byStatus.ongoing.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {task.timeline && task.timeline.length > 0 
                            ? `${task.timeline[0].activity?.name || 'Unknown Activity'}`
                            : 'Unknown Activity'
                          }
                        </h4>
                        <p className="text-sm text-gray-600">
                          {task.timeline && task.timeline.length > 0 
                            ? `${task.timeline[0].client?.name || 'Unknown Client'}`
                            : 'Unknown Client'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(String(task.priority || 'medium'))}`}>
                          {String(task.priority || 'medium')}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {task.timeline && task.timeline.length > 0 
                            ? task.timeline[0].frequency || 'No frequency'
                            : 'No frequency'
                          }
                        </p>
                      </div>
                    </div>
                    {task.timeline && task.timeline.length > 0 && task.timeline[0].frequencyStatus && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Frequency Status:</p>
                        <div className="grid grid-cols-6 gap-2">
                          {task.timeline[0].frequencyStatus.map((freqStatus, index) => (
                            <div key={index} className="text-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                freqStatus.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : freqStatus.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {freqStatus.period.split('-')[1]}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{freqStatus.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(tasks.recent) && tasks.recent.length > 0 ? (
                    tasks.recent.flatMap((task) => {
                      if (task.timeline && Array.isArray(task.timeline)) {
                        return task.timeline.map((timelineItem, index) => (
                          <tr key={`${task.id}-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {timelineItem.client?.name || 'Unknown Client'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {timelineItem.client?.email || 'No email'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {timelineItem.activity?.name || 'Unknown Activity'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(String(timelineItem.status || 'unknown'))}`}>
                                {String(timelineItem.status || 'unknown')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(String(task.priority || 'medium'))}`}>
                                {String(task.priority || 'medium')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">
                                {timelineItem.frequency || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{formatDate(String(timelineItem.startDate || new Date().toISOString()))}</span>
                            </td>
                          </tr>
                        ));
                      }
                      return [];
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No recent tasks available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Client Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-blue-600">{clients.summary?.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-green-600">
                  {clients.summary?.reduce((sum, client) => sum + client.totalTasks, 0) || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                <p className="text-3xl font-bold text-purple-600">
                  {clients.summary?.reduce((sum, client) => sum + client.tasksCompleted, 0) || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Client Summary Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.summary && clients.summary.length > 0 ? (
                    clients.summary.map((client) => (
                      <tr key={client.clientId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{client.clientName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{client.totalTasks}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{client.tasksCompleted}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {client.totalTasks > 0 
                              ? Math.round((client.tasksCompleted / client.totalTasks) * 100)
                              : 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No client summary available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client Task Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Task Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.byStatus && typeof tasks.byStatus === 'object' ? (
                    Object.entries(tasks.byStatus).flatMap(([status, tasksArray]) => {
                      if (Array.isArray(tasksArray)) {
                        return tasksArray.flatMap((task) => {
                          if (task.timeline && Array.isArray(task.timeline)) {
                            return task.timeline.map((timelineItem, index) => (
                              <tr key={`${task.id}-${index}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {timelineItem.client?.name || 'Unknown Client'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {timelineItem.client?.email || 'No email'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {timelineItem.activity?.name || 'Unknown Activity'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(String(timelineItem.status || 'unknown'))}`}>
                                    {String(timelineItem.status || 'unknown')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {timelineItem.frequency || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {formatDate(String(timelineItem.startDate || new Date().toISOString()))}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {formatDate(String(timelineItem.endDate || new Date().toISOString()))}
                                  </span>
                                </td>
                              </tr>
                            ));
                          }
                          return [];
                        });
                      }
                      return [];
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No client task details available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Monthly Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Task Distribution</h3>
            {tasks.monthlyDistribution.length > 0 && ReactApexChart ? (
              <ReactApexChart
                options={{
                  chart: {
                    type: 'bar' as const,
                    height: 300,
                    toolbar: { show: false }
                  },
                  colors: ['#3B82F6', '#10B981'],
                  dataLabels: { enabled: false },
                  xaxis: {
                    categories: tasks.monthlyDistribution.map(item => item.month),
                    labels: { style: { colors: '#6B7280' } }
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
                }}
                series={[
                  {
                    name: 'Completed Tasks',
                    data: tasks.monthlyDistribution.map(item => item.completed)
                  },
                  {
                    name: 'Total Tasks',
                    data: tasks.monthlyDistribution.map(item => item.total)
                  }
                ]}
                type="bar"
                height={300}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-bar-chart-line text-xl text-gray-400"></i>
                  </div>
                  <p className="text-gray-500">No performance data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberOverviewPage;
