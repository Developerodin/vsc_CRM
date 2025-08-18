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



const TasksPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
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

    setIsUpdatingQuickEdit(true);
    try {
      const response = await fetch(`${Base_url}tasks/${quickEditTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: quickEditStatus,
          remarks: quickEditRemarks,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Update the task in the local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === quickEditTask.id 
            ? { ...task, status: quickEditStatus as Task['status'], remarks: quickEditRemarks }
            : task
        )
      );

      closeQuickEditModal();
      toast.success('Task updated successfully!');
      
      // Refresh task statistics
      await fetchTaskStats();
    } catch (error) {
      console.error('Error updating task:', error);
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

      console.log('Fetching tasks with URL:', `${Base_url}tasks?${queryParams}`);
      console.log('Original Filters:', filters);
      console.log('Processed Filters:', processedFilters);
      console.log('Clean Filters:', cleanFilters);

      const response = await axios.get(`${Base_url}tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('API Response:', response.data);

      const data: ApiResponse = response.data;
      setTasks(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
      
      console.log('Tasks set:', data.results);
      console.log('Total results:', data.totalResults);
    } catch (err) {
      console.error('Error fetching tasks:', err);
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

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTasks(tasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      case 'high': return 'bg-yellow-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
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

      {/* Page Header */}
      <div className="box !bg-transparent border-0 shadow-none mb-6">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Task Management</h1>
          <div className="box-tools flex items-center space-x-2">
            {selectedTasks.length > 0 && (
              <button
                type="button"
                className="ti-btn ti-btn-danger"
                onClick={handleDeleteSelected}
              >
                <i className="ri-delete-bin-line me-2"></i>
                Delete Selected ({selectedTasks.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Pending Card */}
        <div 
          className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'pending' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-warning">Pending</span>
              <p className="text-2xl font-bold text-warning">
                {tasks.filter(t => t?.status === 'pending').length}
              </p>
            </div>
            <div className="bg-warning/20 p-3 rounded-full">
              <i className="ri-time-line text-warning text-xl"></i>
            </div>
          </div>
        </div>

        {/* Ongoing Card */}
        <div 
          className="bg-primary/10 border border-primary/20 rounded-lg p-4 cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'ongoing' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-primary">Ongoing</span>
              <p className="text-2xl font-bold text-primary">
                {tasks.filter(t => t?.status === 'ongoing').length}
              </p>
            </div>
            <div className="bg-primary/20 p-3 rounded-full">
              <i className="ri-loader-4-line text-primary text-xl"></i>
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div 
          className="bg-success/10 border border-success/20 rounded-lg p-4 cursor-pointer hover:bg-success/20 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'completed' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-success">Completed</span>
              <p className="text-2xl font-bold text-success">
                {tasks.filter(t => t?.status === 'completed').length}
              </p>
            </div>
            <div className="bg-success/20 p-3 rounded-full">
              <i className="ri-check-line text-success text-xl"></i>
            </div>
          </div>
        </div>

        {/* On Hold Card */}
        <div 
          className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'on_hold' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-warning">On Hold</span>
              <p className="text-2xl font-bold text-warning">
                {tasks.filter(t => t?.status === 'on_hold').length}
              </p>
            </div>
            <div className="bg-warning/20 p-3 rounded-full">
              <i className="ri-pause-line text-warning text-xl"></i>
            </div>
          </div>
        </div>

        {/* Delayed Card */}
        <div 
          className="bg-danger/10 border border-danger/20 rounded-lg p-4 cursor-pointer hover:bg-danger/20 transition-colors"
          onClick={() => setFilters({ ...filters, status: 'delayed' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-danger">Delayed</span>
              <p className="text-2xl font-bold text-danger">
                {tasks.filter(t => t?.status === 'delayed').length}
              </p>
            </div>
            <div className="bg-danger/20 p-3 rounded-full">
              <i className="ri-error-warning-line text-danger text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Summary */}
      {filters.startDate && filters.endDate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">Date Range Filter:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                From: {new Date(filters.startDate).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                To: {new Date(filters.endDate).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              <i className="ri-close-line me-1"></i>
              Clear Date Range
            </button>
          </div>
        </div>
      )}

      {/* Simple Filters Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div className="flex items-center w-full lg:w-auto">
          <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
          <select
            className="form-select w-auto text-sm"
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-grow sm:max-w-xs">
            <input
              type="text"
              className="form-control py-2 w-full"
              placeholder="Search tasks..."
              value={searchInputValue}
              onChange={handleSearchChange}
            />
          </div>

          <select
            className="form-select py-2 w-full sm:w-auto"
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
            className="form-select py-2 w-full sm:w-auto"
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

          <div className="relative">
            <input
              type="date"
              className={`form-control py-2 w-full sm:w-auto ${!filters.startDate ? 'text-transparent' : ''} ${filters.startDate ? 'border-primary' : ''}`}
              value={filters.startDate}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, startDate: e.target.value }));
                setCurrentPage(1);
              }}
              title="Start Date From"
              style={!filters.startDate ? { color: 'transparent' } : {}}
            />
            {!filters.startDate && (
              <div 
                className="absolute inset-0 flex items-center px-3 text-gray-500 bg-white cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input) {
                    input.focus();
                    input.showPicker();
                  }
                }}
              >
                Start Date
              </div>
            )}
            {filters.startDate && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-primary rounded-full"></div>
            )}
          </div>

          <div className="relative">
            <input
              type="date"
              className={`form-control py-2 w-full sm:w-auto ${!filters.endDate ? 'text-transparent' : ''} ${filters.endDate ? 'border-primary' : ''}`}
              value={filters.endDate}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, endDate: e.target.value }));
                setCurrentPage(1);
              }}
              title="End Date Until"
              style={!filters.endDate ? { color: 'transparent' } : {}}
            />
            {!filters.endDate && (
              <div 
                className="absolute inset-0 flex items-center px-3 text-gray-500 bg-white cursor-pointer"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input) {
                    input.focus();
                    input.showPicker();
                  }
                }}
              >
                End Date
              </div>
            )}
            {filters.endDate && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-primary rounded-full"></div>
            )}
          </div>

          <select
            className="form-select py-2 w-full sm:w-32"
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
              setCurrentPage(1);
            }}
          >
            <i className="ri-refresh-line me-2"></i>
            Reset
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="table-responsive">
        <table className="table whitespace-nowrap table-bordered">
          <thead>
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={selectedTasks.length === tasks.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3">Team Member</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">End Date</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-4">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="text-center text-red-500 py-4">
                  {error}
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <i className="ri-task-line text-4xl text-primary"></i>
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      No Tasks Found
                    </h3>
                    <p className="text-gray-500 text-center mb-6">
                      No tasks found matching your criteria.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleSelectTask(task.id)}
                      className="form-checkbox"
                    />
                  </td>
                  <td>
                    <div>
                      <div className="font-medium">{task.teamMember?.name || "-"}</div>
                      <div className="text-sm text-gray-500">{task.teamMember?.email || "-"}</div>
                    </div>
                  </td>
                  <td>{task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "-"}</td>
                  <td>{task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "-"}</td>
                  <td>
                    <span className={`badge ${getPriorityColor(task.priority)} text-white`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td>{task.branch?.name || "-"}</td>
                  <td>
                    <span 
                      className={`badge ${getStatusStyling(task.status)} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => openQuickEditModal(task)}
                      title="Click to edit status and remarks"
                    >
                      {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                                     <td 
                     className="max-w-xs truncate cursor-pointer hover:bg-gray-50 transition-colors px-2 py-1 rounded" 
                     title={`${task.remarks || "No remarks"} - Click to edit`}
                     onClick={() => openQuickEditModal(task)}
                   >
                     {task.remarks || "-"}
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex items-center space-x-2">
                       <button
                         type="button"
                         className="ti-btn ti-btn-sm ti-btn-primary"
                         onClick={() => openTaskDetailsModal(task)}
                         title="View Task Details"
                       >
                         <i className="ri-eye-line"></i>
                       </button>
                     </div>
                   </td>
                 </tr>
               ))
             )}
           </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && !error && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing{" "}
            {totalResults === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{" "}
            to{" "}
            {totalResults === 0
              ? 0
              : Math.min(currentPage * itemsPerPage, totalResults)}{" "}
            of {totalResults} entries
          </div>
          <nav aria-label="Page navigation" className="">
            <ul className="flex flex-wrap items-center">
              <li
                className={`page-item ${
                  currentPage === 1 ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
              </li>
              {getPagination(currentPage, totalPages).map((page, idx) =>
                page === "..." ? (
                  <li key={"ellipsis-" + idx} className="page-item">
                    <span className="px-3">...</span>
                  </li>
                ) : (
                  <li key={page} className="page-item">
                    <button
                      className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                        currentPage === page
                          ? "bg-primary text-white hover:bg-primary-dark"
                          : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                      onClick={() => setCurrentPage(Number(page))}
                    >
                      {page}
                    </button>
                  </li>
                )
              )}
              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, totalPages)
                    )
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
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

      {/* Quick Edit Modal */}
      {showQuickEditModal && quickEditTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Edit Task
              </h3>
              <button
                onClick={closeQuickEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
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
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  className="form-control w-full"
                  rows={4}
                  placeholder="Enter task remarks..."
                  value={quickEditRemarks}
                  onChange={(e) => setQuickEditRemarks(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                type="button"
                onClick={closeQuickEditModal}
                className="ti-btn ti-btn-secondary"
                disabled={isUpdatingQuickEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickEditSubmit}
                className="ti-btn ti-btn-primary"
                disabled={isUpdatingQuickEdit || !quickEditStatus}
              >
                {isUpdatingQuickEdit ? (
                  <>
                    <i className="ti-spinner animate-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line me-2"></i>
                    Update Task
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
  onUpdateStatus: (taskId: string, status: string, remarks?: string) => Promise<void>;
  isUpdating: boolean;
}) => {
  const [selectedStatus, setSelectedStatus] = useState(task.status);
  const [remarks, setRemarks] = useState(task.remarks || '');
  const [timelineDetails, setTimelineDetails] = useState<any[]>([]);
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false);
  const [timelineCurrentPage, setTimelineCurrentPage] = useState(1);
  const [timelinesPerPage] = useState(5);

  // Fetch timeline details when modal opens
  useEffect(() => {
    if (task.timeline && task.timeline.length > 0) {
      fetchTimelineDetails();
    }
  }, [task]);

  const fetchTimelineDetails = async () => {
    if (!task.timeline || task.timeline.length === 0) return;
    
    setIsLoadingTimelines(true);
    try {
      const timelinePromises = task.timeline.map(async (timelineRef) => {
        try {
          const response = await fetch(`${Base_url}timelines/${timelineRef.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            return await response.json();
          } else {
            console.error(`Failed to fetch timeline ${timelineRef.id}:`, response.status);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching timeline ${timelineRef.id}:`, error);
          return null;
        }
      });

             const results = await Promise.all(timelinePromises);
       const validTimelines = results.filter(timeline => timeline !== null);
       setTimelineDetails(validTimelines);
       setTimelineCurrentPage(1); // Reset to first page when new data is loaded
    } catch (error) {
      console.error('Error fetching timeline details:', error);
    } finally {
      setIsLoadingTimelines(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus !== task.status || remarks !== (task.remarks || '')) {
      await onUpdateStatus(task.id, selectedStatus, remarks);
    }
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

  // Timeline pagination logic
  const getPaginatedTimelines = () => {
    const startIndex = (timelineCurrentPage - 1) * timelinesPerPage;
    const endIndex = startIndex + timelinesPerPage;
    return timelineDetails.slice(startIndex, endIndex);
  };

  const totalTimelinePages = Math.ceil(timelineDetails.length / timelinesPerPage);

  const handleTimelinePageChange = (page: number) => {
    setTimelineCurrentPage(page);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
                 <div className="flex items-center justify-between p-6 border-b">
           <div className="flex-1 mr-6">
             <h2 className="text-lg font-semibold text-gray-800">Task Details</h2>
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

                             <div>
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-medium text-gray-700">Related Timelines</h3>
                   {task.timeline && task.timeline.length > 0 && (
                     <button
                       onClick={fetchTimelineDetails}
                       disabled={isLoadingTimelines}
                       className="text-xs text-primary hover:text-primary-dark p-1 hover:bg-primary/10 rounded"
                       title="Refresh timeline details"
                     >
                       <i className={`ri-refresh-line ${isLoadingTimelines ? 'animate-spin' : ''}`}></i>
                     </button>
                   )}
                 </div>
                 {isLoadingTimelines ? (
                   <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                     Loading timeline details...
                   </div>
                 ) : timelineDetails.length > 0 ? (
                   <>
                     <div className="space-y-2">
                       {getPaginatedTimelines().map((timeline, index) => (
                         <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                           <div className="font-medium">{timeline.activity?.name || timeline.activity || 'Unknown Activity'}</div>
                           <div className="text-gray-500">{timeline.client?.name || timeline.client || 'Unknown Client'}</div>
                           <div className="flex items-center justify-between mt-1">
                             <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyling(timeline.status)}`}>
                               {timeline.status || 'Unknown Status'}
                             </span>
                             {timeline.priority && (
                               <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityStyling(timeline.priority)}`}>
                                 {timeline.priority}
                               </span>
                             )}
                           </div>
                           {timeline.description && (
                             <div className="text-xs text-gray-600 mt-1">
                               {timeline.description}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                     
                     {/* Timeline Pagination */}
                     {totalTimelinePages > 1 && (
                       <div className="mt-4 flex justify-center">
                         <nav className="flex items-center space-x-1">
                           <button
                             onClick={() => handleTimelinePageChange(timelineCurrentPage - 1)}
                             disabled={timelineCurrentPage === 1}
                             className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                           >
                             Previous
                           </button>
                           
                           {Array.from({ length: totalTimelinePages }, (_, i) => i + 1).map((page) => (
                             <button
                               key={page}
                               onClick={() => handleTimelinePageChange(page)}
                               className={`px-2 py-1 text-xs border rounded ${
                                 timelineCurrentPage === page
                                   ? 'bg-primary text-white border-primary'
                                   : 'border-gray-300 hover:bg-gray-50'
                               }`}
                             >
                               {page}
                             </button>
                           ))}
                           
                           <button
                             onClick={() => handleTimelinePageChange(timelineCurrentPage + 1)}
                             disabled={timelineCurrentPage === totalTimelinePages}
                             className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                           >
                             Next
                           </button>
                         </nav>
                       </div>
                     )}
                     
                     <div className="text-xs text-gray-500 text-center mt-2">
                       Showing {((timelineCurrentPage - 1) * timelinesPerPage) + 1} to {Math.min(timelineCurrentPage * timelinesPerPage, timelineDetails.length)} of {timelineDetails.length} timelines
                     </div>
                   </>
                 ) : task.timeline && task.timeline.length > 0 ? (
                   <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                     <i className="ri-error-warning-line text-gray-400 me-2"></i>
                     Failed to load timeline details
                     <button
                       onClick={fetchTimelineDetails}
                       className="block mx-auto mt-2 text-primary hover:text-primary-dark text-xs underline"
                     >
                       Try again
                     </button>
                   </div>
                 ) : (
                   <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                     <i className="ri-time-line text-gray-400 me-2"></i>
                     No related timelines available
                   </div>
                 )}
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

                             <div>
                 <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                 {task.attachments && task.attachments.length > 0 ? (
                   <div className="space-y-2">
                     {task.attachments.map((attachment, index) => (
                       <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                         <div className="flex items-center gap-2">
                           <i className="ri-file-line text-gray-400"></i>
                           <span className="text-sm font-medium">{attachment.fileName}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => handleDownloadAttachment(attachment)}
                             className="text-primary hover:text-primary-dark text-sm p-1 hover:bg-primary/10 rounded"
                             title="Download Attachment"
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
                   <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                     <i className="ri-file-line text-gray-400 me-2"></i>
                     No attachments available
                   </div>
                 )}
               </div>

              
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
