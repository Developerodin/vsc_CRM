"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";


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

type TimelineUpdatePayload = {
  timelineId: string;
  status?: string;
  referenceNumber?: string;
  completedAt?: string; // ISO string
};



const TasksPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("createdAt:desc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [filters, setFilters] = useState({
    status: status || "",
    priority: priority || "",
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
  
  // Quick edit modal state
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [quickEditTask, setQuickEditTask] = useState<Task | null>(null);
  const [quickEditStatus, setQuickEditStatus] = useState("");
  const [quickEditRemarks, setQuickEditRemarks] = useState("");
  const [isUpdatingQuickEdit, setIsUpdatingQuickEdit] = useState(false);
  
  // Task statistics
  const [taskStats, setTaskStats] = useState<TaskStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  


  // Debounced search function for the main search input
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setFilters(prev => ({
            ...prev,
            teamMember: searchValue
          }));
          setCurrentPage(1);
        }, 500);
      };
    })(),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    debouncedSearch(value);
  };

  // Quick edit functions
  const openQuickEditModal = (task: Task) => {
    setQuickEditTask(task);
    setQuickEditStatus(task.status);
    setQuickEditRemarks(task.remarks || "");
    setShowQuickEditModal(true);
  };

  // Task details modal functions
  const openTaskDetailsModal = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const closeQuickEditModal = () => {
    setShowQuickEditModal(false);
    setQuickEditTask(null);
    setQuickEditStatus("");
    setQuickEditRemarks("");
  };

  const handleQuickEditSubmit = async () => {
    if (!quickEditTask) return;

    // Get task ID with fallback (same pattern as TaskManagement)
    const taskId = quickEditTask.id || (quickEditTask as any)._id;
    if (!taskId) {
      toast.error('Task ID is missing. Cannot update task.');
      return;
    }

    // For delayed tasks, only allow status change to completed
    if (quickEditTask.status === 'delayed' && quickEditStatus !== 'completed') {
      toast.error('Delayed tasks can only be marked as completed', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      return;
    }

    setIsUpdatingQuickEdit(true);
    try {
      const updateData: any = {
        status: quickEditStatus,
      };

      // Only include remarks if the task is not delayed
      if (quickEditTask.status !== 'delayed') {
        updateData.remarks = quickEditRemarks;
      }

      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Update the task in the local state
      setTasks(prevTasks => 
        prevTasks.map(task => {
          const currentTaskId = task.id || (task as any)._id;
          return currentTaskId === taskId
            ? { ...task, status: quickEditStatus as Task['status'], remarks: quickEditTask.status === 'delayed' ? task.remarks : quickEditRemarks }
            : task;
        })
      );

      closeQuickEditModal();
      toast.success(quickEditTask.status === 'delayed' ? 'Task marked as completed!' : 'Task updated successfully!');
      
      // Refresh task statistics
      await fetchTaskStats();
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setIsUpdatingQuickEdit(false);
    }
  };

  // Helper function to validate date range
  const validateDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  // Fetch tasks using the new API
  const fetchTasks = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      // Create a copy of filters for processing
      let processedFilters: any = { ...filters };
      
      // Handle date range filtering - convert to backend-compatible format
      if (processedFilters.startDate && processedFilters.endDate) {
        // Validate date range
        if (!validateDateRange(processedFilters.startDate, processedFilters.endDate)) {
          toast.error('Start date must be before or equal to end date');
          setIsLoading(false);
          return;
        }
        
        // Convert to startDateRange and endDateRange for backend processing
        processedFilters.startDateRange = processedFilters.startDate;
        processedFilters.endDateRange = processedFilters.endDate;
        delete processedFilters.startDate;
        delete processedFilters.endDate;
      }

      // Filter out empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(processedFilters).filter(([key, value]) => value !== "" && value !== "false")
      );

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
        ...(sortBy && { sortBy })
      });

      const response = await axios.get(`${Base_url}tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data: ApiResponse = response.data;
      // Transform _id to id for consistency (same as TaskManagement)
      const transformedTasks = data.results.map((task: any) => ({
        ...task,
        id: task._id || task.id
      }));
      setTasks(transformedTasks);
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
    } catch (err: any) {
      // Handle 400 error gracefully - backend incorrectly validates taskId for this endpoint
      if (err?.response?.status === 400 && err?.response?.data?.message?.includes('taskId')) {
        // Backend validation issue - silently fail and don't update stats
        setTaskStats(null);
      } else {
        // Other errors - could show a toast or handle differently
        setTaskStats(null);
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (
    taskId: string,
    newStatus: string,
    remarks?: string,
    timelineUpdates?: TimelineUpdatePayload[]
  ) => {
    setIsUpdatingTask(true);
    try {
      const updateData: any = { status: newStatus };
      if (remarks && remarks.trim() !== '') {
        updateData.remarks = remarks.trim();
      }
      if (timelineUpdates && Array.isArray(timelineUpdates) && timelineUpdates.length > 0) {
        updateData.timelineUpdates = timelineUpdates;
      }

      await axios.patch(`${Base_url}tasks/${taskId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update the task in local state
      setTasks(prevTasks => 
        prevTasks.map(task => {
          const currentTaskId = task.id || (task as any)._id;
          return currentTaskId === taskId
            ? { ...task, status: newStatus as Task['status'], remarks: remarks || task.remarks }
            : task;
        })
      );

      toast.success(`Task status updated to ${newStatus}`);
      setShowTaskModal(false);
      setSelectedTask(null);

      // Refresh statistics
      await fetchTaskStats();
    } catch (err) {
      toast.error('Failed to update task status');
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTasks(tasks.map(task => task.id || (task as any)._id).filter(Boolean) as string[]);
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string) => {
    console.log('Task ID:', taskId);
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };



  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected tasks?')) return;

    try {
      await Promise.all(
        selectedTasks.map(taskId =>
          fetch(`${Base_url}tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        )
      );

      toast.success('Selected tasks deleted successfully');
      setSelectedTasks([]);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete some tasks');
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

  // Pagination utility
  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 2);
        i <= Math.min(totalPages - 1, currentPage + 2);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'urgent': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'high': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'medium': return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  useEffect(() => {
    fetchTasks(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  useEffect(() => {
    fetchTaskStats();
  }, []);

  // Update filters when URL parameters change
  useEffect(() => {
    const newStatus = searchParams.get('status') || "";
    const newPriority = searchParams.get('priority') || "";
    
    if (newStatus !== filters.status || newPriority !== filters.priority) {
      setFilters(prev => ({
        ...prev,
        status: newStatus,
        priority: newPriority
      }));
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [searchParams, filters.status, filters.priority]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Tasks" />

      {/* Page Header - spec: accent bar, 14px bold title */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
          <h1 className="text-sm font-bold text-gray-800">Task Management</h1>
        </div>
        {selectedTasks.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
            onClick={handleDeleteSelected}
          >
            <i className="ri-delete-bin-line text-xs"></i>
            Delete Selected ({selectedTasks.length})
          </button>
        )}
      </div>

      {/* Status Summary Cards - spec colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div
          className="bg-sky-50 border border-sky-100 rounded-lg p-4 cursor-pointer hover:bg-sky-100/50 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'pending' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Pending</span>
              <p className="text-xl font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === 'pending').length}</p>
            </div>
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
              <i className="ri-time-line text-sky-600 text-lg"></i>
            </div>
          </div>
        </div>
        <div
          className="bg-[rgba(132,90,223,0.08)] border border-purple-100 rounded-lg p-4 cursor-pointer hover:bg-purple-50/50 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'ongoing' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Ongoing</span>
              <p className="text-xl font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === 'ongoing').length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="ri-loader-4-line text-purple-600 text-lg"></i>
            </div>
          </div>
        </div>
        <div
          className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 cursor-pointer hover:bg-emerald-100/50 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'completed' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
              <p className="text-xl font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === 'completed').length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <i className="ri-check-line text-emerald-600 text-lg"></i>
            </div>
          </div>
        </div>
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 cursor-pointer hover:bg-amber-100/50 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'on_hold' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">On Hold</span>
              <p className="text-xl font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === 'on_hold').length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-pause-line text-amber-700 text-lg"></i>
            </div>
          </div>
        </div>
        <div
          className="bg-red-50 border border-red-100 rounded-lg p-4 cursor-pointer hover:bg-red-100/50 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'delayed' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Delayed</span>
              <p className="text-xl font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === 'delayed').length}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <i className="ri-error-warning-line text-red-600 text-lg"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Summary - spec info/sky */}
      {(filters.status || filters.priority || (filters.startDate && filters.endDate)) && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-[11px] font-bold text-sky-700">Active Filters:</span>
              {filters.status && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                  Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                </span>
              )}
              {filters.priority && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                  Priority: {filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)}
                </span>
              )}
              {filters.startDate && filters.endDate && (
                <>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                    From: {new Date(filters.startDate).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                    To: {new Date(filters.endDate).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, status: "", priority: "", startDate: "", endDate: "" }));
                setCurrentPage(1);
                router.push('/tasks');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded text-sky-600 hover:text-sky-800 hover:bg-sky-100 transition-colors"
            >
              <i className="ri-close-line text-xs"></i>
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Simple Filters Row - spec: 11px, gray-200 border, purple focus */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center flex-shrink-0 gap-2">
            <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 min-w-[80px] cursor-pointer appearance-none"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          <div className="relative flex-grow min-w-[150px] sm:min-w-[200px]">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
            <input
              type="text"
              className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full min-w-[120px] placeholder:text-gray-400 font-medium transition-all"
              placeholder="Search tasks..."
              value={searchInputValue}
              onChange={handleSearchChange}
            />
          </div>

          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 w-full sm:w-auto min-w-[120px] cursor-pointer appearance-none"
            value={filters.status}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }));
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
            <option value="delayed">Delayed</option>
          </select>

          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 w-full sm:w-auto min-w-[120px] cursor-pointer appearance-none"
            value={filters.priority}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, priority: e.target.value }));
              setCurrentPage(1);
            }}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>

          <div className="relative w-full sm:w-auto min-w-[140px]">
            <input
              type="date"
              className={`bg-white border rounded pl-3 pr-3 py-1.5 text-[11px] font-medium w-full focus:ring-0 focus:border-purple-300 transition-all ${!filters.startDate ? 'text-transparent' : ''} ${filters.startDate ? 'border-purple-300' : 'border-gray-200'}`}
              value={filters.startDate}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, startDate: e.target.value }));
                setCurrentPage(1);
              }}
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                input.focus();
                if (typeof input.showPicker === 'function') input.showPicker();
              }}
              title="Start Date From"
              style={!filters.startDate ? { color: 'transparent' } : {}}
            />
            {!filters.startDate && (
              <div className="absolute inset-0 flex items-center px-3 text-gray-400 bg-white cursor-pointer pointer-events-none rounded border border-gray-200">
                <span className="text-[11px]">Start Date</span>
              </div>
            )}
            {filters.startDate && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full" />}
          </div>

          <div className="relative w-full sm:w-auto min-w-[140px]">
            <input
              type="date"
              className={`bg-white border rounded pl-3 pr-3 py-1.5 text-[11px] font-medium w-full focus:ring-0 focus:border-purple-300 transition-all ${!filters.endDate ? 'text-transparent' : ''} ${filters.endDate ? 'border-purple-300' : 'border-gray-200'}`}
              value={filters.endDate}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, endDate: e.target.value }));
                setCurrentPage(1);
              }}
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                input.focus();
                if (typeof input.showPicker === 'function') input.showPicker();
              }}
              title="End Date Until"
              style={!filters.endDate ? { color: 'transparent' } : {}}
            />
            {!filters.endDate && (
              <div className="absolute inset-0 flex items-center px-3 text-gray-400 bg-white cursor-pointer pointer-events-none rounded border border-gray-200">
                <span className="text-[11px]">End Date</span>
              </div>
            )}
            {filters.endDate && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full" />}
          </div>

          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 w-full sm:w-auto min-w-[140px] cursor-pointer appearance-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="endDate:asc">End Date (Earliest-Latest)</option>
            <option value="endDate:desc">End Date (Latest-Earliest)</option>
            <option value="priority:desc">Priority (High-Low)</option>
            <option value="priority:asc">Priority (Low-High)</option>
          </select>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap"
            onClick={() => {
              setSearchInputValue("");
              setFilters({ status: "", priority: "", branch: "", teamMember: "", startDate: "", endDate: "", today: "false" });
              setSortBy("createdAt:desc");
              setCurrentPage(1);
            }}
          >
            <i className="ri-refresh-line text-xs"></i>
            Reset
          </button>
        </div>
      </div>

      {/* Delayed Tasks Warning - spec amber */}
      {tasks.some(task => task.status === 'delayed') && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <i className="ri-information-line text-amber-600 text-xl mr-3" />
            <div>
              <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Delayed Tasks Notice</h4>
              <p className="text-[11px] text-amber-700 mt-1">
                Tasks marked as &quot;Delayed&quot; can only be updated to &quot;Completed&quot; status. Click on the status or remarks to mark as completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table - spec: card, border-gray-200 (same as checkbox), thead bg-gray-50/30 */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-[rgba(249,250,251,0.3)]">
                <th className="w-10 pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  <input
                    type="checkbox"
                    className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Team Member</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Dates</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Priority</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remarks</th>
                <th className="px-1.5 py-3 pr-[10px] text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 border border-gray-200 bg-white">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50 mb-2" />
                      <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Loading Data</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center text-red-600 py-8 border border-gray-200 bg-white text-[12px] font-medium">
                    {error}
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 border border-gray-200 bg-white">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i className="ri-task-line text-xl text-gray-200" />
                      </div>
                      <h3 className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        Data Empty
                      </h3>
                      <p className="text-[11px] text-gray-500">No tasks found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
              tasks.map((task) => (
                <tr key={task.id || (task as any)._id} className="hover:bg-[rgba(249,250,251,0.5)] transition-colors group border-b border-gray-200">
                  <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200 align-top">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id || (task as any)._id)}
                      onChange={() => {
                        const taskId = task.id || (task as any)._id;
                        if (taskId) handleSelectTask(taskId);
                      }}
                      className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 align-top text-[12px] text-[#323251]">
                    <div>
                      <div className="font-medium text-[#323251]">{task.teamMember?.name || "-"}</div>
                      <div className="text-[11px] text-[#495057]">{task.teamMember?.email || "-"}</div>
                      <div className="text-[11px] text-gray-600 mt-1">
                        <i className="ri-building-line me-1" />
                        {task.branch?.name || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 align-top">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-600 min-w-[90px]">Start Date:</span>
                        <span className="text-xs text-gray-900 ml-2">
                          {task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "-"}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-600 min-w-[90px]">End Date:</span>
                        <span className="text-xs text-gray-900 ml-2">
                          {task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "-"}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-600 min-w-[90px]">Created Date:</span>
                        <div className="text-xs text-gray-900 ml-2">
                          {task.createdAt ? (
                            <>
                              <div>{new Date(task.createdAt).toISOString().split('T')[0]}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </>
                          ) : "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 align-top">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 align-top">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer hover:opacity-90 transition-opacity ${getStatusStyling(task.status)}`}
                        onClick={() => openQuickEditModal(task)}
                        title={task.status === 'delayed' ? 'Click to mark as completed' : 'Click to edit status and remarks'}
                      >
                        {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                      {task.status === 'delayed' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                          <i className="ri-check-line mr-1" />
                          Can Complete
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={`px-1.5 py-2.5 border border-gray-200 max-w-xs truncate align-top text-[12px] cursor-pointer transition-colors ${task.status === 'delayed' ? 'hover:bg-amber-50' : 'hover:bg-gray-50'}`}
                    title={task.status === 'delayed' ? `${task.remarks || "No remarks"} - Click to mark as completed` : `${task.remarks || "No remarks"} - Click to edit`}
                    onClick={() => openQuickEditModal(task)}
                  >
                    {task.remarks || "-"}
                  </td>
                  <td className="px-1.5 py-2.5 pr-[10px] border border-gray-200 align-top">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="w-7 h-7 rounded flex items-center justify-center bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 transition-colors"
                        onClick={() => openTaskDetailsModal(task)}
                        title="View Task Details"
                      >
                        <i className="ri-eye-line text-xs" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-500 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                        onClick={() => {
                          const taskId = task.id || (task as any)._id;
                          if (!taskId) {
                            toast.error('Task ID is missing. Cannot navigate to edit page.');
                            return;
                          }
                          router.push(`/tasks/edit/${taskId}`);
                        }}
                        title="Edit Task"
                      >
                        <i className="ri-pencil-line text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination - spec: 11px bold, purple active, gray-200 border */}
      {!isLoading && !error && (
        <div className="p-[10px] pt-4 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-4">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
          </div>
          <nav aria-label="Page navigation" className="flex flex-wrap items-center gap-1">
            <button
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {getPagination(currentPage, totalPages).map((page, idx) =>
              page === "..." ? (
                <span key={"ellipsis-" + idx} className="px-2 text-[10px] text-gray-300">...</span>
              ) : (
                <button
                  key={page}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-colors ${
                    currentPage === page
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                  onClick={() => setCurrentPage(Number(page))}
                >
                  {page}
                </button>
              )
            )}
            <button
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </nav>
        </div>
      )}

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

      {/* Quick Edit Modal - spec: overlay 50%, 10px padding, same button styles */}
      {showQuickEditModal && quickEditTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Quick Edit Task</h3>
              <button type="button" onClick={closeQuickEditModal} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="p-[10px] overflow-auto space-y-4">
              {/* Task Info */}
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Task:</strong> {quickEditTask.teamMember?.name || "No team member"}</p>
                <p><strong>Priority:</strong> {quickEditTask.priority}</p>
              </div>

              {/* Status Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                {quickEditTask?.status === 'delayed' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <i className="ri-information-line text-yellow-500 text-lg mr-2"></i>
                        <span className="text-sm text-yellow-800">
                          Delayed tasks can only be marked as completed
                        </span>
                      </div>
                    </div>
                    <select
                      className="form-select w-full"
                      value={quickEditStatus}
                      onChange={(e) => setQuickEditStatus(e.target.value)}
                      required
                    >
                      <option value="delayed">Delayed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                ) : (
                  <select
                    className="form-select w-full"
                    value={quickEditStatus}
                    onChange={(e) => setQuickEditStatus(e.target.value)}
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </select>
                )}
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                {quickEditTask?.status === 'delayed' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <i className="ri-information-line text-gray-500 text-lg mr-2"></i>
                        <span className="text-sm text-gray-600">
                          Remarks cannot be modified for delayed tasks
                        </span>
                      </div>
                    </div>
                    <textarea
                      className="form-control w-full bg-gray-100"
                      rows={4}
                      placeholder="Remarks are locked for delayed tasks"
                      value={quickEditRemarks}
                      disabled
                      readOnly
                    />
                  </div>
                ) : (
                  <textarea
                    className="form-control w-full"
                    rows={4}
                    placeholder="Enter task remarks..."
                    value={quickEditRemarks}
                    onChange={(e) => setQuickEditRemarks(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                type="button"
                onClick={closeQuickEditModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
                disabled={isUpdatingQuickEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickEditSubmit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                disabled={isUpdatingQuickEdit || !quickEditStatus || (quickEditTask?.status === 'delayed' && quickEditStatus === 'delayed')}
              >
                {isUpdatingQuickEdit ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line text-xs" />
                    {quickEditTask?.status === 'delayed' ? 'Mark as Completed' : 'Update Task'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
  onUpdateStatus: (taskId: string, status: string, remarks?: string, timelineUpdates?: TimelineUpdatePayload[]) => Promise<void>;
  isUpdating: boolean;
}) => {
  const [selectedStatus, setSelectedStatus] = useState(task.status);
  const [remarks, setRemarks] = useState(task.remarks || '');
  const [timelineDetails, setTimelineDetails] = useState<any[]>([]);
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false);
  const [timelineUpdatesMap, setTimelineUpdatesMap] = useState<Record<string, TimelineUpdatePayload>>({});

  // Fetch timeline details when modal opens
  useEffect(() => {
    if (task.timeline && task.timeline.length > 0) {
      fetchTimelineDetails();
    }
  }, [task]);

  // Clear timeline edits when opening a new task
  useEffect(() => {
    setTimelineUpdatesMap({});
  }, [task?.id, (task as any)?._id]);

  const getTimelineId = (timeline: any): string | null => {
    const id = timeline?.id ?? timeline?._id ?? timeline?.timelineId ?? null;
    return id && String(id).trim() ? String(id) : null;
  };

  const fetchTimelineDetails = async () => {
    if (!task.timeline || task.timeline.length === 0) return;

    // Resolve timeline ID: API may return { id }, { _id }, or raw string
    const getTimelineRefId = (item: { id?: string; _id?: string } | string): string | null => {
      if (typeof item === 'string' && item) return item;
      const obj = item as { id?: string; _id?: string };
      const id = obj?.id ?? obj?._id ?? null;
      return id && String(id).trim() ? id : null;
    };

    const idsToFetch = task.timeline
      .map(getTimelineRefId)
      .filter((id): id is string => Boolean(id));

    if (idsToFetch.length === 0) {
      setTimelineDetails([]);
      return;
    }

    setIsLoadingTimelines(true);
    try {
      const timelinePromises = idsToFetch.map(async (timelineId) => {
        try {
          const response = await fetch(`${Base_url}timelines/${timelineId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            return await response.json();
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(timelinePromises);
      const validTimelines = results.filter((t): t is NonNullable<typeof t> => t !== null);
      setTimelineDetails(validTimelines);
    } catch {
      setTimelineDetails([]);
    } finally {
      setIsLoadingTimelines(false);
    }
  };

  const setTimelineField = (timeline: any, field: 'status' | 'referenceNumber' | 'completedAt', value: string) => {
    const timelineId = getTimelineId(timeline);
    if (!timelineId) return;

    // Update local visible data immediately (Excel-like feel)
    setTimelineDetails(prev =>
      prev.map(t => {
        const tid = getTimelineId(t);
        if (tid !== timelineId) return t;
        if (field === 'completedAt') {
          // Keep a YYYY-MM-DD view in UI (if user clears it, allow empty)
          return { ...t, completedAt: value ? new Date(value).toISOString() : null };
        }
        return { ...t, [field]: value };
      })
    );

    // Track only changed fields for payload (only the 3 allowed)
    setTimelineUpdatesMap(prev => {
      const existing = prev[timelineId] || { timelineId };
      const next: TimelineUpdatePayload = { ...existing, timelineId };
      if (field === 'completedAt') {
        next.completedAt = value ? new Date(value).toISOString() : undefined;
      } else if (field === 'status') {
        next.status = value || undefined;
      } else if (field === 'referenceNumber') {
        next.referenceNumber = value?.trim() ? value.trim() : undefined;
      }

      // Drop empty update objects (only timelineId left)
      const hasAny =
        Boolean(next.status) || Boolean(next.referenceNumber) || Boolean(next.completedAt);
      if (!hasAny) {
        const { [timelineId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [timelineId]: next };
    });
  };

  const handleStatusUpdate = async () => {
    // Get task ID with fallback (same pattern as TaskManagement)
    const taskId = task.id || (task as any)._id;
    if (!taskId) {
      toast.error('Task ID is missing. Cannot update task.');
      return;
    }

    // For delayed tasks, only allow status change to completed
    if (task.status === 'delayed' && selectedStatus !== 'completed') {
      toast.error('Delayed tasks can only be marked as completed', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      return;
    }
    
    const timelineUpdates = Object.values(timelineUpdatesMap);
    const taskFieldsChanged =
      selectedStatus !== task.status ||
      (task.status !== 'delayed' && remarks !== (task.remarks || ''));

    if (!taskFieldsChanged && timelineUpdates.length === 0) {
      toast('No changes to update', { icon: 'ℹ️' });
      return;
    }

    await onUpdateStatus(
      taskId,
      selectedStatus,
      task.status === 'delayed' ? undefined : remarks,
      timelineUpdates.length > 0 ? timelineUpdates : undefined
    );
  };

  const handleDownloadAttachment = (attachment: { fileName: string; fileUrl: string }) => {
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCompletedAtInputValue = (timeline: any) => {
    const raw = timeline?.completedAt;
    if (!raw) return '';
    try {
      return new Date(raw).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <div className="flex-1 mr-4">
            <h2 className="text-sm font-bold text-gray-800">Task Details</h2>
            <p className="text-[11px] text-[#495057] mt-0.5">
              {task.teamMember.name} • {task.branch.name}
            </p>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0" onClick={onClose}>
            <i className="ri-close-line text-xl" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-[10px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Task Info */}
            <div className="space-y-4">
              <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Task Information</h3>
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
                </div>
              </div>

              <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline Information</h3>
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

            </div>

            {/* Right Column - Status Update */}
            <div className="space-y-4">
              <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusStyling(task.status)}`}>
                    {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                 </div>
               </div>

               <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
                 <div className="flex items-center gap-2 mb-4">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityStyling(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Update Status</h3>
                 
                 {task.status === 'delayed' ? (
                   <div className="space-y-3">
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                       <div className="flex items-center">
                         <i className="ri-information-line text-yellow-500 text-xl mr-3"></i>
                         <div>
                           <h5 className="text-sm font-medium text-yellow-800">Delayed Task</h5>
                           <p className="text-sm text-yellow-700 mt-1">
                             This delayed task can only be marked as completed.
                           </p>
                         </div>
                       </div>
                     </div>
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
                         <option value="delayed">Delayed</option>
                         <option value="completed">Completed</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Remarks
                       </label>
                       <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                         <div className="flex items-center">
                           <i className="ri-information-line text-gray-500 text-lg mr-2"></i>
                           <span className="text-sm text-gray-600">
                             Remarks cannot be modified for delayed tasks
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>
                 ) : (
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

                  {/* Attachments left of Remarks */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Attachments
                        </label>
                      </div>
                      {task.attachments && task.attachments.length > 0 ? (
                        <div className="space-y-2">
                          {task.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <i className="ri-file-line text-gray-400"></i>
                                <span className="text-sm font-medium truncate" title={attachment.fileName}>
                                  {attachment.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleDownloadAttachment(attachment)}
                                  className="text-primary hover:text-primary-dark text-sm p-1 hover:bg-primary/10 rounded"
                                  title="Download Attachment"
                                  type="button"
                                >
                                  <i className="ri-download-line"></i>
                                </button>
                                <a
                                  href={attachment.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-dark text-sm p-1 hover:bg-primary/10 rounded"
                                  title="View Attachment"
                                >
                                  <i className="ri-external-link-line"></i>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center border border-gray-200">
                          <i className="ri-file-line text-gray-400 me-2"></i>
                          No attachments available
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remarks
                      </label>
                      <textarea
                        className="form-control w-full"
                        rows={5}
                        placeholder="Add any additional notes or remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>
                 )}
              </div>
            </div>
          </div>

          {/* Timelines Editor (Excel-like) - below Attachments/Remarks row */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Related Timelines</h3>
              {task.timeline && task.timeline.length > 0 && (
                <button
                  onClick={fetchTimelineDetails}
                  disabled={isLoadingTimelines}
                  className="text-xs text-primary hover:text-primary-dark p-1 hover:bg-primary/10 rounded"
                  title="Refresh timeline details"
                  type="button"
                >
                  <i className={`ri-refresh-line ${isLoadingTimelines ? 'animate-spin' : ''}`}></i>
                </button>
              )}
            </div>

            {task.timeline && task.timeline.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center border border-gray-200">
                <i className="ri-time-line text-gray-400 me-2"></i>
                No related timelines available
              </div>
            ) : isLoadingTimelines ? (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center border border-gray-200">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                Loading timeline details...
              </div>
            ) : timelineDetails.length > 0 ? (
              <>
                {Object.keys(timelineUpdatesMap).length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-800">
                        {Object.keys(timelineUpdatesMap).length} timeline(s) edited. Changes will be sent via <span className="font-semibold">timelineUpdates</span>.
                      </div>
                      <button
                        type="button"
                        onClick={() => setTimelineUpdatesMap({})}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        disabled={isUpdating}
                      >
                        <i className="ri-close-line me-1"></i>
                        Clear timeline edits
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-auto border border-gray-200 rounded min-h-0" style={{ maxHeight: '360px' }}>
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-[rgba(249,250,251,0.3)] sticky top-0 z-10">
                      <tr>
                        <th className="border border-gray-200 px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ minWidth: 180 }}>Activity</th>
                        <th className="border border-gray-200 px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ minWidth: 180 }}>Client</th>
                        <th className="border border-gray-200 px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ width: 140 }}>Status</th>
                        <th className="border border-gray-200 px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ width: 180 }}>Reference Number</th>
                        <th className="border border-gray-200 px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ width: 150 }}>Completed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineDetails.map((timeline, idx) => {
                        const timelineId = getTimelineId(timeline) || `row-${idx}`;
                        return (
                          <tr key={timelineId} className="hover:bg-[rgba(249,250,251,0.5)] transition-colors">
                            <td className="border border-gray-200 px-1.5 py-2.5 text-[12px] text-[#323251]">
                              <div className="font-medium">
                                {timeline.activity?.name || timeline.activity || 'Unknown Activity'}
                              </div>
                              {timeline.period && (
                                <div className="text-xs text-gray-500 mt-0.5">Period: {timeline.period}</div>
                              )}
                            </td>
                            <td className="border border-gray-200 px-1.5 py-2.5 text-[12px] text-[#323251]">
                              {timeline.client?.name || timeline.client || 'Unknown Client'}
                            </td>
                            <td className="border border-gray-200 px-1.5 py-2.5">
                              <select
                                className="w-full bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300"
                                value={timeline.status || ''}
                                onChange={(e) => setTimelineField(timeline, 'status', e.target.value)}
                                disabled={isUpdating}
                              >
                                <option value="">Select</option>
                                <option value="pending">Pending</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="delayed">Delayed</option>
                              </select>
                            </td>
                            <td className="border border-gray-200 px-1.5 py-2.5">
                              <input
                                type="text"
                                className="w-full bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300"
                                value={timeline.referenceNumber || ''}
                                onChange={(e) => setTimelineField(timeline, 'referenceNumber', e.target.value)}
                                disabled={isUpdating}
                                placeholder="REF-123"
                              />
                            </td>
                            <td className="border border-gray-200 px-1.5 py-2.5">
                              <input
                                type="date"
                                className="w-full bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300"
                                value={getCompletedAtInputValue(timeline)}
                                onChange={(e) => setTimelineField(timeline, 'completedAt', e.target.value)}
                                disabled={isUpdating}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Note: only <span className="font-medium">status</span>, <span className="font-medium">referenceNumber</span>, and <span className="font-medium">completedAt</span> will be sent for timeline updates.
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center border border-gray-200">
                <i className="ri-error-warning-line text-gray-400 me-2"></i>
                Failed to load timeline details
                <button
                  onClick={fetchTimelineDetails}
                  className="block mx-auto mt-2 text-primary hover:text-primary-dark text-xs underline"
                  type="button"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
            onClick={handleStatusUpdate}
            disabled={
              isUpdating ||
              (task.status === 'delayed' && selectedStatus === 'delayed' && Object.keys(timelineUpdatesMap).length === 0) ||
              (task.status !== 'delayed' &&
                selectedStatus === task.status &&
                remarks === (task.remarks || '') &&
                Object.keys(timelineUpdatesMap).length === 0)
            }
          >
            {isUpdating ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Updating...
              </>
            ) : task.status === 'delayed' ? (
              <>
                <i className="ri-check-line text-xs" />
                Mark as Completed
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

// Helper functions for styling (moved outside component)
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

export default TasksPage;
