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
  subactivities?: Array<{ 
    _id: string;
    name: string;
    frequency?: string;
    frequencyConfig?: any;
    fields?: Array<{
      _id: string;
      name: string;
      type: string;
      required?: boolean;
      options?: string[];
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
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
  "Frequency": string;
  "Sub-Activities"?: string;
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
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    name: ""
  });
  const [showSubActivitiesModal, setShowSubActivitiesModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const fetchActivities = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
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
    fetchActivities(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

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

  const handleSubActivitiesClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowSubActivitiesModal(true);
  };

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedActivities.length > 0) {
        exportData = activities
          .filter(activity => selectedActivities.includes(activity.id))
          .map((activity: Activity) => {
            // Helper to get subactivity ID (check both _id and id)
            const getSubActivityIds = () => {
              if (!activity.subactivities || activity.subactivities.length === 0) {
                return 'None';
              }
              return activity.subactivities
                .map(sub => {
                  // Try _id first, then id, then return empty string if neither exists
                  const subId = (sub as any)._id || (sub as any).id || '';
                  return subId;
                })
                .filter(id => id !== '') // Remove empty IDs
                .join(', ') || 'None';
            };

            console.log(`Exporting activity "${activity.name}":`, {
              subactivities: activity.subactivities,
              subactivityIds: getSubActivityIds()
            });

            return {
              ID: activity.id,
              "Activity Name": activity.name,
              "Sort Order": activity.sortOrder,
              "Frequency": activity.subactivities && activity.subactivities.length > 0 ? 
                activity.subactivities.map(sub => `${sub.name} (${sub.frequency || 'No frequency'})`).join(', ') : 'No sub-activities',
              "Sub-Activities": activity.subactivities && activity.subactivities.length > 0 ? activity.subactivities.map(sub => sub.name).join(', ') : 'None',
              "Sub-Activity IDs": getSubActivityIds()
            };
          });
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
        console.log('API Data for export:', apiData.results);
        
        exportData = apiData.results.map((activity: Activity) => {
          // Helper to get subactivity ID (check both _id and id)
          const getSubActivityIds = () => {
            if (!activity.subactivities || activity.subactivities.length === 0) {
              return 'None';
            }
            return activity.subactivities
              .map(sub => {
                // Try _id first, then id, then return empty string if neither exists
                const subId = (sub as any)._id || (sub as any).id || '';
                return subId;
              })
              .filter(id => id !== '') // Remove empty IDs
              .join(', ') || 'None';
          };

          console.log(`Exporting activity "${activity.name}":`, {
            subactivities: activity.subactivities,
            subactivityIds: getSubActivityIds(),
            firstSubactivity: activity.subactivities?.[0]
          });

          return {
            ID: activity.id,
            "Activity Name": activity.name,
            "Sort Order": activity.sortOrder,
            "Frequency": activity.subactivities && activity.subactivities.length > 0 ? 
              activity.subactivities.map(sub => `${sub.name} (${sub.frequency || 'No frequency'})`).join(', ') : 'No sub-activities',
            "Sub-Activities": activity.subactivities && activity.subactivities.length > 0 ? activity.subactivities.map(sub => sub.name).join(', ') : 'None',
            "Sub-Activity IDs": getSubActivityIds()
          };
        });
        successMessage = "All activities exported successfully";
      }

      console.log('Final export data:', exportData);

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Activity Name
        { wch: 15 }, // Sort Order
        { wch: 20 }, // Frequency
        { wch: 40 }, // Sub-Activities
        { wch: 40 }, // Sub-Activity IDs
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

        // Transform data for bulk import
        const activities = jsonData.map((row: ExcelRow) => ({
          id: row["ID"] || undefined, // Only include if exists
          name: row["Activity Name"],
          sortOrder: row["Sort Order"] || 1,
          subactivities: row["Sub-Activities"] ? 
            row["Sub-Activities"].split(',').map((name: string) => ({ name: name.trim() })).filter((item: { name: string }) => item.name !== 'None' && item.name !== '') : 
            []
        }));

        // Single API call instead of multiple requests
        const response = await fetch(`${Base_url}activities/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ activities })
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

        fetchActivities(); // Refresh the list
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


  // Helper function to format frequency display for sub-activities
  const formatFrequencyDisplay = (activity: Activity) => {
    if (!activity.subactivities || activity.subactivities.length === 0) {
      return 'No sub-activities';
    }

    // Get all sub-activities with frequency
    const subActivitiesWithFrequency = activity.subactivities.filter(sub => sub.frequency && sub.frequencyConfig);
    
    if (subActivitiesWithFrequency.length === 0) {
      return 'No frequency set';
    }

    // Format each sub-activity's frequency
    const frequencyDisplays = subActivitiesWithFrequency.map(sub => {
      const { frequency, frequencyConfig } = sub;
      
      switch (frequency) {
        case 'Hourly':
          return `${sub.name}: Every ${frequencyConfig.hourlyInterval} hour${frequencyConfig.hourlyInterval > 1 ? 's' : ''}`;
        
        case 'Daily':
          return `${sub.name}: Daily at ${frequencyConfig.dailyTime || 'specified time'}`;
        
        case 'Weekly':
          const days = frequencyConfig.weeklyDays?.length > 0 
            ? frequencyConfig.weeklyDays.join(', ') 
            : 'specified days';
          const time = frequencyConfig.weeklyTime || 'specified time';
          return `${sub.name}: Weekly on ${days} at ${time}`;
        
        case 'Monthly':
          const day = frequencyConfig.monthlyDay || 'specified day';
          const monthTime = frequencyConfig.monthlyTime || 'specified time';
          return `${sub.name}: Monthly on day ${day} at ${monthTime}`;
        
        case 'Quarterly':
          const months = frequencyConfig.quarterlyMonths?.length > 0 
            ? frequencyConfig.quarterlyMonths.join(', ') 
            : 'specified months';
          const quarterDay = frequencyConfig.quarterlyDay || 'specified day';
          const quarterTime = frequencyConfig.quarterlyTime || 'specified time';
          return `${sub.name}: Quarterly on day ${quarterDay} of ${months} at ${quarterTime}`;
        
        case 'Yearly':
          const yearMonth = frequencyConfig.yearlyMonth || 'specified month';
          const yearDate = frequencyConfig.yearlyDate || 'specified date';
          const yearTime = frequencyConfig.yearlyTime || 'specified time';
          return `${sub.name}: Yearly on ${yearDate} ${yearMonth} at ${yearTime}`;
        
        default:
          return `${sub.name}: Frequency configured`;
      }
    });

    // Return multiple lines if there are multiple sub-activities with frequency
    if (frequencyDisplays.length === 1) {
      return frequencyDisplays[0];
    } else {
      return frequencyDisplays.join(' | ');
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
                  onClick={handleExport}
                >
                  <i className="ri-upload-2-line me-2"></i> Export
                </button>
                <Link
                  href="/activities/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i>
                  Add New Activity
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

              {/* Activities Table */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap table-bordered">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedActivities.length === activities.length && activities.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">Activity Name</th>
                      <th className="px-4 py-3">Sub-Activities</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="text-center text-red-500 py-4">
                          {error}
                        </td>
                      </tr>
                    ) : activities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          No activities found
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={selectedActivities.includes(activity.id)}
                              onChange={() => handleSelectActivity(activity.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {activity.name}
                          </td>
                          <td className="px-4 py-3">
                            {activity.subactivities && activity.subactivities.length > 0 ? (
                              <button
                                onClick={() => handleSubActivitiesClick(activity)}
                                className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
                              >
                                {activity.subactivities.length} sub-activit{activity.subactivities.length === 1 ? 'y' : 'ies'}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">No sub-activities</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
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

      {/* Sub-Activities Modal */}
      {showSubActivitiesModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Sub-Activities: {selectedActivity.name}
              </h3>
              <button
                onClick={() => setShowSubActivitiesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedActivity.subactivities && selectedActivity.subactivities.length > 0 ? (
                <div className="space-y-4">
                  {selectedActivity.subactivities.map((subActivity, index) => (
                    <div key={subActivity._id || index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-lg">
                          {subActivity.name}
                        </h4>
                        {subActivity.frequency && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {subActivity.frequency}
                          </span>
                        )}
                      </div>
                      
                      {subActivity.frequency && subActivity.frequencyConfig && (
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const { frequency, frequencyConfig } = subActivity;
                            switch (frequency) {
                              case 'Hourly':
                                return `Every ${frequencyConfig.hourlyInterval} hour${frequencyConfig.hourlyInterval > 1 ? 's' : ''}`;
                              case 'Daily':
                                return `Daily at ${frequencyConfig.dailyTime || 'specified time'}`;
                              case 'Weekly':
                                const days = frequencyConfig.weeklyDays?.length > 0 
                                  ? frequencyConfig.weeklyDays.join(', ') 
                                  : 'specified days';
                                const time = frequencyConfig.weeklyTime || 'specified time';
                                return `Weekly on ${days} at ${time}`;
                              case 'Monthly':
                                const day = frequencyConfig.monthlyDay || 'specified day';
                                const monthTime = frequencyConfig.monthlyTime || 'specified time';
                                return `Monthly on day ${day} at ${monthTime}`;
                              case 'Quarterly':
                                const months = frequencyConfig.quarterlyMonths?.length > 0 
                                  ? frequencyConfig.quarterlyMonths.join(', ') 
                                  : 'specified months';
                                const quarterDay = frequencyConfig.quarterlyDay || 'specified day';
                                const quarterTime = frequencyConfig.quarterlyTime || 'specified time';
                                return `Quarterly on day ${quarterDay} of ${months} at ${quarterTime}`;
                              case 'Yearly':
                                const yearMonth = frequencyConfig.yearlyMonth || 'specified month';
                                const yearDate = frequencyConfig.yearlyDate || 'specified date';
                                const yearTime = frequencyConfig.yearlyTime || 'specified time';
                                return `Yearly on ${yearDate} ${yearMonth} at ${yearTime}`;
                              default:
                                return 'Frequency configured';
                            }
                          })()}
                        </div>
                      )}
                      
                      {(!subActivity.frequency || !subActivity.frequencyConfig) && (
                        <div className="text-sm text-gray-500 italic">
                          No frequency configured
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No sub-activities found for this activity.
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowSubActivitiesModal(false)}
                className="ti-btn ti-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
