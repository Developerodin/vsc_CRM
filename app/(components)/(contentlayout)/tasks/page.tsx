"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from "axios";

interface UdinEntry {
  fieldName: string;
  udin: string;
  frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  _id?: string; // Optional field that comes from API response
}

interface Timeline {
  id: string;
  activity: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'ongoing' | 'delayed';
  frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  frequencyConfig: {
    hourlyInterval: number;
    dailyTime: string;
    weeklyDays: string[];
    weeklyTime: string;
    monthlyDay: number;
    monthlyTime: string;
    quarterlyMonths: string[];
    quarterlyDay: number;
    quarterlyTime: string;
    yearlyMonth: string[];
    yearlyDate: number;
    yearlyTime: string;
  };
  udin?: string | UdinEntry[];
  turnover?: number;
  assignedMember: {
    id: string;
    name: string;
  };
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Timeline[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

const TasksPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState<Timeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("activityName:asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [filters, setFilters] = useState({
    activityName: "",
    status: "",
    startDate: "",
    endDate: "",
    today: "false",
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Timeline | null>(null);
  
  // New state for status update confirmation modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState<{
    taskId: string;
    oldStatus: string;
    newStatus: string;
    taskName: string;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New state for UDIN edit modal
  const [showUdinModal, setShowUdinModal] = useState(false);
  const [selectedTaskForUdin, setSelectedTaskForUdin] = useState<Timeline | null>(null);
  const [udinEntries, setUdinEntries] = useState<UdinEntry[]>([]);
  const [isLoadingUdin, setIsLoadingUdin] = useState(false);
  const [isSavingUdin, setIsSavingUdin] = useState(false);

  // Function to fetch UDIN data for a task
  const fetchUdinData = async (taskId: string) => {
    setIsLoadingUdin(true);
    try {
      const response = await axios.get(`${Base_url}timelines/${taskId}/udin`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      setUdinEntries(data.udin || []);
    } catch (err) {
      console.error('Error fetching UDIN data:', err);
      setUdinEntries([]);
      toast.error('Failed to fetch UDIN data');
    } finally {
      setIsLoadingUdin(false);
    }
  };

  // Function to handle UDIN edit button click
  const handleUdinEditClick = async (task: Timeline) => {
    setSelectedTaskForUdin(task);
    setShowUdinModal(true);
    await fetchUdinData(task.id);
  };

  // Function to add new UDIN entry
  const addUdinEntry = (frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly') => {
    if (frequency === 'Weekly' || frequency === 'Yearly' || frequency === 'Quarterly') {
    setUdinEntries(prev => [...prev, {
        fieldName: '',
        udin: '',
        frequency: frequency
      }]);
    } else {
      setUdinEntries(prev => [...prev, {
        fieldName: 'All',
        udin: '',
        frequency: frequency
      }]);
    }
  };

  // Function to remove UDIN entry
  const removeUdinEntry = (index: number) => {
    setUdinEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Function to update UDIN entry
  const updateUdinEntry = (index: number, field: keyof UdinEntry, value: string) => {
    setUdinEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  // Function to save UDIN data
  const saveUdinData = async () => {
    if (!selectedTaskForUdin) return;

    // Validate entries and clean them (remove _id fields)
    const validEntries = udinEntries.filter(entry => {
      // For Weekly, Yearly, Quarterly - both fieldName and udin are required
      if (entry.frequency === 'Weekly' || entry.frequency === 'Yearly' || entry.frequency === 'Quarterly') {
        return entry.fieldName.trim() && entry.udin.trim();
      }
      // For Hourly, Daily, Monthly - only udin is required
      return entry.udin.trim();
    }).map(entry => {
      // Remove _id field and any other unwanted fields, keep only the required ones
      const { _id, ...cleanEntry } = entry;
      return cleanEntry;
    });

    setIsSavingUdin(true);
    try {
      await axios.patch(`${Base_url}timelines/${selectedTaskForUdin.id}/udin`, {
        udin: validEntries
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update the task in local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === selectedTaskForUdin.id 
            ? { ...task, udin: validEntries }
            : task
        )
      );

      toast.success('UDIN data updated successfully');
      setShowUdinModal(false);
      setSelectedTaskForUdin(null);
      setUdinEntries([]);
    } catch (err) {
      toast.error('Failed to update UDIN data');
      console.error('Error updating UDIN data:', err);
    } finally {
      setIsSavingUdin(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setFilters(prev => ({
            ...prev,
            activityName: searchValue
          }));
          setCurrentPage(1);
        }, 500);
      };
    })(),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value); // Update input immediately
    debouncedSearch(value); // Debounce the API call
  };

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

      const response = await axios.get(`${Base_url}timelines?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data: ApiResponse = response.data;
      console.log(data.results);
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

  // Function to handle status button click
  const handleStatusButtonClick = (taskId: string, currentStatus: string, taskName: string) => {
    setStatusUpdateData({
      taskId,
      oldStatus: currentStatus,
      newStatus: currentStatus,
      taskName
    });
    setShowStatusModal(true);
  };

  // Function to handle status selection in modal
  const handleStatusSelection = (newStatus: string) => {
    if (!statusUpdateData) return;
    setStatusUpdateData(prev => prev ? { ...prev, newStatus } : null);
  };

  // Function to confirm status update
  const confirmStatusUpdate = async () => {
    if (!statusUpdateData) return;

    setIsUpdatingStatus(true);
    try {
      await axios.patch(`${Base_url}timelines/${statusUpdateData.taskId}`, {
        status: statusUpdateData.newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update the task in local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === statusUpdateData.taskId 
            ? { ...task, status: statusUpdateData.newStatus as 'pending' | 'completed' | 'ongoing' | 'delayed' }
            : task
        )
      );

      toast.success(`Task status updated from ${statusUpdateData.oldStatus} to ${statusUpdateData.newStatus}`);
      setShowStatusModal(false);
      setStatusUpdateData(null);
    } catch (err) {
      toast.error('Failed to update task status');
      console.error('Error updating task status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Function to get status styling
  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-black';
      case 'ongoing':
        return 'bg-primary text-black';
      case 'delayed':
        return 'bg-danger text-black';
      case 'pending':
        return 'bg-warning text-black';
      default:
        return 'bg-warning text-black';
    }
  };

  useEffect(() => {
    fetchTasks(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  // Condensed pagination helper
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

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Tasks" />

      <div className="grid grid-cols-12 gap-6 mt-7">
        <div className="col-span-12">
          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Status Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Pending Card */}
                <div 
                  className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'pending' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-warning">Pending</span>
                      <p className="text-2xl font-bold text-warning">
                        {tasks.filter(t => t.status === 'pending').length}
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
                        {tasks.filter(t => t.status === 'ongoing').length}
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
                        {tasks.filter(t => t.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-success/20 p-3 rounded-full">
                      <i className="ri-check-line text-success text-xl"></i>
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
                        {tasks.filter(t => t.status === 'delayed').length}
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
                {/* Rows per page selector */}
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

                {/* Search and filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Today Button */}
                  <button
                    className="ti-btn ti-btn-primary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, today: prev.today === "false" ? "true" : "false" }));
                      setCurrentPage(1);
                    }}
                  >
                    <i className="ri-calendar-todo-line me-2"></i>
                    Today
                  </button>
                  {/* Start Date Filter */}
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
                  {/* End Date Filter */}
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
                  {/* Search bar */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full"
                      placeholder="Search by activity name..."
                      value={searchInputValue}
                      onChange={handleSearchChange}
                    />
                  </div>
                  {/* Sort dropdown */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="activityName:asc">Activity Name (A-Z)</option>
                    <option value="activityName:desc">Activity Name (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="endDate:asc">End Date (Earliest-Latest)</option>
                    <option value="endDate:desc">End Date (Latest-Earliest)</option>
                  </select>
                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setSearchInputValue("");
                      setFilters({
                        activityName: "",
                        status: "",
                        startDate: "",
                        endDate: "",
                        today: "false",
                      });
                      setSortBy("activityName:asc");
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
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Client Email</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">UDIN</th>
                      <th className="px-4 py-3">Turnover</th>
                      <th className="px-4 py-3">Assigned Member</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">End Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={6} className="text-center text-red-500 py-4">
                          {error}
                        </td>
                      </tr>
                    ) : tasks.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                              <i className="ri-time-line text-4xl text-primary"></i>
                            </div>
                            <h3 className="text-xl font-medium mb-2">
                              No Tasks Found
                            </h3>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tasks.map((timeline) => (
                        <tr key={timeline.id}>
                          <td>{timeline.activity.name}</td>
                          <td>{timeline.client.name}</td>
                          <td>{timeline.client.email}</td>
                          <td>{timeline.frequency}</td>
                          <td>
                            <button
                              className="w-full text-left hover:bg-primary/10 hover:text-primary transition-colors duration-200 rounded px-2 py-1 group relative"
                              onClick={() => handleUdinEditClick(timeline)}
                              title="Click to edit UDIN"
                            >
                              <span className="flex items-center gap-2">
                                <span className="truncate">{formatUdinDisplay(timeline.udin)}</span>
                                <i className="ri-edit-line text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-primary ml-auto"></i>
                              </span>
                              <div className="absolute inset-0 border border-transparent group-hover:border-primary/30 rounded transition-colors duration-200 pointer-events-none"></div>
                            </button>
                          </td>
                          <td>{timeline.turnover || "-"}</td>
                          <td>{timeline.assignedMember.name}</td>
                          <td>{timeline.startDate ? new Date(timeline.startDate).toISOString().split('T')[0] : "-"}</td>
                          <td>{timeline.endDate ? new Date(timeline.endDate).toISOString().split('T')[0] : "-"}</td>
                          <td>
                            <button
                              className={`badge border-0 cursor-pointer ${getStatusStyling(timeline.status)}`}
                              onClick={() => handleStatusButtonClick(
                                timeline.id,
                                timeline.status,
                                timeline.activity.name
                              )}
                            >
                              {timeline.status.charAt(0).toUpperCase() + timeline.status.slice(1)}
                            </button>
                          </td>
                          <td>
                            <button
                              className="ti-btn ti-btn-secondary ti-btn-sm"
                              title="View Details"
                              onClick={() => {
                                setSelectedTask(timeline);
                                setShowModal(true);
                              }}
                            >
                              <i className="ri-eye-line"></i>
                            </button>
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
          </div>
        </div>
      </div>
      
      {/* Task Details Modal */}
      {showModal && selectedTask && (
        <TaskDetailsModal task={selectedTask} onClose={() => setShowModal(false)} />
      )}
      
      {/* Status Update Modal */}
      {showStatusModal && statusUpdateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Update Task Status</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusUpdateData(null);
                }}
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Select new status for task <strong>"{statusUpdateData.taskName}"</strong>
              </p>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="pending"
                    checked={statusUpdateData.newStatus === 'pending'}
                    className="mr-3"
                    onChange={() => handleStatusSelection('pending')}
                  />
                  <span className="text-sm">Pending</span>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="ongoing"
                    checked={statusUpdateData.newStatus === 'ongoing'}
                    className="mr-3"
                    onChange={() => handleStatusSelection('ongoing')}
                  />
                  <span className="text-sm">Ongoing</span>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="completed"
                    checked={statusUpdateData.newStatus === 'completed'}
                    className="mr-3"
                    onChange={() => handleStatusSelection('completed')}
                  />
                  <span className="text-sm">Completed</span>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="delayed"
                    checked={statusUpdateData.newStatus === 'delayed'}
                    className="mr-3"
                    onChange={() => handleStatusSelection('delayed')}
                  />
                  <span className="text-sm">Delayed</span>
                </label>
              </div>

              {/* Status change preview */}
              {statusUpdateData.oldStatus !== statusUpdateData.newStatus && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-3">Status will change from:</p>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                    <span className="text-sm text-gray-600">Current Status:</span>
                    <span className={`badge ${getStatusStyling(statusUpdateData.oldStatus)}`}>
                      {statusUpdateData.oldStatus[0].toUpperCase() + statusUpdateData.oldStatus.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center my-3">
                    <i className="ri-arrow-down-line text-gray-400 text-xl"></i>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">New Status:</span>
                    <span className={`badge ${getStatusStyling(statusUpdateData.newStatus)}`}>
                      {statusUpdateData.newStatus[0].toUpperCase() + statusUpdateData.newStatus.slice(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                className="ti-btn ti-btn-secondary"
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusUpdateData(null);
                }}
                disabled={isUpdatingStatus}
              >
                Cancel
              </button>
              <button
                className="ti-btn ti-btn-primary"
                onClick={confirmStatusUpdate}
                disabled={isUpdatingStatus || statusUpdateData.oldStatus === statusUpdateData.newStatus}
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UDIN Edit Modal */}
      {showUdinModal && selectedTaskForUdin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800 truncate flex-1 mr-6">
                Edit UDIN - {selectedTaskForUdin.activity.name}
              </h2>
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  className="ti-btn ti-btn-primary px-3 py-1.5 text-sm"
                  onClick={() => addUdinEntry(selectedTaskForUdin.frequency)}
                  disabled={isLoadingUdin || 
                    // For Daily, Monthly, Hourly - disable if any entries exist
                    (['Daily', 'Monthly', 'Hourly'].includes(selectedTaskForUdin.frequency) && udinEntries.length > 0) ||
                    // For Weekly, Yearly, Quarterly - disable if no available options
                    (['Weekly', 'Yearly', 'Quarterly'].includes(selectedTaskForUdin.frequency) && 
                     getFieldOptions(selectedTaskForUdin.frequency, selectedTaskForUdin, udinEntries).length === 0)
                  }
                  title={
                    ['Daily', 'Monthly', 'Hourly'].includes(selectedTaskForUdin.frequency) && udinEntries.length > 0
                      ? `${selectedTaskForUdin.frequency} frequency can only have one UDIN entry`
                      : ['Weekly', 'Yearly', 'Quarterly'].includes(selectedTaskForUdin.frequency) && 
                        getFieldOptions(selectedTaskForUdin.frequency, selectedTaskForUdin, udinEntries).length === 0
                      ? `All ${selectedTaskForUdin.frequency === 'Weekly' ? 'days' : selectedTaskForUdin.frequency === 'Yearly' ? 'months' : 'quarters'} already have UDINs assigned`
                      : 'Add new UDIN entry'
                  }
                >
                  <i className="ri-add-line me-1"></i>
                  Add Entry
                </button>
                <button 
                  className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
                  onClick={() => {
                    setShowUdinModal(false);
                    setSelectedTaskForUdin(null);
                    setUdinEntries([]);
                  }}
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingUdin ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : udinEntries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-file-list-line text-2xl text-primary"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No UDIN Entries</h3>
                  {(['Daily', 'Monthly', 'Hourly'].includes(selectedTaskForUdin.frequency) && udinEntries.length > 0) ? (
                    <p className="text-amber-600 mb-4">
                      <i className="ri-information-line mr-1"></i>
                      {selectedTaskForUdin.frequency} frequency can only have one UDIN entry
                    </p>
                  ) : (['Weekly', 'Yearly', 'Quarterly'].includes(selectedTaskForUdin.frequency) && 
                       getFieldOptions(selectedTaskForUdin.frequency, selectedTaskForUdin, udinEntries).length === 0) ? (
                    <p className="text-amber-600 mb-4">
                      <i className="ri-information-line mr-1"></i>
                      All {selectedTaskForUdin.frequency === 'Weekly' ? 'days' : selectedTaskForUdin.frequency === 'Yearly' ? 'months' : 'quarters'} already have UDINs assigned
                    </p>
                  ) : (
                    <p className="text-gray-500 mb-4">Click "Add Entry" to start adding UDIN data</p>
                  )}
                  <button
                    className="ti-btn ti-btn-primary"
                    onClick={() => addUdinEntry(selectedTaskForUdin.frequency)}
                    disabled={
                      // For Daily, Monthly, Hourly - disable if any entries exist
                      (['Daily', 'Monthly', 'Hourly'].includes(selectedTaskForUdin.frequency) && udinEntries.length > 0) ||
                      // For Weekly, Yearly, Quarterly - disable if no available options
                      (['Weekly', 'Yearly', 'Quarterly'].includes(selectedTaskForUdin.frequency) && 
                       getFieldOptions(selectedTaskForUdin.frequency, selectedTaskForUdin, udinEntries).length === 0)
                    }
                    title={
                      ['Daily', 'Monthly', 'Hourly'].includes(selectedTaskForUdin.frequency) && udinEntries.length > 0
                        ? `${selectedTaskForUdin.frequency} frequency can only have one UDIN entry`
                        : ['Weekly', 'Yearly', 'Quarterly'].includes(selectedTaskForUdin.frequency) && 
                          getFieldOptions(selectedTaskForUdin.frequency, selectedTaskForUdin, udinEntries).length === 0
                        ? `All ${selectedTaskForUdin.frequency === 'Weekly' ? 'days' : selectedTaskForUdin.frequency === 'Yearly' ? 'months' : 'quarters'} already have UDINs assigned`
                        : 'Add first UDIN entry'
                    }
                  >
                    <i className="ri-add-line me-2"></i>
                    Add First Entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {udinEntries.map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700">Entry {index + 1}</h4>
                        <button
                          className="ti-btn ti-btn-danger ti-btn-xs"
                          onClick={() => removeUdinEntry(index)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Show field selection only for Weekly, Yearly, Quarterly */}
                        {(entry.frequency === 'Weekly' || entry.frequency === 'Yearly' || entry.frequency === 'Quarterly') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {entry.frequency === 'Weekly' ? 'Day' : entry.frequency === 'Yearly' ? 'Month' : 'Quarter'} <span className="text-red-500">*</span>
                            </label>
                            <select
                              className="form-select"
                              value={entry.fieldName}
                              onChange={(e) => updateUdinEntry(index, 'fieldName', e.target.value)}
                            >
                              <option value="">Select {entry.frequency === 'Weekly' ? 'Day' : entry.frequency === 'Yearly' ? 'Month' : 'Quarter'}</option>
                              {getFieldOptions(entry.frequency, selectedTaskForUdin, udinEntries, index).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {getFieldOptions(entry.frequency, selectedTaskForUdin, udinEntries, index).length === 0 && (
                              <p className="text-sm text-amber-600 mt-1">
                                <i className="ri-information-line mr-1"></i>
                                All {entry.frequency === 'Weekly' ? 'days' : entry.frequency === 'Yearly' ? 'months' : 'quarters'} already have UDINs assigned
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            UDIN <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., UDIN-2024-001234"
                            value={entry.udin}
                            onChange={(e) => updateUdinEntry(index, 'udin', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                className="ti-btn ti-btn-secondary"
                onClick={() => {
                  setShowUdinModal(false);
                  setSelectedTaskForUdin(null);
                  setUdinEntries([]);
                }}
                disabled={isSavingUdin}
              >
                Cancel
              </button>
              <button
                className="ti-btn ti-btn-primary"
                onClick={saveUdinData}
                disabled={isSavingUdin}
              >
                {isSavingUdin ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Function to format UDIN display (moved outside component for reuse)
const formatUdinDisplay = (udin: string | UdinEntry[] | undefined) => {
  if (!udin) return "-";
  if (typeof udin === 'string') return udin;
  if (Array.isArray(udin)) {
    if (udin.length === 0) return "-";
    if (udin.length === 1) return udin[0].udin;
    return `${udin.length} entries`;
  }
  return "-";
};

// Function to get available field options based on frequency and timeline config
const getFieldOptions = (frequency: string, timeline: Timeline, existingEntries: UdinEntry[] = [], currentEntryIndex?: number) => {
  let allOptions: string[] = [];
  
  switch (frequency) {
    case 'Weekly':
      allOptions = timeline.frequencyConfig.weeklyDays || [];
      break;
    case 'Yearly':
      allOptions = timeline.frequencyConfig.yearlyMonth || [];
      break;
    case 'Quarterly':
      allOptions = timeline.frequencyConfig.quarterlyMonths || [];
      break;
    default:
      return [];
  }
  
  // Filter out options that already have UDINs associated with them
  // But include the current entry's fieldName if it exists (for editing)
  const usedOptions = existingEntries
    .filter((entry, index) => 
      entry.frequency === frequency && 
      entry.fieldName && 
      index !== currentEntryIndex // Don't count the current entry as "used"
    )
    .map(entry => entry.fieldName);
  
  return allOptions.filter(option => !usedOptions.includes(option));
};

// Modal for viewing task details
const TaskDetailsModal = ({ task, onClose }: { task: Timeline, onClose: () => void }) => {
  if (!task) return null;

  // Statement with date details
  const startDateStr = task.startDate ? new Date(task.startDate).toLocaleDateString() : null;
  const endDateStr = task.endDate ? new Date(task.endDate).toLocaleDateString() : null;
  
  let statement = `Task for ${task.client.name} regarding ${task.activity.name} is assigned to ${task.assignedMember.name} with status '${task.status}'`;
  
  if (startDateStr && endDateStr) {
    statement += ` from ${startDateStr} continuing until ${endDateStr}`;
  } else if (startDateStr) {
    statement += ` starting from ${startDateStr}`;
  } else if (endDateStr) {
    statement += ` continuing until ${endDateStr}`;
  }
  
  statement += '.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>
          <i className="ri-close-line text-2xl"></i>
        </button>
        <h2 className="text-xl font-bold mb-4">Task Details</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Activity:</strong> {task.activity.name}</div>
          <div><strong>Client Name:</strong> {task.client.name}</div>
          <div><strong>Client Email:</strong> {task.client.email}</div>
          <div><strong>Frequency:</strong> {task.frequency}</div>
          {/* Frequency Configuration Details */}
          <div>
            <strong>Frequency Configuration:</strong>
            {task.frequency === 'Hourly' && (
              <div><strong>Interval:</strong> Every {task.frequencyConfig.hourlyInterval} hour(s)</div>
            )}
            {task.frequency === 'Daily' && (
              <div><strong>Time:</strong> {task.frequencyConfig.dailyTime}</div>
            )}
            {task.frequency === 'Weekly' && (
              <div>
                <div><strong>Days:</strong> {task.frequencyConfig.weeklyDays.join(', ')}</div>
                <div><strong>Time:</strong> {task.frequencyConfig.weeklyTime}</div>
              </div>
            )}
            {task.frequency === 'Monthly' && (
              <div>
                <div><strong>Day:</strong> {task.frequencyConfig.monthlyDay}</div>
                <div><strong>Time:</strong> {task.frequencyConfig.monthlyTime}</div>
              </div>
            )}
            {task.frequency === 'Quarterly' && (
              <div>
                <div><strong>Months:</strong> {task.frequencyConfig.quarterlyMonths.join(', ')}</div>
                <div><strong>Day:</strong> {task.frequencyConfig.quarterlyDay}</div>
                <div><strong>Time:</strong> {task.frequencyConfig.quarterlyTime}</div>
              </div>
            )}
            {task.frequency === 'Yearly' && (
              <div>
                <div><strong>Months:</strong> {task.frequencyConfig.yearlyMonth.join(', ')}</div>
                <div><strong>Date:</strong> {task.frequencyConfig.yearlyDate}</div>
                <div><strong>Time:</strong> {task.frequencyConfig.yearlyTime}</div>
              </div>
            )}
          </div>
          <div><strong>UDIN:</strong> {formatUdinDisplay(task.udin)}</div>
          <div><strong>Turnover:</strong> {task.turnover || '-'}</div>
          <div><strong>Assigned Member:</strong> {task.assignedMember.name}</div>
          <div><strong>Start Date:</strong> {task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '-'}</div>
          <div><strong>End Date:</strong> {task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '-'}</div>
          <div><strong>Status:</strong> {task.status}</div>
        </div>
        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded text-primary text-sm">
          <i className="ri-information-line mr-2"></i>{statement}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;