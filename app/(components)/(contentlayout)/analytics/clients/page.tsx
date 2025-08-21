"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useRouter } from "next/navigation";

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;
  pan: string;
  dob: string | null;
  branch: {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
  };
  sortOrder: number;
  businessType: string;
  gstNumber: string;
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  activities: {
    assigned: Array<{
      _id: string;
      activity: {
        _id: string;
        name: string;
      };
      assignedDate: string;
      notes: string;
    }>;
    total: number;
    summary: Array<{
      id: string;
      name: string;
    }>;
  };
  teamMembers: {
    total: number;
    members: Array<{
      _id: string;
      name: string;
      email: string;
      phone: string;
    }>;
  };
  tasks: {
    total: number;
    byStatus: {
      completed: number;
      pending: number;
      ongoing: number;
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
  };
  timelines: {
    total: number;
    summary: Array<{
      id: string;
      client: string;
    }>;
    hasTimelines: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    results: Client[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

const AnalyticsClientsPage = () => {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
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
    district: "",
    state: "",
    country: "",
    pan: "",
    businessType: "",
    entityType: "",
    gstNumber: "",
    tanNumber: "",
    cinNumber: "",
    udyamNumber: "",
    iecCode: ""
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const fetchClients = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        // Global search parameter - search across multiple fields
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        // Individual field filters (only if not using global search)
        ...(!debouncedSearchQuery && filters.name && { name: filters.name }),
        ...(!debouncedSearchQuery && filters.email && { email: filters.email }),
        ...(!debouncedSearchQuery && filters.phone && { phone: filters.phone }),
        ...(!debouncedSearchQuery && filters.district && { district: filters.district }),
        ...(filters.state && { state: filters.state }),
        ...(filters.country && { country: filters.country }),
        ...(filters.pan && { pan: filters.pan }),
        ...(filters.businessType && { businessType: filters.businessType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.gstNumber && { gstNumber: filters.gstNumber }),
        ...(filters.tanNumber && { tanNumber: filters.tanNumber }),
        ...(filters.cinNumber && { cinNumber: filters.cinNumber }),
        ...(filters.udyamNumber && { udyamNumber: filters.udyamNumber }),
        ...(filters.iecCode && { iecCode: filters.iecCode }),
      });

      const response = await fetch(`${Base_url}analytics/clients/table?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data: ApiResponse = await response.json();
      
      setClients(data.data.results);
      setTotalResults(data.data.totalResults);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(currentPage, itemsPerPage);
  }, [currentPage, sortBy, itemsPerPage]);

  // Refetch clients when search query changes
  useEffect(() => {
    if (debouncedSearchQuery !== undefined) {
      setCurrentPage(1); // Reset to first page when searching
      fetchClients(1, itemsPerPage);
    }
  }, [debouncedSearchQuery]);

  // Debounce search query
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

  // Separate useEffect for filters
  useEffect(() => {
    setCurrentPage(1);
    fetchClients(1, itemsPerPage);
  }, [filters]);

  // Function to render task status badges
  const renderTaskStatus = (tasks: Client['tasks']) => {
    if (!tasks || tasks.total === 0) {
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
          <span className="text-gray-600">Total: {tasks.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {tasks.status.pending > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
              {tasks.status.pending} Pending
            </span>
          )}
          {tasks.status.ongoing > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
              {tasks.status.ongoing} Ongoing
            </span>
          )}
          {tasks.status.completed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
              {tasks.status.completed} Completed
            </span>
          )}
          {tasks.status.on_hold > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {tasks.status.on_hold} On Hold
            </span>
          )}
          {tasks.status.cancelled > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {tasks.status.cancelled} Cancelled
            </span>
          )}
          {tasks.status.delayed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black">
              {tasks.status.delayed} Delayed
            </span>
          )}
        </div>
      </div>
    );
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
      <Seo title="Analytics - Clients Overview" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header - Like Clients Overview Page */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Clients Overview</h1>
                <p className="text-gray-600 mt-1">Comprehensive view of all clients with analytics data</p>
              </div>
              <div className="box-tools flex items-center space-x-2">
                <Link href="/analytics" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i>
                  Back to Analytics
                </Link>
                <Link href="/clients/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Client
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
                      className="form-control py-2 w-full pl-10 pr-4"
                      placeholder="Search by name, email, phone, city, business type, PAN..."
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
                    <option value="sortOrder:asc">Sort Order (Low-High)</option>
                    <option value="sortOrder:desc">Sort Order (High-Low)</option>
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
                        district: "",
                        state: "",
                        country: "",
                        pan: "",
                        businessType: "",
                        entityType: "",
                        gstNumber: "",
                        tanNumber: "",
                        cinNumber: "",
                        udyamNumber: "",
                        iecCode: ""
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

                    {/* GST Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter GST number"
                        value={filters.gstNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, gstNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* TAN Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TAN Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter TAN number"
                        value={filters.tanNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, tanNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* CIN Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CIN Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter CIN number"
                        value={filters.cinNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, cinNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* Udyam Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Udyam Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter Udyam number"
                        value={filters.udyamNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, udyamNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* IEC Code Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IEC Code
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter IEC code"
                        value={filters.iecCode}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, iecCode: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* State Filter */}
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

                    {/* Country Filter */}
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
                          businessType: "",
                          entityType: "",
                          gstNumber: "",
                          tanNumber: "",
                          cinNumber: "",
                          udyamNumber: "",
                          iecCode: "",
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
                          businessType: "",
                          entityType: "",
                          gstNumber: "",
                          tanNumber: "",
                          cinNumber: "",
                          udyamNumber: "",
                          iecCode: "",
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
                    {filters.gstNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        GST: {filters.gstNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, gstNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.tanNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        TAN: {filters.tanNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, tanNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.cinNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        CIN: {filters.cinNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, cinNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.udyamNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Udyam: {filters.udyamNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, udyamNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.iecCode && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        IEC: {filters.iecCode}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, iecCode: "" }))}
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
                         <th className="px-4 py-3">Client</th>
                         <th className="px-4 py-3">City</th>
                         <th className="px-4 py-3">PAN</th>
                         <th className="px-4 py-3">Activities</th>
                         <th className="px-4 py-3">Team Members</th>
                         <th className="px-4 py-3">Task Status</th>
                       </tr>
                     </thead>
                    <tbody>
                      {clients.length > 0 ? (
                        clients.map((client: Client, index: number) => (
                          <tr
                            key={client._id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => router.push(`/analytics/clients/${client._id}/overview`)}
                                  className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                                >
                                  {client.name}
                                </button>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <i className="ri-mail-line mr-1 text-gray-400"></i>
                                  {client.email}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <i className="ri-phone-line mr-1 text-gray-400"></i>
                                  {client.phone}
                                </div>
                              </div>
                            </td>
                                                         <td>{client.district}</td>
                             <td>{client.pan}</td>
                            <td>
                              <div className="text-sm text-gray-900">
                                {client.activities?.summary?.map((activity: any) => activity.name).join(', ') || 'No activities'}
                              </div>
                            </td>
                            <td>
                              <div className="text-sm text-gray-900">
                                {client.teamMembers?.members?.map((member: any) => member.name).join(', ') || 'No team members'}
                              </div>
                            </td>
                                                         <td className="px-4 py-3">
                               <div className="text-sm text-gray-900">
                                 {client.tasks?.status?.pending > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black mr-1">
                                     {client.tasks.status.pending} Pending
                                   </span>
                                 )}
                                 {client.tasks?.status?.ongoing > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black mr-1">
                                     {client.tasks.status.ongoing} Ongoing
                                   </span>
                                 )}
                                 {client.tasks?.status?.completed > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black mr-1">
                                     {client.tasks.status.completed} Completed
                                   </span>
                                 )}
                                 {client.tasks?.status?.on_hold > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-1">
                                     {client.tasks.status.on_hold} On Hold
                                   </span>
                                 )}
                                 {client.tasks?.status?.delayed > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black mr-1">
                                     {client.tasks?.status.delayed} Delayed
                                   </span>
                                 )}
                                 {client.tasks?.status?.cancelled > 0 && (
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                                     {client.tasks.status.cancelled} Cancelled
                                   </span>
                                 )}
                                 {(!client.tasks || client.tasks.total === 0) && (
                                   <span className="text-gray-400 text-xs">No tasks</span>
                                 )}
                               </div>
                             </td>
                          </tr>
                        ))
                      ) : (
                                                 <tr>
                           <td colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-folder-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Clients Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first client.
                              </p>
                              <Link
                                href="/clients/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line mr-2"></i> Add First
                                Client
                              </Link>
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
    </div>
  );
};

export default AnalyticsClientsPage;
