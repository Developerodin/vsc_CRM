"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

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
    location?: string;
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
  metadata?: any;
  attachments: Array<{
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
}

interface ExcelRow {
  ID?: string;
  "Team Member": string;
  "Start Date": string;
  "End Date": string;
  "Priority": string;
  "Branch": string;
  "Status": string;
  "Remarks"?: string;
}

const TaskManagement = () => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("createdAt:desc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    branch: "",
    teamMember: "",
    startDate: "",
    endDate: "",
    today: "false",
  });

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
          toast.error('Start date must be before or equal to end date. Please adjust your date filters.');
          setIsLoading(false);
          // Clear invalid end date
          setFilters(prev => ({
            ...prev,
            endDate: ""
          }));
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

      const response = await fetch(`${Base_url}tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data: ApiResponse = await response.json();
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

  useEffect(() => {
    fetchTasks(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

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

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      toast.success('Task deleted successfully');
      fetchTasks(currentPage, itemsPerPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    }
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

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedTasks.length > 0) {
        exportData = tasks
          .filter(task => selectedTasks.includes(task.id))
          .map((task: Task) => ({
            ID: task.id,
            "Team Member": task.teamMember?.name || "",
            "Start Date": task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
            "End Date": task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "",
            "Priority": task.priority,
            "Branch": task.branch?.name || "",
            "Status": task.status,
            "Remarks": task.remarks || ""
          }));
        successMessage = "Selected tasks exported successfully";
      } else {
        const response = await fetch(`${Base_url}tasks?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tasks for export');
        }

        const apiData: ApiResponse = await response.json();
        exportData = apiData.results.map((task: Task) => ({
          ID: task.id,
          "Team Member": task.teamMember?.name || "",
          "Start Date": task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
          "End Date": task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "",
          "Priority": task.priority,
          "Branch": task.branch?.name || "",
          "Status": task.status,
          "Remarks": task.remarks || ""
        }));
        successMessage = "All tasks exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 25 }, // Team Member
        { wch: 20 }, // Start Date
        { wch: 20 }, // End Date
        { wch: 15 }, // Priority
        { wch: 25 }, // Branch
        { wch: 15 }, // Status
        { wch: 30 }, // Remarks
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tasks");
      const fileName = `tasks_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting tasks:", error);
      toast.error("Failed to export tasks");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

          if (jsonData.length === 0) {
            toast.error('No data found in the file');
            return;
          }

          // Transform data for bulk import
          const tasks = jsonData.map(row => ({
            teamMember: row["Team Member"],
            startDate: row["Start Date"],
            endDate: row["End Date"],
            priority: row["Priority"] as 'low' | 'medium' | 'high' | 'urgent' | 'critical',
            branch: row["Branch"],
            status: row["Status"] as 'pending' | 'ongoing' | 'completed' | 'on_hold' | 'cancelled' | 'delayed',
            remarks: row["Remarks"] || undefined,
          }));

          // Single API call for bulk import
          const response = await fetch(`${Base_url}tasks/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ tasks })
          });

          if (!response.ok) {
            throw new Error('Bulk import failed');
          }

          const result = await response.json();
          
          if (result.errors && result.errors.length > 0) {
            toast.error(`Import completed with ${result.errors.length} errors`);
            console.log('Import errors:', result.errors);
          } else {
            toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
          }

          fetchTasks();
        } catch (err) {
          console.error('Error processing file:', err);
          toast.error('Failed to process file');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error reading file:', err);
      toast.error('Failed to read file');
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'ongoing': return 'bg-primary';
      case 'delayed': return 'bg-danger';
      case 'on_hold': return 'bg-warning';
      case 'cancelled': return 'bg-secondary';
      default: return 'bg-warning';
    }
  };

  return (
    <div>
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            {/* <button
              onClick={() => fileInputRef.current?.click()}
              className="ti-btn ti-btn-success"
            >
              <i className="ri-download-2-line me-2"></i>
              Import
            </button> */}
            <button
              type="button"
              className="ti-btn ti-btn-primary"
              onClick={handleExport}
            >
              <i className="ri-upload-2-line me-2"></i> Export
            </button>
            <Link
              href="/tasks/add"
              className="ti-btn ti-btn-primary"
            >
              <i className="ri-add-line me-2"></i>
              Add New Task
            </Link>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Pending Card */}
        <div 
          className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'pending' }));
            setCurrentPage(1);
          }}
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
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'ongoing' }));
            setCurrentPage(1);
          }}
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
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'completed' }));
            setCurrentPage(1);
          }}
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
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'on_hold' }));
            setCurrentPage(1);
          }}
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
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'delayed' }));
            setCurrentPage(1);
          }}
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

      {/* Search and Sort */}
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
                const newStartDate = e.target.value;
                setFilters(prev => {
                  // If new start date is after end date, clear end date
                  const updatedFilters = { ...prev, startDate: newStartDate };
                  if (newStartDate && prev.endDate && new Date(newStartDate) > new Date(prev.endDate)) {
                    updatedFilters.endDate = "";
                    toast.error('Start date cannot be after end date. End date has been cleared.');
                  }
                  return updatedFilters;
                });
                setCurrentPage(1);
              }}
              max={filters.endDate || undefined}
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
                const newEndDate = e.target.value;
                setFilters(prev => {
                  // Validate that end date is not before start date
                  if (prev.startDate && new Date(newEndDate) < new Date(prev.startDate)) {
                    toast.error('End date cannot be before start date');
                    return prev;
                  }
                  return { ...prev, endDate: newEndDate };
                });
                setCurrentPage(1);
              }}
              min={filters.startDate || undefined}
              disabled={!filters.startDate}
              title="End Date Until"
              style={!filters.endDate ? { color: 'transparent' } : {}}
            />
            {!filters.endDate && (
              <div 
                className={`absolute inset-0 flex items-center px-3 text-gray-500 bg-white ${!filters.startDate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                onClick={(e) => {
                  if (filters.startDate) {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input) {
                      input.focus();
                      input.showPicker();
                    }
                  }
                }}
              >
                End Date {!filters.startDate && '(Select start date first)'}
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

      {/* Search Results Indicator */}
      {filters.teamMember && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="ri-search-line text-green-600 mr-2"></i>
              <span className="text-sm font-medium text-green-800">
                Search Results for "{filters.teamMember}": {tasks.length} tasks found
              </span>
            </div>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, teamMember: "" }));
                setSearchInputValue("");
                setCurrentPage(1);
              }}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              <i className="ri-close-line mr-1"></i>
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {(filters.status || filters.priority || (filters.startDate && filters.endDate) || filters.teamMember) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">Active Filters:</span>
              
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                </span>
              )}
              
              {filters.priority && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Priority: {filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)}
                </span>
              )}
              
              {filters.teamMember && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  <i className="ri-search-line mr-1"></i>
                  Search: {filters.teamMember}
                </span>
              )}
              
              {filters.startDate && filters.endDate && (
                <>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    From: {new Date(filters.startDate).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    To: {new Date(filters.endDate).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setFilters(prev => ({ 
                  ...prev, 
                  status: "", 
                  priority: "",
                  teamMember: "",
                  startDate: "", 
                  endDate: "" 
                }));
                setSearchInputValue("");
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              <i className="ri-close-line me-1"></i>
              Clear All Filters
            </button>
          </div>
        </div>
      )}

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
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Priority</th>
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
                      Start by adding your first task.
                    </p>
                    <Link
                      href="/tasks/add"
                      className="ti-btn ti-btn-primary"
                    >
                      <i className="ri-add-line me-2"></i> Add First Task
                    </Link>
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
                      {task.branch?.name && (
                        <div className="text-sm text-black flex items-center mt-1">
                          <i className="ri-building-line mr-1"></i>
                          {task.branch.name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "-"}</td>
                  <td>{task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "-"}</td>
                  <td>
                    {task.createdAt ? (
                      <div>
                        <div>{new Date(task.createdAt).toISOString().split('T')[0]}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : "-"}
                  </td>
                  <td>
                    <span className={`badge ${getPriorityColor(task.priority)} text-white`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className="max-w-xs truncate" title={task.remarks || "-"}>
                    {task.remarks || "-"}
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <Link
                        href={`/tasks/edit/${task.id}`}
                        className="ti-btn ti-btn-primary ti-btn-sm"
                        title="Edit"
                      >
                        <i className="ri-edit-line"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="ti-btn ti-btn-danger ti-btn-sm"
                        title="Delete"
                      >
                        <i className="ri-delete-bin-line"></i>
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
    </div>
  );
};

export default TaskManagement;
