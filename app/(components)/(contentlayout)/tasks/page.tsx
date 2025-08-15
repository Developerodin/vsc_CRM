"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from "axios";
import { useSearchParams } from "next/navigation";

// Task interface based on the new API documentation
interface Task {
  id: string;
  teamMember: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  branch: {
    id: string;
    name: string;
    location: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  timeline?: Array<{
    id: string;
    activity: string;
    client: string;
    status: string;
  }>;
  remarks?: string;
  status: 'pending' | 'ongoing' | 'completed' | 'on_hold' | 'cancelled' | 'delayed';
  metadata?: Record<string, any>;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Task[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface TaskStatistics {
  total: number;
  pending: number;
  ongoing: number;
  completed: number;
  onHold: number;
  cancelled: number;
  delayed: number;
  low: number;
  medium: number;
  high: number;
  urgent: number;
  critical: number;
}

const TasksPage = () => {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("createdAt:desc");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [filters, setFilters] = useState({
    status: status || "",
    priority: "",
    branch: "",
    teamMember: "",
    startDate: "",
    endDate: "",
    today: "false",
  });
  
  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  
  // Task statistics
  const [taskStats, setTaskStats] = useState<TaskStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch tasks using the new API
  const fetchTasks = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
        ...(sortBy && { sortBy })
      });

      const response = await axios.get(`${Base_url}tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data: ApiResponse = response.data;
      setTasks(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      toast.error('Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch task statistics
  const fetchTaskStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await axios.get(`${Base_url}tasks/statistics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTaskStats(response.data);
    } catch (err) {
      console.error('Error fetching task statistics:', err);
      toast.error('Failed to load task statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: string, remarks?: string) => {
    setIsUpdatingTask(true);
    try {
      const updateData: any = { status: newStatus };
      if (remarks && remarks.trim() !== '') {
        updateData.remarks = remarks.trim();
      }

      await axios.patch(`${Base_url}tasks/${taskId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update the task in local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus as Task['status'], remarks: remarks || task.remarks }
            : task
        )
      );

      toast.success(`Task status updated to ${newStatus}`);
      setShowTaskModal(false);
      setSelectedTask(null);

      // Refresh statistics
      await fetchTaskStats();
    } catch (err) {
      toast.error('Failed to update task status');
      console.error('Error updating task status:', err);
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Get priority styling
  const getPriorityStyling = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status styling
  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-white';
      case 'ongoing':
        return 'bg-primary text-white';
      case 'delayed':
        return 'bg-danger text-white';
      case 'on_hold':
        return 'bg-warning text-white';
      case 'cancelled':
        return 'bg-secondary text-white';
      case 'pending':
        return 'bg-info text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get days remaining
  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-orange-600' };
    if (diffDays <= 3) return { text: `${diffDays} days left`, color: 'text-yellow-600' };
    return { text: `${diffDays} days left`, color: 'text-green-600' };
  };

  useEffect(() => {
    fetchTasks(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  useEffect(() => {
    fetchTaskStats();
  }, []);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Tasks" />

      <div className="grid grid-cols-12 gap-6 mt-7">
        <div className="col-span-12">
          <div className="box">
            <div className="box-body">
              {/* Task Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-blue-600">Total Tasks</span>
                      <p className="text-2xl font-bold text-blue-700">
                        {isLoadingStats ? '...' : taskStats?.total || 0}
                      </p>
                    </div>
                    <div className="bg-blue-200 p-3 rounded-full">
                      <i className="ri-task-line text-blue-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-gradient-to-br from-warning-50 to-warning-100 border border-warning-200 rounded-lg p-4 cursor-pointer hover:bg-warning-100 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'pending' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-warning-600">Pending</span>
                      <p className="text-2xl font-bold text-warning-700">
                        {isLoadingStats ? '...' : taskStats?.pending || 0}
                      </p>
                    </div>
                    <div className="bg-warning-200 p-3 rounded-full">
                      <i className="ri-time-line text-warning-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4 cursor-pointer hover:bg-primary-100 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'ongoing' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-primary-600">Ongoing</span>
                      <p className="text-2xl font-bold text-primary-700">
                        {isLoadingStats ? '...' : taskStats?.ongoing || 0}
                      </p>
                    </div>
                    <div className="bg-primary-200 p-3 rounded-full">
                      <i className="ri-loader-4-line text-primary-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-lg p-4 cursor-pointer hover:bg-success-100 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'completed' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-success-600">Completed</span>
                      <p className="text-2xl font-bold text-success-700">
                        {isLoadingStats ? '...' : taskStats?.completed || 0}
                      </p>
                    </div>
                    <div className="bg-success-200 p-3 rounded-full">
                      <i className="ri-check-line text-success-600 text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex items-center w-full lg:w-auto">
                  <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">Tasks per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={filters.priority}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, priority: e.target.value }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>

                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={filters.status}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, status: e.target.value }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </select>

                  <input
                    type="date"
                    className="form-control py-2 w-full sm:w-auto"
                    value={filters.startDate}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, startDate: e.target.value }));
                      setCurrentPage(1);
                    }}
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    className="form-control py-2 w-full sm:w-auto"
                    value={filters.endDate}
                    onChange={e => {
                      setFilters(prev => ({ ...prev, endDate: e.target.value }));
                      setCurrentPage(1);
                    }}
                    placeholder="End Date"
                  />

                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full"
                      placeholder="Search tasks..."
                      value={searchInputValue}
                      onChange={(e) => setSearchInputValue(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="endDate:asc">Due Date (Earliest)</option>
                    <option value="endDate:desc">Due Date (Latest)</option>
                    <option value="priority:desc">Priority (High to Low)</option>
                    <option value="priority:asc">Priority (Low to High)</option>
                  </select>

                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setSearchInputValue("");
                      setFilters({
                        status: "",
                        priority: "",
                        branch: "",
                        teamMember: "",
                        startDate: "",
                        endDate: "",
                        today: "false",
                      });
                      setSortBy("createdAt:desc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Tasks Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: itemsPerPage }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 h-64">
                        <div className="h-4 bg-gray-200 rounded mb-3"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-4xl mb-4"></i>
                  <p className="text-lg font-medium mb-2">Error Loading Tasks</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-task-line text-4xl text-primary"></i>
                  </div>
                  <h3 className="text-xl font-medium mb-2">No Tasks Found</h3>
                  <p className="text-gray-500">Try adjusting your filters or search criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group relative"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                    >
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                            {task.teamMember.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {task.branch.name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityStyling(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyling(task.status)}`}>
                            {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </div>
                      </div>

                      {/* Task Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="ri-calendar-line mr-2 text-gray-400"></i>
                          <span className="truncate">
                            {formatDate(task.startDate)} - {formatDate(task.endDate)}
                          </span>
                        </div>
                        
                        {task.assignedBy && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="ri-user-line mr-2 text-gray-400"></i>
                            <span className="truncate">Assigned by {task.assignedBy.name}</span>
                          </div>
                        )}

                        {task.timeline && task.timeline.length > 0 && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="ri-time-line mr-2 text-gray-400"></i>
                            <span className="truncate">{task.timeline.length} timeline(s)</span>
                          </div>
                        )}
                      </div>

                      {/* Task Remarks */}
                      {task.remarks && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 p-2 rounded">
                            {task.remarks}
                          </p>
                        </div>
                      )}

                      {/* Task Footer */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className={`font-medium ${getDaysRemaining(task.endDate).color}`}>
                            {getDaysRemaining(task.endDate).text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(task.createdAt)}
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white rounded-lg shadow-lg p-2">
                          <i className="ri-eye-line text-primary text-lg"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onUpdateStatus={updateTaskStatus}
          isUpdating={isUpdatingTask}
        />
      )}
    </div>
  );
};

// Task Details Modal Component
const TaskDetailsModal = ({ 
  task, 
  onClose, 
  onUpdateStatus, 
  isUpdating 
}: { 
  task: Task; 
  onClose: () => void; 
  onUpdateStatus: (taskId: string, status: string, remarks?: string) => Promise<void>;
  isUpdating: boolean;
}) => {
  const [selectedStatus, setSelectedStatus] = useState(task.status);
  const [remarks, setRemarks] = useState(task.remarks || '');

  const handleStatusUpdate = async () => {
    if (selectedStatus !== task.status || remarks !== (task.remarks || '')) {
      await onUpdateStatus(task.id, selectedStatus, remarks);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1 mr-6">
            <h2 className="text-xl font-bold text-gray-800">Task Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              {task.teamMember.name} • {task.branch.name}
            </p>
          </div>
          <button 
            className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
            onClick={onClose}
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Task Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Task Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Team Member:</span>
                    <span className="font-medium">{task.teamMember.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{task.teamMember.email}</span>
                  </div>
                  {task.teamMember.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{task.teamMember.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Branch:</span>
                    <span className="font-medium">{task.branch.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-medium">{task.branch.location}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Timeline Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="font-medium">{new Date(task.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date:</span>
                    <span className="font-medium">{new Date(task.endDate).toLocaleDateString()}</span>
                  </div>
                  {task.assignedBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned By:</span>
                      <span className="font-medium">{task.assignedBy.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {task.timeline && task.timeline.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Related Timelines</h3>
                  <div className="space-y-2">
                    {task.timeline.map((tl, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="font-medium">{tl.activity}</div>
                        <div className="text-gray-500">{tl.client}</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyling(tl.status)}`}>
                          {tl.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Status Update */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Current Status</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusStyling(task.status)}`}>
                    {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityStyling(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Update Status</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Status
                    </label>
                    <select
                      className="form-select w-full"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as Task['status'])}
                      disabled={isUpdating}
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      className="form-control w-full"
                      rows={3}
                      placeholder="Add any additional notes or remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>

              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {task.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <i className="ri-file-line text-gray-400"></i>
                          <span className="text-sm font-medium">{attachment.fileName}</span>
                        </div>
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-dark text-sm"
                        >
                          <i className="ri-external-link-line"></i>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.metadata && Object.keys(task.metadata).length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Additional Information</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {Object.entries(task.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between mb-1">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            className="ti-btn ti-btn-secondary"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            className="ti-btn ti-btn-primary"
            onClick={handleStatusUpdate}
            disabled={isUpdating || (selectedStatus === task.status && remarks === (task.remarks || ''))}
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Update Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function for status styling (moved outside component)
const getStatusStyling = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success text-white';
    case 'ongoing':
      return 'bg-primary text-white';
    case 'delayed':
      return 'bg-danger text-white';
    case 'on_hold':
      return 'bg-warning text-white';
    case 'cancelled':
      return 'bg-secondary text-white';
    case 'pending':
      return 'bg-info text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export default TasksPage;
