"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

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
  udin?: string;
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

      const response = await fetch(`${Base_url}timelines?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data: ApiResponse = await response.json();
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
                          <td>{timeline.udin || "-"}</td>
                          <td>{timeline.turnover || "-"}</td>
                          <td>{timeline.assignedMember.name}</td>
                          <td>{timeline.startDate ? new Date(timeline.startDate).toISOString().split('T')[0] : "-"}</td>
                          <td>{timeline.endDate ? new Date(timeline.endDate).toISOString().split('T')[0] : "-"}</td>
                          <td>
                            <span className={`badge ${
                              timeline.status === 'completed' ? 'bg-success' :
                              timeline.status === 'ongoing' ? 'bg-primary' :
                              timeline.status === 'delayed' ? 'bg-danger' :
                              'bg-warning'
                            }`}>
                              {timeline.status[0].toUpperCase() + timeline.status.slice(1)}
                            </span>
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
      {showModal && selectedTask && (
        <TaskDetailsModal task={selectedTask} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
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
          <div><strong>UDIN:</strong> {task.udin || '-'}</div>
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