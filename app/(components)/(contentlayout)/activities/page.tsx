"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

interface Activity {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Activity[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  "Activity Name": string;
  "Sort Order": number;
}

const ActivitiesPage = () => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    name: ""
  });

  const fetchActivities = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...filters,
        ...(sortBy && { sortBy })
      });

      const response = await fetch(`${Base_url}activities?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data: ApiResponse = await response.json();
      setActivities(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      toast.error('Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [currentPage, sortBy]);

  useEffect(() => {
    fetchActivities(currentPage, itemsPerPage);
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedActivities(activities.map(activity => activity.id));
    } else {
      setSelectedActivities([]);
    }
  };

  const handleSelectActivity = (activityId: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const response = await fetch(`${Base_url}activities/${activityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      toast.success('Activity deleted successfully');
      fetchActivities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected activities?')) return;

    try {
      await Promise.all(
        selectedActivities.map(activityId =>
          fetch(`${Base_url}activities/${activityId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        )
      );

      toast.success('Selected activities deleted successfully');
      setSelectedActivities([]);
      fetchActivities();
    } catch (err) {
      toast.error('Failed to delete some activities');
    }
  };

  const handleExport = () => {
    const exportData = activities.map(activity => ({
      "Activity Name": activity.name,
      "Sort Order": activity.sortOrder
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities");
    XLSX.writeFile(wb, "activities.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        setImportProgress(0);
        const total = jsonData.length;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          try {
            const response = await fetch(`${Base_url}activities`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                name: row["Activity Name"],
                sortOrder: row["Sort Order"] || 1
              })
            });

            if (!response.ok) {
              throw new Error(`Failed to import row ${i + 1}`);
            }

            setImportProgress(((i + 1) / total) * 100);
          } catch (err) {
            console.error(`Error importing row ${i + 1}:`, err);
          }
        }

        toast.success('Import completed');
        fetchActivities();
      } catch (err) {
        toast.error('Failed to import activities');
      }
    };

    reader.readAsBinaryString(file);
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
      <Seo title="Activities" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Activities</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedActivities.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedActivities.length})
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-upload-2-line me-2"></i> Import
                </button>
                <button
                  onClick={handleExport}
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link
                  href="/activities/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i> Add Activity
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
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
                      setSortBy("createdAt:desc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Import Progress */}
              {importProgress > 0 && importProgress < 100 && (
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
              )}

              {/* Activities Table */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap table-bordered">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedActivities.length === activities.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Created At</th>
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
                    ) : activities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          No activities found
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <tr key={activity.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedActivities.includes(activity.id)}
                              onChange={() => handleSelectActivity(activity.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td>{activity.name}</td>
                          <td>{new Date(activity.createdAt).toLocaleString()}</td>
                          <td>
                            <div className="flex space-x-2">
                              <Link
                                href={`/activities/edit/${activity.id}`}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDelete(activity.id)}
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

export default ActivitiesPage;
