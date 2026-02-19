"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

      const response = await fetch(`${Base_url}tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data: ApiResponse = await response.json();
      // Transform _id to id for consistency
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
        exportData = apiData.results.map((task: any) => ({
          ID: task._id || task.id,
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
          } else {
            toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
          }

          fetchTasks();
        } catch (err) {
          toast.error('Failed to process file');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
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
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
      <div className="p-[10px]">
      {/* Page Header – spec: accent bar, 14px bold, buttons 11px */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
          <h1 className="text-[0.875rem] font-bold text-gray-800">Task Management</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedTasks.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
              onClick={handleDeleteSelected}
            >
              <i className="ri-delete-bin-line text-xs" />
              Delete Selected ({selectedTasks.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
            onClick={handleExport}
          >
            <i className="ri-upload-2-line text-xs" /> Export
          </button>
          <Link
            href="/tasks/add"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
          >
            <i className="ri-add-line text-xs" />
            Add New Task
          </Link>
        </div>
      </div>

      {/* Status Summary Cards – spec: 11px labels, small counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { status: 'pending', label: 'Pending', icon: 'ri-time-line', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100' },
          { status: 'ongoing', label: 'Ongoing', icon: 'ri-loader-4-line', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100' },
          { status: 'completed', label: 'Completed', icon: 'ri-check-line', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
          { status: 'on_hold', label: 'On Hold', icon: 'ri-pause-line', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100' },
          { status: 'delayed', label: 'Delayed', icon: 'ri-error-warning-line', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', iconBg: 'bg-red-100' },
        ].map(({ status, label, icon, bg, border, text, iconBg }) => (
          <div
            key={status}
            className={`${bg} border ${border} rounded p-4 cursor-pointer hover:opacity-90 transition-colors`}
            onClick={() => { setFilters(prev => ({ ...prev, status })); setCurrentPage(1); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-bold ${text}`}>{label}</span>
                <p className="text-lg font-bold text-[#323251] mt-0.5">{tasks.filter(t => t?.status === status).length}</p>
              </div>
              <div className={`w-9 h-9 ${iconBg} rounded-full flex items-center justify-center ${text}`}>
                <i className={`${icon} text-sm`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Sort – spec: 11px inputs/selects */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[80px]"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          <input
            type="text"
            className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium flex-grow min-w-[150px] sm:min-w-[200px]"
            placeholder="Search tasks..."
            value={searchInputValue}
            onChange={handleSearchChange}
          />
          <select
            className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[120px]"
            value={filters.status}
            onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setCurrentPage(1); }}
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
            className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[120px]"
            value={filters.priority}
            onChange={(e) => { setFilters(prev => ({ ...prev, priority: e.target.value })); setCurrentPage(1); }}
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
              className={`bg-white border border-gray-200 py-1.5 px-3 text-[11px] font-medium rounded w-full focus:ring-0 focus:border-purple-300 ${!filters.startDate ? 'text-gray-400' : ''} ${filters.startDate ? 'border-purple-300' : ''}`}
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
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                input.focus();
                if (typeof input.showPicker === 'function') {
                  input.showPicker();
                }
              }}
              max={filters.endDate || undefined}
              title="Start Date From"
              style={!filters.startDate ? { color: 'transparent' } : {}}
            />
            {!filters.startDate && (
              <div className="absolute inset-0 flex items-center px-3 text-gray-400 text-[11px] bg-white cursor-pointer pointer-events-none">Start Date</div>
            )}
            {filters.startDate && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-600 rounded-full" />
            )}
          </div>

          <div className="relative w-full sm:w-auto min-w-[140px]">
            <input
              type="date"
              className={`bg-white border border-gray-200 py-1.5 px-3 text-[11px] font-medium rounded w-full focus:ring-0 focus:border-purple-300 ${!filters.endDate ? 'text-gray-400' : ''} ${filters.endDate ? 'border-purple-300' : ''}`}
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
              onClick={(e) => {
                if (filters.startDate) {
                  const input = e.target as HTMLInputElement;
                  input.focus();
                  if (typeof input.showPicker === 'function') {
                    input.showPicker();
                  }
                }
              }}
              min={filters.startDate || undefined}
              disabled={!filters.startDate}
              title="End Date Until"
              style={!filters.endDate ? { color: 'transparent' } : {}}
            />
            {!filters.endDate && (
              <div className={`absolute inset-0 flex items-center px-3 text-gray-400 text-[11px] bg-white ${!filters.startDate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} pointer-events-none`}>
                End Date {!filters.startDate && '(Select start first)'}
              </div>
            )}
            {filters.endDate && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-600 rounded-full" />
            )}
          </div>

          <select
            className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[140px]"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 shadow-sm whitespace-nowrap"
            onClick={() => {
              setSearchInputValue("");
              setFilters({ status: "", priority: "", branch: "", teamMember: "", startDate: "", endDate: "", today: "false" });
              setSortBy("createdAt:desc");
              setCurrentPage(1);
            }}
          >
            <i className="ri-refresh-line text-xs" /> Reset
          </button>
        </div>
      </div>

      {/* Search Results / Active Filters – spec: 11px, sky */}
      {filters.teamMember && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-sky-700">Search: &quot;{filters.teamMember}&quot; — {tasks.length} tasks</span>
            <button type="button" onClick={() => { setFilters(prev => ({ ...prev, teamMember: "" })); setSearchInputValue(""); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800">
              <i className="ri-close-line text-xs" /> Clear
            </button>
          </div>
        </div>
      )}
      {(filters.status || filters.priority || (filters.startDate && filters.endDate) || filters.teamMember) && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-[11px] font-bold text-sky-700">Active Filters:</span>
              {filters.status && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">Status: {filters.status}</span>}
              {filters.priority && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">Priority: {filters.priority}</span>}
              {filters.teamMember && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">Search: {filters.teamMember}</span>}
              {filters.startDate && filters.endDate && (
                <>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">From: {new Date(filters.startDate).toLocaleDateString()}</span>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">To: {new Date(filters.endDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
            <button type="button" onClick={() => { setFilters(prev => ({ ...prev, status: "", priority: "", teamMember: "", startDate: "", endDate: "" })); setSearchInputValue(""); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800">
              <i className="ri-close-line text-xs" /> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table – spec: gray-50/30 header, 11px th, 12px td, 28px action buttons */}
      <div className="overflow-x-auto min-h-[300px] border border-gray-200 rounded">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedTasks.length === tasks.length && tasks.length > 0} onChange={handleSelectAll} />
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Team Member</th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Dates</th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Priority</th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remarks</th>
              <th className="px-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-20 border border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                    <p className="mt-3 text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20 border border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <i className="ri-task-line text-xl text-gray-200" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</p>
                    <p className="text-[11px] text-gray-500 mb-4">Start by adding your first task.</p>
                    <Link href="/tasks/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700">
                      <i className="ri-add-line text-xs" /> Add First Task
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                    <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => handleSelectTask(task.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <div className="text-[12px]">
                      <div className="font-medium text-[#323251]">{task.teamMember?.name || "-"}</div>
                      <div className="text-[11px] text-[#495057]">{task.teamMember?.email || "-"}</div>
                      {task.branch?.name && (
                        <div className="text-[11px] text-[#495057] flex items-center mt-0.5"><i className="ri-building-line text-xs mr-1" />{task.branch.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 text-[12px]">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-[#495057]">Start: {task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "-"}</div>
                      <div className="text-[11px] text-[#495057]">End: {task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "-"}</div>
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${getPriorityColor(task.priority)} text-white`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200 text-[12px] text-[#323251] max-w-xs truncate" title={task.remarks || "-"}>{task.remarks || "-"}</td>
                  <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                        onClick={() => { const taskId = task.id || (task as any)._id; if (!taskId) { toast.error('Task ID is missing.'); return; } router.push(`/tasks/edit/${taskId}`); }}
                        title="Edit"
                      >
                        <i className="ri-pencil-line text-sm" />
                      </button>
                      <button type="button" onClick={() => handleDelete(task.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete">
                        <i className="ri-delete-bin-line text-sm" />
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
      {!isLoading && !error && tasks.length > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-4 p-[10px] pt-4 border-t border-gray-100">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
            {getPagination(currentPage, totalPages).map((page, idx) =>
              page === "..." ? (
                <span key={"ellipsis-" + idx} className="px-2 text-[10px] text-gray-300">...</span>
              ) : (
                <button key={page} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === page ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`} onClick={() => setCurrentPage(Number(page))}>{page}</button>
              )
            )}
            <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
          </nav>
        </div>
      )}
      </div>
    </div>
  );
};

export default TaskManagement;
