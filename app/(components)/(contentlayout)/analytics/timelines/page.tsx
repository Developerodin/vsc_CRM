"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useRouter } from "next/navigation";

interface Timeline {
  _id: string;
  status?: string | null;
  period?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  completedAt?: string | null;
  frequency?: string | null;
  frequencyConfig?: any;
  timelineType?: string | null;
  financialYear?: string | null;
  fields?: any[];
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  subactivity?: {
    _id: string;
    name: string;
    frequency: string;
    frequencyConfig: any;
    fields: any[];
  } | null;
  client?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
    state: string;
    country: string;
    businessType: string;
    entityType: string;
    pan: string;
    gstNumbers: string[];
  } | null;
  activity?: {
    _id: string;
    name: string;
    sortOrder: number;
  } | null;
  branch?: {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  } | null;
  tasks?: {
    total: number;
    byStatus: {
      pending: number;
      ongoing: number;
      completed: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
    status: {
      pending: number;
      ongoing: number;
      completed: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
  } | null;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    results: Timeline[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const AnalyticsTimelinesPage = () => {
  const router = useRouter();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>("createdAt:desc");
  const [filters, setFilters] = useState({
    businessType: "",
    entityType: "",
    activity: "",
    subactivity: "",
    frequency: "",
    period: "",
    clientCategory: "",
    turnoverStart: "",
    turnoverEnd: ""
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Calculate status counts from timelines
  const statusCounts = React.useMemo(() => {
    const counts = {
      pending: 0,
      completed: 0,
      delayed: 0,
      ongoing: 0,
      total: timelines.length
    };

    timelines.forEach((timeline) => {
      const status = timeline.status?.toLowerCase();
      if (status === 'pending') counts.pending++;
      else if (status === 'completed') counts.completed++;
      else if (status === 'delayed') counts.delayed++;
      else if (status === 'ongoing') counts.ongoing++;
    });

    return counts;
  }, [timelines]);

  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const response = await fetch(`${Base_url}activities?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.results || []);
    } catch (err) {
      toast.error('Failed to fetch activities');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchTimelines = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(sortBy && { sortBy }),
        ...(filters.businessType && { businessType: filters.businessType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.activity && { activity: filters.activity }),
        ...(filters.subactivity && { subactivity: filters.subactivity }),
        ...(filters.frequency && { frequency: filters.frequency }),
        ...(filters.period && { period: filters.period }),
        ...(filters.clientCategory && { clientCategory: filters.clientCategory }),
        ...(filters.turnoverStart && filters.turnoverEnd && { 
          turnover: `${filters.turnoverStart} to ${filters.turnoverEnd}` 
        }),
      });

      const response = await fetch(`${Base_url}analytics/timelines/table?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const data: ApiResponse = await response.json();
      
      setTimelines(data.data.results);
      setTotalResults(data.data.totalResults);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timelines');
      toast.error('Failed to fetch timelines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelines(currentPage, itemsPerPage);
  }, [currentPage, sortBy, itemsPerPage, filters]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-warning", text: "text-black" },
      completed: { bg: "bg-success", text: "text-black" },
      delayed: { bg: "bg-danger", text: "text-black" },
      ongoing: { bg: "bg-primary", text: "text-black" }
    };
    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800" };
    return `${config.bg} ${config.text}`;
  };

  const handleExport = async () => {
    try {
      const exportData = timelines.map((timeline: Timeline) => ({
        ID: timeline._id,
        "Client Name": timeline.client.name,
        "Client Email": timeline.client.email,
        "Client Phone": timeline.client.phone,
        "Client Business Type": timeline.client.businessType,
        "Client Entity Type": timeline.client.entityType,
        "Activity": timeline.activity.name,
        "Subactivity": timeline.subactivity?.name || "N/A",
        "Status": timeline.status,
        "Period": timeline.period,
        "Financial Year": timeline.financialYear,
        "Start Date": timeline.startDate,
        "End Date": timeline.endDate,
        "Due Date": timeline.dueDate,
        "Completed At": timeline.completedAt || "N/A",
        "Frequency": timeline.frequency,
        "Timeline Type": timeline.timelineType,
        "Branch": timeline.branch?.name || "N/A",
        "Total Tasks": timeline.tasks.total,
        "Pending Tasks": timeline.tasks.status.pending,
        "Ongoing Tasks": timeline.tasks.status.ongoing,
        "Completed Tasks": timeline.tasks.status.completed,
        "On Hold Tasks": timeline.tasks.status.on_hold,
        "Delayed Tasks": timeline.tasks.status.delayed,
        "Cancelled Tasks": timeline.tasks.status.cancelled,
        "Created At": timeline.createdAt,
        "Updated At": timeline.updatedAt
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws["!cols"] = [
        { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 20 },
        { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
        { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Analytics Timelines");
      const fileName = `analytics_timelines_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Analytics timelines data exported successfully");
    } catch (error) {
      toast.error("Failed to export analytics timelines");
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

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Analytics - Timelines Overview" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Timelines Overview</h1>
                <p className="text-gray-600 mt-1">Comprehensive view of all timelines with analytics data</p>
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

          {/* Analytics Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Timelines</p>
                  <p className="text-3xl font-bold">{totalResults}</p>
                  {Object.values(filters).some(f => f !== "") && (
                    <p className="text-blue-100 text-xs mt-1">Filtered results</p>
                  )}
                </div>
                <i className="ri-calendar-line text-3xl text-blue-200"></i>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold">{statusCounts.pending}</p>
                  <p className="text-yellow-100 text-xs mt-1">
                    {totalResults > 0 ? ((statusCounts.pending / totalResults) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <i className="ri-time-line text-3xl text-yellow-200"></i>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold">{statusCounts.completed}</p>
                  <p className="text-green-100 text-xs mt-1">
                    {totalResults > 0 ? ((statusCounts.completed / totalResults) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <i className="ri-check-double-line text-3xl text-green-200"></i>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Delayed</p>
                  <p className="text-3xl font-bold">{statusCounts.delayed}</p>
                  <p className="text-red-100 text-xs mt-1">
                    {totalResults > 0 ? ((statusCounts.delayed / totalResults) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <i className="ri-alarm-warning-line text-3xl text-red-200"></i>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Ongoing</p>
                  <p className="text-3xl font-bold">{statusCounts.ongoing}</p>
                  <p className="text-purple-100 text-xs mt-1">
                    {totalResults > 0 ? ((statusCounts.ongoing / totalResults) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <i className="ri-play-circle-line text-3xl text-purple-200"></i>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
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
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="dueDate:asc">Due Date (Earliest)</option>
                    <option value="dueDate:desc">Due Date (Latest)</option>
                    <option value="status:asc">Status (A-Z)</option>
                    <option value="status:desc">Status (Z-A)</option>
                  </select>

                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setFilters({
                        businessType: "",
                        entityType: "",
                        activity: "",
                        subactivity: "",
                        frequency: "",
                        period: "",
                        clientCategory: "",
                        turnoverStart: "",
                        turnoverEnd: ""
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

              {/* Filter Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Activity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.activity}
                      onChange={(e) => {
                        setFilters(prev => ({ 
                          ...prev, 
                          activity: e.target.value,
                          subactivity: "" // Reset subactivity when activity changes
                        }));
                        setCurrentPage(1);
                      }}
                      disabled={isLoadingActivities}
                    >
                      <option value="">All Activities</option>
                      {activities.map((activity) => (
                        <option key={activity.id || activity._id} value={activity.id || activity._id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subactivity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subactivity
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.subactivity}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, subactivity: e.target.value }));
                        setCurrentPage(1);
                      }}
                      disabled={!filters.activity}
                    >
                      <option value="">All Subactivities</option>
                      {filters.activity && activities.find(a => (a.id || a._id) === filters.activity)?.subactivities?.map((subactivity: any) => (
                        <option key={subactivity._id || subactivity.id} value={subactivity._id || subactivity.id}>
                          {subactivity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.frequency}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, frequency: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Frequencies</option>
                      <option value="None">None</option>
                      <option value="OneTime">One Time</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>

                  {/* Period Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period
                    </label>
                    <input
                      type="text"
                      className="form-control w-full"
                      placeholder="e.g., April-2024"
                      value={filters.period}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, period: e.target.value }));
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Business Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.businessType}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, businessType: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Business Types</option>
                      <option value="Aviation">Aviation</option>
                      <option value="Banking">Banking</option>
                      <option value="Chemicals, Petrochemicals">Chemicals, Petrochemicals</option>
                      <option value="Coal">Coal</option>
                      <option value="Construction">Construction</option>
                      <option value="Consultancy Services">Consultancy Services</option>
                      <option value="Co-operatives">Co-operatives</option>
                      <option value="Education">Education</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Mining">Mining</option>
                      <option value="Non Banking Financial Companies">Non Banking Financial Companies</option>
                      <option value="Non Government Organisation">Non Government Organisation</option>
                      <option value="Oil & Gas">Oil & Gas</option>
                      <option value="Power">Power</option>
                      <option value="Shipping">Shipping</option>
                      <option value="Steel">Steel</option>
                      <option value="Tele-Communication">Tele-Communication</option>
                      <option value="Tourism">Tourism</option>
                      <option value="Trading">Trading</option>
                      <option value="Transport other than Shipping & Aviation">Transport other than Shipping & Aviation</option>
                    </select>
                  </div>

                  {/* Entity Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entity Type
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.entityType}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, entityType: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Entity Types</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Private Limited">Private Limited</option>
                      <option value="Public Limited">Public Limited</option>
                      <option value="LLP">LLP</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="HUF">HUF</option>
                      <option value="Trust">Trust</option>
                      <option value="Society">Society</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Client Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Category
                    </label>
                    <select
                      className="form-select w-full"
                      value={filters.clientCategory}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, clientCategory: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Categories</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>

                  {/* Turnover Range Filter */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turnover Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="form-control w-full"
                        placeholder="Start"
                        value={filters.turnoverStart}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, turnoverStart: e.target.value }));
                          setCurrentPage(1);
                        }}
                        min="0"
                        step="1000"
                      />
                      <span className="text-gray-500 whitespace-nowrap">to</span>
                      <input
                        type="number"
                        className="form-control w-full"
                        placeholder="End"
                        value={filters.turnoverEnd}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, turnoverEnd: e.target.value }));
                          setCurrentPage(1);
                        }}
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {Object.values(filters).some(f => f !== "") && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-filter-3-fill text-blue-600 mr-2"></i>
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => {
                        setFilters({
                          businessType: "",
                          entityType: "",
                          activity: "",
                          subactivity: "",
                          frequency: "",
                          period: "",
                          clientCategory: "",
                          turnoverStart: "",
                          turnoverEnd: ""
                        });
                        setCurrentPage(1);
                      }}
                    >
                      <i className="ri-close-line mr-1"></i>
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.activity && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Activity: {activities.find(a => (a.id || a._id) === filters.activity)?.name || filters.activity}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, activity: "", subactivity: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.subactivity && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Subactivity: {activities.find(a => (a.id || a._id) === filters.activity)?.subactivities?.find((sa: any) => (sa._id || sa.id) === filters.subactivity)?.name || filters.subactivity}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, subactivity: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.frequency && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Frequency: {filters.frequency}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, frequency: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.period && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Period: {filters.period}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, period: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.businessType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Business Type: {filters.businessType}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, businessType: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.entityType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Entity Type: {filters.entityType}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, entityType: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.clientCategory && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Category: {filters.clientCategory}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, clientCategory: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.turnoverStart && filters.turnoverEnd && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Turnover: {filters.turnoverStart} to {filters.turnoverEnd}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, turnoverStart: "", turnoverEnd: "" }))}
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
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3">Subactivity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Frequency</th>
                        <th className="px-4 py-3">Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelines.length > 0 ? (
                        timelines.map((timeline: Timeline, index: number) => (
                          <tr
                            key={timeline._id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{timeline.client?.name || "N/A"}</span>
                                <span className="text-sm text-gray-500">{timeline.client?.email || "N/A"}</span>
                                <span className="text-xs text-gray-400">
                                  {timeline.client?.businessType || "N/A"} - {timeline.client?.entityType || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="text-sm text-gray-900">{timeline.activity?.name || "N/A"}</span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-900">{timeline.subactivity?.name || "N/A"}</span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(timeline.status || "pending")}`}>
                                {timeline.status || "N/A"}
                              </span>
                            </td>
                            <td>
                              <div className="text-sm text-gray-900">{timeline.period || "N/A"}</div>
                              <div className="text-xs text-gray-500">{timeline.financialYear || "N/A"}</div>
                            </td>
                            <td>
                              <span className="text-sm text-gray-900">
                                {timeline.dueDate ? new Date(timeline.dueDate).toLocaleDateString() : "N/A"}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-900">{timeline.frequency || "N/A"}</span>
                              <div className="text-xs text-gray-500">{timeline.timelineType || "N/A"}</div>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {timeline.tasks?.status?.pending > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
                                    {timeline.tasks.status.pending} P
                                  </span>
                                )}
                                {timeline.tasks?.status?.ongoing > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
                                    {timeline.tasks.status.ongoing} O
                                  </span>
                                )}
                                {timeline.tasks?.status?.completed > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
                                    {timeline.tasks.status.completed} C
                                  </span>
                                )}
                                {(!timeline.tasks || timeline.tasks.total === 0) && (
                                  <span className="text-gray-400 text-xs">No tasks</span>
                                )}
                              </div>
                              <button
                                onClick={() => router.push(`/analytics/timelines/${timeline._id}/overview`)}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-calendar-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">No Timelines Found</h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by creating your first timeline.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

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
                  <nav aria-label="Page navigation">
                    <ul className="flex flex-wrap items-center">
                      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                        <button
                          className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                      <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                        <button
                          className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

export default AnalyticsTimelinesPage;

