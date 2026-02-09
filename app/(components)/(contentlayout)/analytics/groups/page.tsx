"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Group {
  groupId: string;
  groupName: string;
  branch: {
    _id: string;
    name: string;
  };
  numberOfClients: number;
  taskStatus: {
    total: number;
    pending: number;
    ongoing: number;
    completed: number;
    on_hold: number;
    cancelled: number;
    delayed: number;
  };
  timelineStatus: {
    total: number;
    pending: number;
    ongoing: number;
    completed: number;
    delayed: number;
  };
}

interface GroupsAnalyticsResponse {
  totalGroups: number;
  totalClients: number;
  groups: Group[];
  summary: {
    taskStatus: {
      total: number;
      pending: number;
      ongoing: number;
      completed: number;
      on_hold: number;
      cancelled: number;
      delayed: number;
    };
    timelineStatus: {
      total: number;
      pending: number;
      ongoing: number;
      completed: number;
      delayed: number;
    };
  };
}

const AnalyticsGroupsPage = () => {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [summary, setSummary] = useState<GroupsAnalyticsResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    branch: ""
  });
  const [isSearching, setIsSearching] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      
      if (debouncedSearchQuery) {
        queryParams.append('search', debouncedSearchQuery);
      }
      if (filters.name && !debouncedSearchQuery) {
        queryParams.append('name', filters.name);
      }
      if (filters.branch) {
        queryParams.append('branch', filters.branch);
      }

      const url = `${Base_url}groups/analytics${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data) {
        const data: GroupsAnalyticsResponse = response.data;
        setGroups(data.groups || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      toast.error('Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${Base_url}branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data?.data) {
        setBranches(response.data.data);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery !== undefined) {
      fetchGroups();
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchGroups();
  }, [filters]);

  const handleExport = async () => {
    try {
      const exportData = groups.map((group: Group) => ({
        "Group ID": group.groupId,
        "Group Name": group.groupName,
        "Branch": group.branch?.name || "",
        "Number of Clients": group.numberOfClients || 0,
        "Total Tasks": group.taskStatus?.total || 0,
        "Pending Tasks": group.taskStatus?.pending || 0,
        "Ongoing Tasks": group.taskStatus?.ongoing || 0,
        "Completed Tasks": group.taskStatus?.completed || 0,
        "On Hold Tasks": group.taskStatus?.on_hold || 0,
        "Delayed Tasks": group.taskStatus?.delayed || 0,
        "Cancelled Tasks": group.taskStatus?.cancelled || 0,
        "Total Timelines": group.timelineStatus?.total || 0,
        "Pending Timelines": group.timelineStatus?.pending || 0,
        "Ongoing Timelines": group.timelineStatus?.ongoing || 0,
        "Completed Timelines": group.timelineStatus?.completed || 0,
        "Delayed Timelines": group.timelineStatus?.delayed || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws["!cols"] = [
        { wch: 25 }, // Group ID
        { wch: 30 }, // Group Name
        { wch: 25 }, // Branch
        { wch: 18 }, // Number of Clients
        { wch: 15 }, // Total Tasks
        { wch: 15 }, // Pending Tasks
        { wch: 15 }, // Ongoing Tasks
        { wch: 15 }, // Completed Tasks
        { wch: 15 }, // On Hold Tasks
        { wch: 15 }, // Delayed Tasks
        { wch: 15 }, // Cancelled Tasks
        { wch: 15 }, // Total Timelines
        { wch: 18 }, // Pending Timelines
        { wch: 18 }, // Ongoing Timelines
        { wch: 18 }, // Completed Timelines
        { wch: 18 }, // Delayed Timelines
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Analytics Groups");
      const fileName = `analytics_groups_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Analytics groups data exported successfully");
    } catch (error) {
      toast.error("Failed to export analytics groups");
    }
  };

  const renderTaskStatus = (taskStatus: Group['taskStatus']) => {
    if (!taskStatus || taskStatus.total === 0) {
      return (
        <div className="text-center text-gray-400 text-xs">
          <i className="ri-task-line mr-1"></i>
          No tasks
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total: {taskStatus.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {taskStatus.pending > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
              {taskStatus.pending} Pending
            </span>
          )}
          {taskStatus.ongoing > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
              {taskStatus.ongoing} Ongoing
            </span>
          )}
          {taskStatus.completed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
              {taskStatus.completed} Completed
            </span>
          )}
          {taskStatus.on_hold > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {taskStatus.on_hold} On Hold
            </span>
          )}
          {taskStatus.delayed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black">
              {taskStatus.delayed} Delayed
            </span>
          )}
          {taskStatus.cancelled > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {taskStatus.cancelled} Cancelled
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTimelineStatus = (timelineStatus: Group['timelineStatus']) => {
    if (!timelineStatus || timelineStatus.total === 0) {
      return (
        <div className="text-center text-gray-400 text-xs">
          <i className="ri-time-line mr-1"></i>
          No timelines
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total: {timelineStatus.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {timelineStatus.pending > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
              {timelineStatus.pending} Pending
            </span>
          )}
          {timelineStatus.ongoing > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
              {timelineStatus.ongoing} Ongoing
            </span>
          )}
          {timelineStatus.completed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
              {timelineStatus.completed} Completed
            </span>
          )}
          {timelineStatus.delayed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black">
              {timelineStatus.delayed} Delayed
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Analytics - Groups Overview" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Groups Overview</h1>
                <p className="text-gray-600 mt-1">Comprehensive view of all groups with analytics data</p>
              </div>
              <div className="box-tools flex items-center space-x-2">
                <Link href="/analytics" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i>
                  Back to Analytics
                </Link>
                <button
                  onClick={handleExport}
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-upload-2-line me-2"></i> Export
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Groups</p>
                    <p className="text-3xl font-bold">{groups.length}</p>
                  </div>
                  <i className="ri-group-line text-3xl text-blue-200"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Clients</p>
                    <p className="text-3xl font-bold">{groups.reduce((sum, g) => sum + (g.numberOfClients || 0), 0)}</p>
                  </div>
                  <i className="ri-user-line text-3xl text-green-200"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Tasks</p>
                    <p className="text-3xl font-bold">{summary.taskStatus?.total || 0}</p>
                  </div>
                  <i className="ri-task-line text-3xl text-purple-200"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Total Timelines</p>
                    <p className="text-3xl font-bold">{summary.timelineStatus?.total || 0}</p>
                  </div>
                  <i className="ri-time-line text-3xl text-orange-200"></i>
                </div>
              </div>
            </div>
          )}

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search and Reset */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                {/* Search bar with Reset button */}
                <div className="relative flex-grow sm:max-w-xs">
                  <input
                    type="text"
                    className="form-control py-2 w-full pl-10 pr-4"
                    placeholder="Search groups by name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <i className="ri-search-line text-gray-400"></i>
                    )}
                  </div>
                  {searchQuery && (
                    <button
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>

                {/* Reset button */}
                <button
                  className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                  onClick={() => {
                    setSearchQuery("");
                    setFilters({
                      name: "",
                      branch: ""
                    });
                  }}
                >
                  <i className="ri-refresh-line me-2"></i>
                  Reset
                </button>
              </div>


              {/* Active Filters Summary */}
              {(searchQuery || Object.values(filters).some(f => f !== "")) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-filter-3-fill text-blue-600 mr-2"></i>
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFilters({
                          name: "",
                          branch: ""
                        });
                      }}
                    >
                      <i className="ri-close-line mr-1"></i>
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {debouncedSearchQuery && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Search: "{debouncedSearchQuery}"
                        <button
                          className="ml-1 text-green-600 hover:text-green-800"
                          onClick={() => setSearchQuery("")}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.name && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Name: {filters.name}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, name: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.branch && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Branch: {branches.find(b => b._id === filters.branch)?.name || filters.branch}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, branch: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-3xl mb-2"></i>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Clients</th>
                        <th className="px-4 py-3">Task Status</th>
                        <th className="px-4 py-3">Timeline Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.length > 0 ? (
                        groups.map((group: Group, index: number) => (
                          <tr
                            key={group.groupId}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <button
                                onClick={() => router.push(`/analytics/groups/${group.groupId}/overview`)}
                                className={`font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left ${
                                  debouncedSearchQuery && group.groupName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) 
                                    ? 'bg-yellow-100 text-yellow-800 px-1 rounded' 
                                    : ''
                                }`}
                              >
                                {group.groupName}
                                {debouncedSearchQuery && group.groupName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) && (
                                  <i className="ri-search-line ml-1 text-xs"></i>
                                )}
                              </button>
                            </td>
                            <td>
                              <div className="text-sm text-gray-900">{group.branch?.name || 'N/A'}</div>
                            </td>
                            <td>
                              <div className="text-sm text-gray-900">{group.numberOfClients || 0} Clients</div>
                            </td>
                            <td className="px-4 py-3">
                              {renderTaskStatus(group.taskStatus)}
                            </td>
                            <td className="px-4 py-3">
                              {renderTimelineStatus(group.timelineStatus)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => router.push(`/analytics/groups/${group.groupId}/report`)}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                              >
                                <i className="ri-file-list-3-line me-1"></i> Report
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-group-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Groups Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first group.
                              </p>
                              <button
                                onClick={handleExport}
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-upload-2-line mr-2"></i> Export Data
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsGroupsPage;

