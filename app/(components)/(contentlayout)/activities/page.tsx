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
  ID?: string;
  "Activity Name": string;
  "Sort Order": number;
}

const ActivitiesPage = () => {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    name: ""
  });

  const fetchActivities = async () => {
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
  }, [currentPage, itemsPerPage, filters, sortBy]);

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

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedActivities.length > 0) {
        exportData = activities
          .filter(activity => selectedActivities.includes(activity.id))
          .map((activity: Activity) => ({
            ID: activity.id,
            "Activity Name": activity.name,
            "Sort Order": activity.sortOrder
          }));
        successMessage = "Selected activities exported successfully";
      } else {
        const response = await fetch(`${Base_url}activities?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activities for export');
        }

        const apiData: ApiResponse = await response.json();
        exportData = apiData.results.map((activity: Activity) => ({
          ID: activity.id,
          "Activity Name": activity.name,
          "Sort Order": activity.sortOrder
        }));
        successMessage = "All activities exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Activity Name
        { wch: 15 }, // Sort Order
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Activities");
      const fileName = `activities_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting activities:", error);
      toast.error("Failed to export activities");
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

          setImportProgress(0);
          const total = jsonData.length;
          let completed = 0;
          let updated = 0;
          let added = 0;

          for (const row of jsonData) {
            try {
              const activityData = {
                name: row["Activity Name"],
                sortOrder: row["Sort Order"] || 1
              };

              if (row["ID"]) {
                // Update existing activity
                const response = await fetch(`${Base_url}activities/${row["ID"]}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(activityData)
                });

                if (!response.ok) {
                  throw new Error(`Failed to update activity: ${row["Activity Name"]}`);
                }
                updated++;
              } else {
                // Add new activity
                const response = await fetch(`${Base_url}activities`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(activityData)
                });

                if (!response.ok) {
                  throw new Error(`Failed to add activity: ${row["Activity Name"]}`);
                }
                added++;
              }

              completed++;
              setImportProgress(Math.round((completed / total) * 100));
            } catch (err) {
              console.error('Error processing row:', err);
              toast.error(`Failed to process: ${row["Activity Name"]}`);
            }
          }

          toast.success(`Import completed: ${added} added, ${updated} updated`);
          fetchActivities();
        } catch (err) {
          console.error('Error processing file:', err);
          toast.error('Failed to process file');
        } finally {
          setImportProgress(null);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error reading file:', err);
      toast.error('Failed to read file');
    }
  };

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
                {/* Import/Export Buttons */}
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-success"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ri-upload-2-line me-2"></i> Import
                  </button>
                </div>
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
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link
                  href="/activities/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i> Add New Activity
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
              <div className="flex justify-between items-center mt-4">
                <div>
                  Showing {activities.length} of {totalResults} activities
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="ti-btn ti-btn-primary"
                  >
                    Previous
                  </button>
                  <span className="flex items-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ti-btn ti-btn-primary"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;
