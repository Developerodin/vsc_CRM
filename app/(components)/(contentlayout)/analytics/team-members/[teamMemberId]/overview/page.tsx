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
  pagination: {
    page: number;
    limit: number;
    totalTasks: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  byClientActivity: Array<any>;
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
  const [selectedClientForTasks, setSelectedClientForTasks] = useState<{
    clientId: string;
    clientName: string;
    tasks: Array<{
      id: string;
      status: string;
      priority: string;
      remarks: string;
      startDate: string;
      endDate: string;
      activity: string;
      timelineId: string;
    }>;
  } | null>(null);
  const [showClientTasksModal, setShowClientTasksModal] = useState(false);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsPerPage] = useState(10);

  useEffect(() => {
    if (teamMemberId) {
      fetchTeamMemberOverview();
    }
  }, [teamMemberId]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Reset pagination when switching to clients tab
    if (tabId === 'clients') {
      setClientsPage(1);
    }
  };

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

  // Ensure tasks has required properties
  const safeTasks = {
    byStatus: tasks.byStatus || {},
    byPriority: tasks.byPriority || {},
    recent: Array.isArray(tasks.recent) ? tasks.recent : [],
    monthlyDistribution: Array.isArray(tasks.monthlyDistribution) ? tasks.monthlyDistribution : [],
    pagination: tasks.pagination || { page: 1, limit: 10, totalTasks: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    byClientActivity: tasks.byClientActivity || []
  };

  // Ensure clients has required properties
  const safeClients = {
    summary: Array.isArray(clients.summary) ? clients.summary : [],
    timelines: Array.isArray(clients.timelines) ? clients.timelines : [],
    timelineDetails: Array.isArray(clients.timelineDetails) ? clients.timelineDetails : []
  };

  return (
    <div className="main-content">
      <Seo title={`${teamMember.name} - Team Member Overview`} />

      {/* Back to Analytics */}
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
              { id: 'clients', label: 'Clients', icon: 'ri-user-line' },
              { id: 'performance', label: 'Performance', icon: 'ri-line-chart-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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
        <div className="space-y-8">
          {/* Personal Information and Current Month Performance */}
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

          {/* Task Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                // Count tasks by status from the new API structure
                const statusCounts: Record<string, number> = {};
                
                if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                  safeTasks.recent.forEach(task => {
                    const status = task.status || 'unknown';
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                  });
                }
                
                if (Object.keys(statusCounts).length > 0) {
                  return Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 capitalize">{status}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                  ));
                } else {
                  return (
                    <div className="col-span-4 text-center py-8">
                      <p className="text-gray-500">No task status data available</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* Client Summary Matrix */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-blue-600">
                  {(() => {
                    const uniqueClients = new Set();
                    if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                      safeTasks.recent.forEach(task => {
                        if (task.timeline && Array.isArray(task.timeline)) {
                          task.timeline.forEach(timelineItem => {
                            if (timelineItem.client?.id) {
                              uniqueClients.add(timelineItem.client.id);
                            }
                          });
                        }
                      });
                    }
                    return uniqueClients.size;
                  })()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-green-600">
                  {(() => {
                    let totalTasks = 0;
                    if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                      totalTasks = safeTasks.recent.length;
                    }
                    return totalTasks;
                  })()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(() => {
                    let completedTasks = 0;
                    if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                      completedTasks = safeTasks.recent.filter(task => task.status === 'completed').length;
                    }
                    return completedTasks;
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Client Summary for Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Summary for Tasks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tasks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const clientSummary = new Map();
                    
                    // Process tasks from the new API structure
                    if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                      safeTasks.recent.forEach(task => {
                        if (task.timeline && Array.isArray(task.timeline)) {
                          task.timeline.forEach(timelineItem => {
                            if (timelineItem.client?.id && timelineItem.client?.name) {
                              const clientId = timelineItem.client.id;
                              const activityName = timelineItem.activity?.name || 'Unknown Activity';
                              
                              if (!clientSummary.has(clientId)) {
                                clientSummary.set(clientId, {
                                  id: clientId,
                                  name: timelineItem.client.name,
                                  activities: new Map(),
                                  totalTasks: 0
                                });
                              }
                              
                              const client = clientSummary.get(clientId);
                              if (!client.activities.has(activityName)) {
                                client.activities.set(activityName, {
                                  name: activityName,
                                  tasks: []
                                });
                              }
                              
                              const activity = client.activities.get(activityName);
                              activity.tasks.push({
                                id: task.id || Math.random().toString(),
                                status: task.status || 'unknown',
                                priority: task.priority || 'medium',
                                remarks: task.remarks || '',
                                startDate: task.startDate || '',
                                endDate: task.endDate || '',
                                activity: activityName,
                                timelineId: timelineItem.id || ''
                              });
                              
                              client.totalTasks++;
                            }
                          });
                        }
                      });
                    }
                    
                    const allClients = Array.from(clientSummary.values());
                    const totalClients = allClients.length;
                    const startIndex = (clientsPage - 1) * clientsPerPage;
                    const endIndex = startIndex + clientsPerPage;
                    const paginatedClients = allClients.slice(startIndex, endIndex);
                    const totalPages = Math.ceil(totalClients / clientsPerPage);
                    
                    if (paginatedClients.length > 0) {
                      return paginatedClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {Array.from(client.activities.values()).map((activity: any) => activity.name).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                const allTasks = Array.from(client.activities.values()).flatMap((activity: any) => activity.tasks);
                                setSelectedClientForTasks({
                                  clientId: client.id,
                                  clientName: client.name,
                                  tasks: allTasks
                                });
                                setShowClientTasksModal(true);
                              }}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                            >
                              {client.totalTasks} Tasks
                            </button>
                          </td>
                        </tr>
                      ));
                    } else {
                      return (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            No client data available from tasks
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {(() => {
              const clientSummary = new Map();
              
              // Process tasks from the new API structure
              if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                safeTasks.recent.forEach(task => {
                  if (task.timeline && Array.isArray(task.timeline)) {
                    task.timeline.forEach(timelineItem => {
                      if (timelineItem.client?.id && timelineItem.client?.name) {
                        const clientId = timelineItem.client.id;
                        if (!clientSummary.has(clientId)) {
                          clientSummary.set(clientId, {
                            id: clientId,
                            name: timelineItem.client.name,
                            activities: new Map(),
                            totalTasks: 0
                          });
                        }
                        const client = clientSummary.get(clientId);
                        client.totalTasks++;
                      }
                    });
                  }
                });
              }
              
              const totalClients = clientSummary.size;
              const totalPages = Math.ceil(totalClients / clientsPerPage);
              
              if (totalPages > 1) {
                return (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {((clientsPage - 1) * clientsPerPage) + 1} to {Math.min(clientsPage * clientsPerPage, totalClients)} of {totalClients} clients
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setClientsPage(Math.max(1, clientsPage - 1))}
                        disabled={clientsPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          clientsPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setClientsPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            page === clientsPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setClientsPage(Math.min(totalPages, clientsPage + 1))}
                        disabled={clientsPage === totalPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          clientsPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Monthly Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Task Distribution</h3>
            {(() => {
              // Comprehensive data validation and sanitization
              if (!safeTasks.monthlyDistribution || !Array.isArray(safeTasks.monthlyDistribution) || safeTasks.monthlyDistribution.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-bar-chart-line text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-500">No performance data available</p>
                    </div>
                  </div>
                );
              }

              // Sanitize and validate data
              const sanitizedData = safeTasks.monthlyDistribution
                .filter(item => 
                  item && 
                  typeof item === 'object' && 
                  item.month && 
                  typeof item.month === 'string' &&
                  item.month.trim() !== '' &&
                  (typeof item.completed === 'number' || typeof item.completed === 'string') &&
                  (typeof item.total === 'number' || typeof item.total === 'string')
                )
                .map(item => ({
                  month: String(item.month).trim(),
                  completed: Math.max(0, Number(item.completed) || 0),
                  total: Math.max(0, Number(item.total) || 0)
                }))
                .filter(item => item.month && item.completed >= 0 && item.total >= 0);

              if (sanitizedData.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-error-warning-line text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-500">Invalid chart data format</p>
                    </div>
                  </div>
                );
              }

              // Ensure we have valid chart data
              const categories = sanitizedData.map(item => item.month);
              const completedData = sanitizedData.map(item => item.completed);
              const totalData = sanitizedData.map(item => item.total);

              // Additional validation for chart data
              if (categories.length === 0 || completedData.some(val => val === undefined || val === null) || totalData.some(val => val === undefined || val === null)) {
                return (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-error-warning-line text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-500">Chart data validation failed</p>
                    </div>
                  </div>
                );
              }

              return ReactApexChart ? (
              <ReactApexChart
                options={{
                  chart: {
                    type: 'bar' as const,
                    height: 300,
                      toolbar: { show: false },
                      animations: {
                        enabled: false // Disable animations to prevent errors
                      }
                  },
                  colors: ['#3B82F6', '#10B981'],
                  dataLabels: { enabled: false },
                  xaxis: {
                      categories: categories,
                      labels: { 
                        style: { colors: '#6B7280' },
                        trim: true,
                        maxHeight: 60
                      }
                  },
                  yaxis: {
                    title: { text: 'Number of Tasks', style: { color: '#6B7280' } },
                      labels: { 
                        style: { colors: '#6B7280' },
                        formatter: function(val) {
                          return String(Math.round(Number(val) || 0));
                        }
                      }
                  },
                  legend: {
                    position: 'top' as const,
                    labels: { colors: '#374151' }
                  },
                  tooltip: {
                      theme: 'light' as const,
                      y: {
                        formatter: function(val) {
                          return String(Math.round(Number(val) || 0));
                        }
                      }
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        dataLabels: {
                          position: 'top'
                        }
                      }
                    },
                    responsive: [{
                      breakpoint: 480,
                      options: {
                        chart: {
                          height: 200
                        },
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }]
                }}
                series={[
                  {
                    name: 'Completed Tasks',
                      data: completedData
                  },
                  {
                    name: 'Total Tasks',
                      data: totalData
                  }
                ]}
                type="bar"
                height={300}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-loader-4-line text-xl text-gray-400 animate-spin"></i>
                  </div>
                    <p className="text-gray-500">Loading chart...</p>
                </div>
                </div>
              );
            })()}
          </div>

          {/* Task Priority Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Priority Distribution</h3>
            {safeTasks.byPriority && typeof safeTasks.byPriority === 'object' && Object.keys(safeTasks.byPriority).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(safeTasks.byPriority).map(([priority, count]) => (
                  <div key={priority} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 capitalize">{priority}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No priority distribution data available</p>
              </div>
            )}
          </div>

          {/* Task Status Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Summary</h3>
            {(() => {
              // Count tasks by status from the new API structure
              const statusCounts: Record<string, number> = {};
              
              if (safeTasks.recent && Array.isArray(safeTasks.recent)) {
                safeTasks.recent.forEach(task => {
                  const status = task.status || 'unknown';
                  statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
              }
              
              if (Object.keys(statusCounts).length > 0) {
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 capitalize">{status}</p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No status distribution data available</p>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Client Tasks Modal */}
      {showClientTasksModal && selectedClientForTasks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Task Details for {selectedClientForTasks.clientName}
              </h3>
              <button
                onClick={() => setShowClientTasksModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedClientForTasks.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{task.activity}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{formatDate(task.startDate)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{formatDate(task.endDate)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{task.remarks || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedClientForTasks.tasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tasks found for this client</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowClientTasksModal(false)}
                className="ti-btn ti-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberOverviewPage;
