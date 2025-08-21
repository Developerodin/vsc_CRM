"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useRouter } from "next/navigation";

const AnalyticsTeamMembersPage = () => {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    branch: ""
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMemberForClients, setSelectedMemberForClients] = useState<any>(null);
  const [showClientsModal, setShowClientsModal] = useState(false);

  const fetchTeamMembers = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(!debouncedSearchQuery && filters.name && { name: filters.name }),
        ...(!debouncedSearchQuery && filters.email && { email: filters.email }),
        ...(!debouncedSearchQuery && filters.phone && { phone: filters.phone }),
        ...(!debouncedSearchQuery && filters.city && { city: filters.city }),
        ...(filters.state && { state: filters.state }),
        ...(filters.country && { country: filters.country }),
        ...(filters.branch && { branch: filters.branch }),
      });

      const response = await fetch(`${Base_url}analytics/team-members/table?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      
      setTeamMembers(data.data.results);
      setTotalResults(data.data.totalResults);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers(currentPage, itemsPerPage);
  }, [currentPage, sortBy, itemsPerPage]);

  useEffect(() => {
    if (debouncedSearchQuery !== undefined) {
      setCurrentPage(1);
      fetchTeamMembers(1, itemsPerPage);
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
    setCurrentPage(1);
    fetchTeamMembers(1, itemsPerPage);
  }, [filters]);

  // Export function
  const handleExport = async () => {
    try {
      // Export all team members from the current filtered results
      const exportData = teamMembers.map((member: any) => ({
        ID: member._id,
        "Team Member Name": member.name,
        "Email": member.email,
        "Phone": member.phone,
        "Address": member.address || "",
        "City": member.city || "",
        "State": member.state || "",
        "Country": member.country || "",
        "Pin Code": member.pinCode || "",
        "Branch": member.branch?.name || "",
        "Branch Address": member.branch?.address || "",
        "Branch City": member.branch?.city || "",
        "Branch State": member.branch?.state || "",
        "Branch Country": member.branch?.country || "",
        "Branch Pin Code": member.branch?.pinCode || "",
        "Skills Total": member.skills?.total || 0,
        "Skills": member.skills?.list?.map((skill: any) => skill.name).join(', ') || "",
        "Total Tasks": member.tasks?.total || 0,
        "Pending Tasks": member.tasks?.status?.pending || 0,
        "Ongoing Tasks": member.tasks?.status?.ongoing || 0,
        "Completed Tasks": member.tasks?.status?.completed || 0,
        "On Hold Tasks": member.tasks?.status?.on_hold || 0,
        "Delayed Tasks": member.tasks?.status?.delayed || 0,
        "Cancelled Tasks": member.tasks?.status?.cancelled || 0,
        "Task Completion Rate": member.tasks?.completionRate || 0,
        "Overdue Tasks": member.tasks?.overdue || 0,
        "Current Month Tasks": member.tasks?.currentMonth?.total || 0,
        "Current Month Completed": member.tasks?.currentMonth?.completed || 0,
        "Total Timelines": member.timelines?.total || 0,
        "Timeline Activities": member.timelines?.summary?.map((timeline: any) => timeline.activity?.name).join(', ') || "",
        "Total Clients": member.clients?.total || 0,
        "Client Names": member.clients?.list?.map((client: any) => client.name).join(', ') || "",
        "Created At": member.createdAt,
        "Updated At": member.updatedAt
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Phone
        { wch: 40 }, // Address
        { wch: 20 }, // City
        { wch: 20 }, // State
        { wch: 20 }, // Country
        { wch: 15 }, // Pin Code
        { wch: 25 }, // Branch
        { wch: 40 }, // Branch Address
        { wch: 20 }, // Branch City
        { wch: 20 }, // Branch State
        { wch: 20 }, // Branch Country
        { wch: 15 }, // Branch Pin Code
        { wch: 15 }, // Skills Total
        { wch: 40 }, // Skills
        { wch: 15 }, // Total Tasks
        { wch: 15 }, // Pending Tasks
        { wch: 15 }, // Ongoing Tasks
        { wch: 15 }, // Completed Tasks
        { wch: 15 }, // On Hold Tasks
        { wch: 15 }, // Delayed Tasks
        { wch: 15 }, // Cancelled Tasks
        { wch: 20 }, // Task Completion Rate
        { wch: 15 }, // Overdue Tasks
        { wch: 20 }, // Current Month Tasks
        { wch: 25 }, // Current Month Completed
        { wch: 20 }, // Total Timelines
        { wch: 40 }, // Timeline Activities
        { wch: 15 }, // Total Clients
        { wch: 40 }, // Client Names
        { wch: 20 }, // Created At
        { wch: 20 }  // Updated At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Analytics Team Members");
      const fileName = `analytics_team_members_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Analytics team members data exported successfully");
    } catch (error) {
      console.error("Error exporting analytics team members:", error);
      toast.error("Failed to export analytics team members");
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
      <Seo title="Analytics - Team Members Overview" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Team Members Overview</h1>
                <p className="text-gray-600 mt-1">Comprehensive view of all team members with analytics data</p>
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
                      className="form-control py-2 w-full pl-10 pr-4"
                      placeholder="Search by name, email, phone, city..."
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

                  {/* Filter button */}
                  <button
                    className={`ti-btn py-2 w-full sm:w-auto ${
                      showAdvancedFilters ? 'ti-btn-primary' : 'ti-btn-secondary'
                    }`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <i className={`ri-filter-${showAdvancedFilters ? 'fill' : 'line'} me-2`}></i>
                    Filters
                    {Object.values(filters).some(f => f !== "") && (
                      <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-1">
                        {Object.values(filters).filter(f => f !== "").length}
                      </span>
                    )}
                  </button>

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
                  </select>

                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setSearchQuery("");
                      setFilters({
                        name: "",
                        email: "",
                        phone: "",
                        city: "",
                        state: "",
                        country: "",
                        branch: ""
                      });
                      setSortBy("name:asc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter city"
                        value={filters.city}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, city: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter state"
                        value={filters.state}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, state: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter country"
                        value={filters.country}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, country: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                    <button
                      className="ti-btn ti-btn-secondary me-2"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          city: "",
                          state: "",
                          country: ""
                        }));
                        setCurrentPage(1);
                      }}
                    >
                      <i className="ri-filter-off-line me-2"></i>
                      Clear Filters
                    </button>
                    <button
                      className="ti-btn ti-btn-primary"
                      onClick={() => setShowAdvancedFilters(false)}
                    >
                      <i className="ri-check-line me-2"></i>
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}

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
                        setFilters(prev => ({
                          ...prev,
                          city: "",
                          state: "",
                          country: ""
                        }));
                        setCurrentPage(1);
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
                    {filters.city && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        City: {filters.city}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, city: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.state && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        State: {filters.state}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, state: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.country && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Country: {filters.country}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, country: "" }))}
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
                        <th className="px-4 py-3">Team Member</th>
                        <th className="px-4 py-3">Personal Details</th>
                        <th className="px-4 py-3">Task Status</th>
                        <th className="px-4 py-3">Skills</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3">Clients</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member: any, index: number) => (
                          <tr
                            key={member._id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {member.name?.charAt(0)?.toUpperCase() || 'T'}
                                </div>
                                <div className="ml-4">
                                  <button
                                    onClick={() => router.push(`/analytics/team-members/${member._id}/overview`)}
                                    className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                                  >
                                    {member.name}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-col">
                                <div className="text-sm text-gray-900">{member.email}</div>
                                <div className="text-sm text-gray-500">{member.phone}</div>
                                <div className="text-sm text-gray-500">{member.city}, {member.state}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {member.tasks?.status?.pending > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black mr-1">
                                    {member.tasks.status.pending} Pending
                                  </span>
                                )}
                                {member.tasks?.status?.ongoing > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black mr-1">
                                    {member.tasks.status.ongoing} Ongoing
                                  </span>
                                )}
                                {member.tasks?.status?.completed > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black mr-1">
                                    {member.tasks.status.completed} Completed
                                  </span>
                                )}
                                {member.tasks?.status?.on_hold > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-1">
                                    {member.tasks.status.on_hold} On Hold
                                  </span>
                                )}
                                {(!member.tasks || member.tasks.total === 0) && (
                                  <span className="text-gray-400 text-xs">No tasks</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {member.skills?.list?.slice(0, 3).map((skill: any) => (
                                  <span
                                    key={skill._id}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {skill.name}
                                  </span>
                                ))}
                                {member.skills?.list && member.skills.list.length > 3 && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                    +{member.skills.list.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="text-sm text-gray-900">
                                {member.timelines?.total || 0} Timelines
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.timelines?.summary?.slice(0, 2).map((timeline: any) => timeline.activity?.name).join(', ') || 'No activities'}
                              </div>
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedMemberForClients(member);
                                  setShowClientsModal(true);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                {member.clients?.total || 0} Clients
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-user-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Team Members Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first team member.
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

      {/* Clients Modal */}
      {showClientsModal && selectedMemberForClients && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Clients for {selectedMemberForClients.name}
                </h3>
                <button
                  onClick={() => {
                    setShowClientsModal(false);
                    setSelectedMemberForClients(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {selectedMemberForClients.clients?.list && selectedMemberForClients.clients.list.length > 0 ? (
                  <div className="space-y-3">
                    {selectedMemberForClients.clients.list.map((client: any) => (
                      <div key={client._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{client.name}</h4>
                            <p className="text-sm text-gray-500">{client.email}</p>
                            <p className="text-sm text-gray-500">{client.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {client.businessType || 'N/A'}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                              {client.entityType || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No clients found for this team member.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowClientsModal(false);
                    setSelectedMemberForClients(null);
                  }}
                  className="ti-btn ti-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTeamMembersPage;
