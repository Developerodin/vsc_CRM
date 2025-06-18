"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

interface Timeline {
  id: string;
  activityName: string;
  clientName: string;
  clientEmail: string;
  frequency: string;
  udin: string;
  turnover: string;
  teamMemberName: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'ongoing' | 'delayed';
}

interface ExcelRow {
  ID?: string;
  "Timeline Name": string;
  "Sort Order": number;
}

const TimelinesPage = () => {
  const [selectedTimelines, setSelectedTimelines] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [timelines, setTimelines] = useState<Timeline[]>([
    {
      id: "1",
      activityName: "Income Tax Filing",
      clientName: "Rajesh Kumar & Associates",
      clientEmail: "rajesh.kumar@rkassociates.com",
      frequency: "Annual",
      udin: "UDIN-2024-001234",
      turnover: "₹2.5 Crores",
      teamMemberName: "Priya Sharma",
      dueDate: "2024-07-31",
      status: 'pending'
    },
    {
      id: "2",
      activityName: "GST Filing",
      clientName: "Mumbai Textiles Ltd",
      clientEmail: "accounts@mumbaitextiles.com",
      frequency: "Monthly",
      udin: "UDIN-2024-005678",
      turnover: "₹8.7 Crores",
      teamMemberName: "Amit Patel",
      dueDate: "2024-06-20",
      status: 'completed'
    },
    {
      id: "3",
      activityName: "ROC/LLP Filing",
      clientName: "Delhi Software Solutions LLP",
      clientEmail: "compliance@delhisoftware.com",
      frequency: "Quarterly",
      udin: "UDIN-2024-009012",
      turnover: "₹1.2 Crores",
      teamMemberName: "Neha Gupta",
      dueDate: "2024-08-15",
      status: 'ongoing'
    },
    {
      id: "4",
      activityName: "Corporate Audit",
      clientName: "Chennai Manufacturing Co.",
      clientEmail: "finance@chennaimanufacturing.com",
      frequency: "Annual",
      udin: "UDIN-2024-003456",
      turnover: "₹15.3 Crores",
      teamMemberName: "Rahul Verma",
      dueDate: "2024-09-30",
      status: 'delayed'
    },
    {
      id: "5",
      activityName: "GST Filing",
      clientName: "Bangalore IT Services Pvt Ltd",
      clientEmail: "tax@bangaloreit.com",
      frequency: "Monthly",
      udin: "UDIN-2024-007890",
      turnover: "₹4.8 Crores",
      teamMemberName: "Sneha Reddy",
      dueDate: "2024-06-20",
      status: 'pending'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false); // Start with false since we have dummy data
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(5); // Match dummy data count
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    name: ""
  });

  const fetchTimelines = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call for timelines (since timeline API is not ready)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use dummy data for now
      setTimelines([
        {
          id: "1",
          activityName: "Income Tax Filing",
          clientName: "Rajesh Kumar & Associates",
          clientEmail: "rajesh.kumar@rkassociates.com",
          frequency: "Annual",
          udin: "UDIN-2024-001234",
          turnover: "₹2.5 Crores",
          teamMemberName: "Priya Sharma",
          dueDate: "2024-07-31",
          status: 'pending'
        },
        {
          id: "2",
          activityName: "GST Filing",
          clientName: "Mumbai Textiles Ltd",
          clientEmail: "accounts@mumbaitextiles.com",
          frequency: "Monthly",
          udin: "UDIN-2024-005678",
          turnover: "₹8.7 Crores",
          teamMemberName: "Amit Patel",
          dueDate: "2024-06-20",
          status: 'completed'
        },
        {
          id: "3",
          activityName: "ROC/LLP Filing",
          clientName: "Delhi Software Solutions LLP",
          clientEmail: "compliance@delhisoftware.com",
          frequency: "Quarterly",
          udin: "UDIN-2024-009012",
          turnover: "₹1.2 Crores",
          teamMemberName: "Neha Gupta",
          dueDate: "2024-08-15",
          status: 'ongoing'
        },
        {
          id: "4",
          activityName: "Corporate Audit",
          clientName: "Chennai Manufacturing Co.",
          clientEmail: "finance@chennaimanufacturing.com",
          frequency: "Annual",
          udin: "UDIN-2024-003456",
          turnover: "₹15.3 Crores",
          teamMemberName: "Rahul Verma",
          dueDate: "2024-09-30",
          status: 'delayed'
        },
        {
          id: "5",
          activityName: "GST Filing",
          clientName: "Bangalore IT Services Pvt Ltd",
          clientEmail: "tax@bangaloreit.com",
          frequency: "Monthly",
          udin: "UDIN-2024-007890",
          turnover: "₹4.8 Crores",
          teamMemberName: "Sneha Reddy",
          dueDate: "2024-06-20",
          status: 'pending'
        }
      ]);
      setTotalPages(1);
      setTotalResults(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timelines');
      toast.error('Failed to fetch timelines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelines(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTimelines(timelines.map(timeline => timeline.id));
    } else {
      setSelectedTimelines([]);
    }
  };

  const handleSelectTimeline = (timelineId: string) => {
    setSelectedTimelines(prev =>
      prev.includes(timelineId)
        ? prev.filter(id => id !== timelineId)
        : [...prev, timelineId]
    );
  };

  const handleDelete = async (timelineId: string) => {
    if (!confirm('Are you sure you want to delete this timeline?')) return;

    try {
      // Simulate API call for timeline deletion (since timeline API is not ready)
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Timeline deleted successfully');
      fetchTimelines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete timeline');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected timelines?')) return;

    try {
      // Simulate API call for bulk timeline deletion (since timeline API is not ready)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Selected timelines deleted successfully');
      setSelectedTimelines([]);
      fetchTimelines();
    } catch (err) {
      toast.error('Failed to delete some timelines');
    }
  };

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
      <Seo title="Timelines" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Timelines</h1>
              <div className="box-tools flex items-center space-x-2">
              {selectedTimelines.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedTimelines.length})
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                //   onChange={handleImport}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ti-btn ti-btn-success"
                >
                  <i className="ri-download-2-line me-2"></i>
                  Import
                </button>
                {importProgress !== null && (
                  <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                    <span className="ml-2 text-xs text-gray-700">
                      {importProgress}%
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                //   onClick={handleExport}
                >
                  <i className="ri-upload-2-line me-2"></i> Export
                </button>
                <Link
                  href="/timelines/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i>
                  Add New Timeline
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Status Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Pending Card */}
                <div 
                  className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
                  onClick={() => console.log('filtering by pending')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-warning">Pending</span>
                      <p className="text-2xl font-bold text-warning">
                        {timelines.filter(t => t.status === 'pending').length}
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
                  onClick={() => console.log('filtering by ongoing')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-primary">Ongoing</span>
                      <p className="text-2xl font-bold text-primary">
                        {timelines.filter(t => t.status === 'ongoing').length}
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
                  onClick={() => console.log('filtering by completed')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-success">Completed</span>
                      <p className="text-2xl font-bold text-success">
                        {timelines.filter(t => t.status === 'completed').length}
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
                  onClick={() => console.log('filtering by delayed')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-danger">Delayed</span>
                      <p className="text-2xl font-bold text-danger">
                        {timelines.filter(t => t.status === 'delayed').length}
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
                  {/* Search bar */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full"
                      placeholder="Search by name..."
                      value={filters.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters(prev => ({
                          ...prev,
                          name: value
                        }));
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Sort dropdown */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name:asc">Name (A-Z)</option>
                    <option value="name:desc">Name (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="sortOrder:asc">Sort Order (Low-High)</option>
                    <option value="sortOrder:desc">Sort Order (High-Low)</option>
                  </select>

                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setFilters({
                        name: ""
                      });
                      setSortBy("name:asc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Import Progress */}
              {/* {importProgress > 0 && importProgress < 100 && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span>Importing...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              )} */}

              {/* Timelines Table */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap table-bordered">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedTimelines.length === timelines.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Client Email</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">UDIN</th>
                      <th className="px-4 py-3">Turnover</th>
                      <th className="px-4 py-3">Assigned Member</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
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
                    ) : timelines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          No timelines found
                        </td>
                      </tr>
                    ) : (
                      timelines.map((timeline) => (
                        <tr key={timeline.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedTimelines.includes(timeline.id)}
                              onChange={() => handleSelectTimeline(timeline.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td>{timeline.activityName}</td>
                          <td>{timeline.clientName}</td>
                          <td>{timeline.clientEmail}</td>
                          <td>{timeline.frequency}</td>
                          <td>{timeline.udin || "-"}</td>
                          <td>{timeline.turnover || "-"}</td>
                          <td>{timeline.teamMemberName || "-"}</td>
                          <td>{timeline.dueDate ? new Date(timeline.dueDate).toLocaleString() : "-"}</td>
                          <td>
                            <span className={`badge ${
                              timeline.status === 'completed' ? 'bg-success' :
                              timeline.status === 'ongoing' ? 'bg-primary' :
                              timeline.status === 'delayed' ? 'bg-danger' :
                              'bg-warning'
                            }`}>
                              {timeline.status.charAt(0).toUpperCase() + timeline.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <div className="flex space-x-2">
                              <Link
                                href={`/timelines/edit/${timeline.id}`}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDelete(timeline.id)}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinesPage;