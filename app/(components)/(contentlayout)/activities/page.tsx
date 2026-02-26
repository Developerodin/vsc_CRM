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

  const hasActiveFilters = !!filters.name;

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Activities" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Activities</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedActivities.length > 0 && (
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" onClick={handleDeleteSelected}>
                    <i className="ri-delete-bin-line text-xs" /> Delete Selected ({selectedActivities.length})
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                  <i className="ri-download-2-line text-xs" /> Import
                </button>
                {importProgress !== null && (
                  <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                    <div className="bg-purple-600 h-full transition-all duration-200" style={{ width: `${importProgress}%` }} />
                    <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                  </div>
                )}
                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm" onClick={handleExport}>
                  <i className="ri-upload-2-line text-xs" /> Export
                </button>
                <Link href="/activities/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                  <i className="ri-add-line text-xs" /> Add New Activity
                </Link>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700">Total Activities</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{totalResults}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-stack-line text-purple-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">On this page</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{activities.length}</p>
                </div>
                <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center">
                  <i className="ri-file-list-3-line text-sky-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700">Selected</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedActivities.length}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-amber-600 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Box – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
            <div className="p-[10px]">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
                  <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <input type="text" className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium w-full sm:max-w-[200px]" placeholder="Search by name..." value={filters.name} onChange={(e) => { setFilters(prev => ({ ...prev, name: e.target.value })); setCurrentPage(1); }} />
                  <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 w-full sm:w-auto min-w-[100px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name:asc">Name (A-Z)</option>
                    <option value="name:desc">Name (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="sortOrder:asc">Sort Order (Low-High)</option>
                    <option value="sortOrder:desc">Sort Order (High-Low)</option>
                  </select>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100" onClick={() => { setFilters({ name: "" }); setSortBy("name:asc"); }}>
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-sky-700">Active filter: Name — {filters.name}</span>
                    <button onClick={() => { setFilters({ name: "" }); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800"><i className="ri-close-line text-xs" /> Clear</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[200px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedActivities.length === activities.length && activities.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Activity Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Sub-Activities</th>
                      <th className="pl-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                            <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase">Loading</p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
                      </tr>
                    ) : activities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-stack-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO ACTIVITIES</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No activities match your filter." : "Start by adding your first activity."}</p>
                            {hasActiveFilters ? (
                              <button onClick={() => { setFilters({ name: "" }); setCurrentPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-refresh-line text-xs" /> Clear Filter</button>
                            ) : (
                              <Link href="/activities/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-add-line text-xs" /> Add First Activity</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50/50 group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedActivities.includes(activity.id)} onChange={() => handleSelectActivity(activity.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{activity.name}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            {activity.subactivities && activity.subactivities.length > 0 ? (
                              <button type="button" onClick={() => handleSubActivitiesClick(activity)} className="text-[12px] font-medium text-purple-600 hover:text-purple-700 cursor-pointer">
                                {activity.subactivities.length} sub-activit{activity.subactivities.length === 1 ? "y" : "ies"}
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400">No sub-activities</span>
                            )}
                          </td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <Link href={`/activities/edit/${activity.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit"><i className="ri-pencil-line text-sm" /></Link>
                              <button type="button" onClick={() => handleDelete(activity.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && activities.length > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-4 p-[10px] pt-4 border-t border-gray-100">
                  <div className="text-[11px] font-medium text-[#495057]">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                  </div>
                  <nav className="flex flex-wrap items-center gap-1">
                    <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                    {getPagination(currentPage, totalPages).map((page, idx) =>
                      page === "..." ? (
                        <span key={"e-" + idx} className="px-2 text-[10px] text-gray-300">...</span>
                      ) : (
                        <button key={page} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === page ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`} onClick={() => setCurrentPage(Number(page))}>{page}</button>
                      )
                    )}
                    <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Activities Drawer – timelines-style */}
      {showSubActivitiesModal && selectedActivity && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowSubActivitiesModal(false)} aria-hidden />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Sub-Activities: {selectedActivity.name}</h3>
              <button type="button" onClick={() => setShowSubActivitiesModal(false)} className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"><i className="ri-close-line text-lg" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {selectedActivity.subactivities && selectedActivity.subactivities.length > 0 ? (
                selectedActivity.subactivities.map((subActivity, index) => (
                  <div key={subActivity._id || index} className="border border-gray-200 rounded p-3 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-[12px] font-bold text-[#323251]">{subActivity.name}</h4>
                      {subActivity.frequency && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">{subActivity.frequency}</span>}
                    </div>
                    {subActivity.frequency && subActivity.frequencyConfig && (
                      <div className="text-[11px] text-[#495057]">
                        {(() => {
                          const { frequency, frequencyConfig } = subActivity;
                          switch (frequency) {
                            case 'Hourly': return `Every ${frequencyConfig.hourlyInterval} hour(s)`;
                            case 'Daily': return `Daily at ${frequencyConfig.dailyTime || '—'}`;
                            case 'Weekly': return `Weekly on ${frequencyConfig.weeklyDays?.join(', ') || '—'} at ${frequencyConfig.weeklyTime || '—'}`;
                            case 'Monthly': return `Monthly day ${frequencyConfig.monthlyDay} at ${frequencyConfig.monthlyTime || '—'}`;
                            case 'Quarterly': return `Quarterly ${frequencyConfig.quarterlyMonths?.join(', ')}`;
                            case 'Yearly': return `Yearly ${frequencyConfig.yearlyDate} ${frequencyConfig.yearlyMonth}`;
                            default: return 'Configured';
                          }
                        })()}
                      </div>
                    )}
                    {(!subActivity.frequency || !subActivity.frequencyConfig) && <div className="text-[11px] text-gray-500 italic">No frequency</div>}
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-6">No sub-activities for this activity.</p>
              )}
            </div>
            <div className="p-[10px] border-t border-gray-200">
              <button type="button" onClick={() => setShowSubActivitiesModal(false)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivitiesPage;
