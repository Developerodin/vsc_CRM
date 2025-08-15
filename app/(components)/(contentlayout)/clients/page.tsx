"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useSelectedBranchId } from "@/shared/contextapi";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;

  pan: string;
  dob: string;
  branch: string;
  sortOrder: number;
  businessType: string;
  gstNumber: string;
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  activities?: ActivityMapping[];
  createdAt: string;
  updatedAt: string;
}

interface ActivityMapping {
  activity: string;
  assignedTeamMember: string;
  assignedDate?: string;
  notes: string;
}

interface TaskStats {
  pending: number;
  ongoing: number;
  completed: number;
  delayed: number;
  total: number;
}

interface ClientWithTasks extends Client {
  taskStats: TaskStats;
}

interface ApiResponse {
  results: Client[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "Client Name"?: string;
  "Client Phone"?: string;
  "Client Email"?: string;
  "Client Email 2"?: string;
  "Client Address"?: string;
  "Client District"?: string;
  "Client State"?: string;
  "Client Country"?: string;
  "Branch"?: string;

  "PAN"?: string;
  "Date of Birth"?: string;
  "Sort Order"?: string | number;
  "Business Type"?: string;
  "Entity Type"?: string;
  "GST Number"?: string;
  "TAN Number"?: string;
  "CIN Number"?: string;
  "Udyam Number"?: string;
  "IEC Code"?: string;
  "Activity Name"?: string;
  "Activity Notes"?: string;
  "Created At"?: string;
}

const ClientsPage = () => {
  const selectedBranchId = useSelectedBranchId();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<ClientWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    district: "",
    state: "",
    country: "",
    pan: "",
    branch: "",
    businessType: "",
    entityType: "",
    gstNumber: "",
    tanNumber: "",
    cinNumber: "",
    udyamNumber: "",
    iecCode: ""
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);


  console.log(selectedBranchId, "selectedBranchId");

  // Function to fetch task statistics for a client
  const fetchClientTaskStats = async (clientId: string): Promise<TaskStats> => {
    // Static mock data for now
    const mockStats = [
      { pending: 3, ongoing: 2, completed: 8, delayed: 1, total: 14 },
      { pending: 1, ongoing: 4, completed: 12, delayed: 0, total: 17 },
      { pending: 5, ongoing: 1, completed: 6, delayed: 2, total: 14 },
      { pending: 0, ongoing: 3, completed: 15, delayed: 0, total: 18 },
      { pending: 2, ongoing: 5, completed: 9, delayed: 1, total: 17 },
      { pending: 4, ongoing: 2, completed: 7, delayed: 3, total: 16 },
      { pending: 1, ongoing: 6, completed: 11, delayed: 0, total: 18 },
      { pending: 3, ongoing: 1, completed: 13, delayed: 2, total: 19 },
      { pending: 0, ongoing: 4, completed: 10, delayed: 1, total: 15 },
      { pending: 2, ongoing: 3, completed: 8, delayed: 4, total: 17 }
    ];
    
    // Use client ID to get consistent mock data
    const index = parseInt(clientId.slice(-1)) || 0;
    return mockStats[index % mockStats.length];
  };

  const fetchClients = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

     
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.phone && { phone: filters.phone }),
        ...(filters.district && { district: filters.district }),
        ...(filters.pan && { pan: filters.pan }),

        ...(filters.branch && { branch: filters.branch }),
        ...(filters.businessType && { businessType: filters.businessType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.gstNumber && { gstNumber: filters.gstNumber }),
        ...(filters.tanNumber && { tanNumber: filters.tanNumber }),
        ...(filters.cinNumber && { cinNumber: filters.cinNumber }),
        ...(filters.udyamNumber && { udyamNumber: filters.udyamNumber }),
        ...(filters.iecCode && { iecCode: filters.iecCode }),
      });

      const response = await fetch(`${Base_url}clients?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data: ApiResponse = await response.json();
      
      // Fetch task stats for each client
      const clientsWithTasks = await Promise.all(
        data.results.map(async (client: Client) => {
          const taskStats = await fetchClientTaskStats(client.id);
          return { ...client, taskStats };
        })
      );

      setClients(clientsWithTasks);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
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
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((client) => client.id));
    }
    setSelectAll(!selectAll);
  };

  const handleClientSelect = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch(`${Base_url}clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast.success('Client deleted successfully');
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Failed to delete client');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) return;

    try {
      const deletePromises = selectedClients.map(clientId =>
        fetch(`${Base_url}clients/${clientId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      toast.success('Selected clients deleted successfully');
      setSelectedClients([]);
      fetchClients();
    } catch (err) {
      console.error('Error deleting clients:', err);
      toast.error('Failed to delete selected clients');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      if (selectedClients.length > 0) {
        // Export selected clients
        exportData = clients
          .filter((client) => selectedClients.includes(client.id))
          .map((client) => ({
            ID: client.id,
            "Client Name": client.name,
            "Client Phone": client.phone,
            "Client Email": client.email,
            "Client Email 2": client.email2,
            "Client Address": client.address,
            "Client District": client.district,
            "Client State": client.state,
            "Client Country": client.country,
            "Branch": client.branch,

            "PAN": client.pan,
            "Date of Birth": client.dob,
            "Sort Order": client.sortOrder,
            "Business Type": client.businessType,
            "Entity Type": client.entityType,
            "GST Number": client.gstNumber,
            "TAN Number": client.tanNumber,
            "CIN Number": client.cinNumber,
            "Udyam Number": client.udyamNumber,
            "IEC Code": client.iecCode,
            "Activity Name": client.activities && client.activities.length > 0 ? client.activities[0].activity : "",
            "Activity Notes": client.activities && client.activities.length > 0 ? client.activities[0].notes : "",
          }));
      } else {
        // Export all clients
        const response = await fetch(`${Base_url}clients?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        exportData = data.results.map((client: Client) => ({
          ID: client.id,
          "Client Name": client.name,
          "Client Phone": client.phone,
          "Client Email": client.email,
          "Client Email 2": client.email2,
          "Client Address": client.address,
          "Client District": client.district,
          "Client State": client.state,
          "Client Country": client.country,
          "Branch": client.branch,
          
          "PAN": client.pan,
          "Date of Birth": client.dob,
          "Sort Order": client.sortOrder,
          "Business Type": client.businessType,
          "Entity Type": client.entityType,
          "GST Number": client.gstNumber,
          "TAN Number": client.tanNumber,
          "CIN Number": client.cinNumber,
          "Udyam Number": client.udyamNumber,
          "IEC Code": client.iecCode,
          "Activity Name": client.activities && client.activities.length > 0 ? client.activities[0].activity : "",
          "Activity Notes": client.activities && client.activities.length > 0 ? client.activities[0].notes : "",
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Name
        { wch: 20 }, // Phone
        { wch: 30 }, // Email
        { wch: 30 }, // Email 2
        { wch: 40 }, // Address
        { wch: 20 }, // District
        { wch: 20 }, // State
        { wch: 20 }, // Country
        { wch: 30 }, // Branch ID

        { wch: 15 }, // PAN
        { wch: 15 }, // Date of Birth
        { wch: 10 }, // Sort Order
        { wch: 25 }, // Business Type
        { wch: 20 }, // Entity Type
        { wch: 20 }, // GST Number
        { wch: 20 }, // TAN Number
        { wch: 20 }, // CIN Number
        { wch: 20 }, // Udyam Number
        { wch: 20 }, // IEC Code
        { wch: 25 }, // Activity Name
        { wch: 30 }, // Activity Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const fileName = `clients_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(selectedClients.length > 0 ? "Selected clients exported successfully with activity fields" : "All clients exported successfully with activity fields");
    } catch (error) {
      console.error("Error exporting clients:", error);
      toast.error("Failed to export clients");
    }
  };


const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setImportProgress(0);
  const loadingToast = toast.loading("Importing clients...");

  // Excel structure:
  // - First row should contain headers exactly as defined in ExcelRow interface
  // - ID column: Leave empty for new clients, include ID for updates
  // - Activity fields: 
  //   * "Activity Name" should contain the Activity ID (MongoDB ObjectId)
  //   * "Team Member Name" should contain the Team Member ID (MongoDB ObjectId)
  //   * "Activity Notes" should contain the activity notes text
  // - All other fields: Standard client information

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("No data read from file");
        }

        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames.length) {
          throw new Error("No sheets found in the Excel file");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        if (!jsonData.length) {
          throw new Error("No data found in the Excel sheet");
        }

        // Debug: Log the first few rows to see the structure
        console.log('First 3 rows from Excel:', jsonData.slice(0, 3));
        console.log('Excel column names:', Object.keys(jsonData[0] || {}));

        // Fetch all clients for upsert by name
        const allResponse = await fetch(`${Base_url}clients?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const allData = await allResponse.json();
        const allClients: Client[] = allData.results || [];

        // Transform data for bulk import
        const clients = jsonData.map((row, index) => {
          try {
            // Convert date format from "26.09.1991" to "1990-01-01"
            const convertDateFormat = (dateString: string): string => {
              if (!dateString || dateString.trim() === '') return '';
              
              const trimmedDate = dateString.toString().trim();
              
              // Handle "26.09.1991" format
              if (trimmedDate.includes('.')) {
                const parts = trimmedDate.split('.');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = parts[1].padStart(2, '0');
                  const year = parts[2];
                  return `${year}-${month}-${day}`;
                }
              }
              
              // Handle "26/09/1991" format
              if (trimmedDate.includes('/')) {
                const parts = trimmedDate.split('/');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = parts[1].padStart(2, '0');
                  const year = parts[2];
                  return `${year}-${month}-${day}`;
                }
              }
              
              // If already in "1990-01-01" format, return as is
              if (trimmedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return trimmedDate;
              }
              
              // If can't parse, return empty string
              return '';
            };

            const clientData = {
              name: (row["Client Name"]?.toString() || "").trim(),
              phone: String(row["Client Phone"] || "").replace(/[^0-9+]/g, ''),
              email: (row["Client Email"]?.toString() || "").trim(),
              email2: row["Client Email 2"]?.toString().trim() || "",
              address: (row["Client Address"]?.toString() || "").trim(),
              district: (row["Client District"]?.toString() || "").trim(),
              state: (row["Client State"]?.toString() || "").trim(),
              country: (row["Client Country"]?.toString() || "").trim(),

              pan: row["PAN"]?.toString().trim() || "",
              dob: convertDateFormat(row["Date of Birth"]?.toString() || ""),
              branch: row["Branch"]?.toString().trim() || "",
              sortOrder: parseInt(row["Sort Order"]?.toString() || "1"),
              businessType: row["Business Type"]?.toString().trim() || "",
              entityType: row["Entity Type"]?.toString().trim() || "",
              gstNumber: row["GST Number"]?.toString().trim() || "",
              tanNumber: row["TAN Number"]?.toString().trim() || "",
              cinNumber: row["CIN Number"]?.toString().trim() || "",
              udyamNumber: row["Udyam Number"]?.toString().trim() || "",
              iecCode: row["IEC Code"]?.toString().trim() || ""
            };

            // Handle activity mapping if provided
            const activityMapping = {
              activity: row["Activity Name"]?.toString().trim() || "",
              notes: row["Activity Notes"]?.toString().trim() || ""
            };

            // Validate MongoDB ObjectId format for activity ID
            const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
            
            const hasValidActivityId = activityMapping.activity && 
                                      isValidObjectId(activityMapping.activity);

            let clientId = row["ID"];
            if (!clientId) {
              // Try to find by name (case-insensitive)
              const found = allClients.find(
                (c) =>
                  c.name.trim().toLowerCase() ===
                  clientData.name.trim().toLowerCase()
              );
              if (found) clientId = found.id;
            }

            // Debug logging for activity mapping
            console.log('Row activity data:', {
              activityId: activityMapping.activity,
              notes: activityMapping.notes,
              hasActivity: !!activityMapping.activity,
              isValidActivityId: isValidObjectId(activityMapping.activity),
              hasValidActivityId,
              willIncludeActivities: hasValidActivityId
            });

            return {
              ...(clientId && { id: clientId }),
              ...clientData,
              activities: hasValidActivityId ? [activityMapping] : []
            };
          } catch (error) {
            console.error(`Error processing row ${index + 1}:`, error);
            console.error('Row data:', row);
            throw new Error(`Error processing row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        // Debug logging for the final data being sent
        console.log('Final clients data being sent to API:', clients);
        console.log('Sample client with activities:', clients.find(c => c.activities && c.activities.length > 0));

        // Single API call instead of multiple requests
        const response = await fetch(`${Base_url}clients/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ clients })
        });

        if (!response.ok) {
          throw new Error('Bulk import failed');
        }

        const result = await response.json();

        if (fileInputRef.current) fileInputRef.current.value = "";
        setImportProgress(null);
        toast.dismiss(loadingToast);

        if (result.errors && result.errors.length > 0) {
          toast.error(`Import completed with ${result.errors.length} errors`);
          console.log('Import errors:', result.errors);
        } else {
          const activityCount = result.activitiesCreated || 0;
          toast.success(`Import completed: ${result.created} clients added, ${result.updated} clients updated${activityCount > 0 ? `, ${activityCount} activities mapped` : ''}`);
        }

        // Refresh the clients list
        fetchClients();
      } catch (error) {
        setImportProgress(null);
        toast.error("Failed to process import file", { id: loadingToast });
        console.error('Error processing file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    setImportProgress(null);
    toast.error("Failed to import clients", { id: loadingToast });
    console.error('Error reading file:', error);
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

  // Function to render task status badges
  const renderTaskStatus = (taskStats: TaskStats) => {
    if (taskStats.total === 0) {
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
          <span className="text-gray-600">Total: {taskStats.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {taskStats.pending > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
              {taskStats.pending} Pending
            </span>
          )}
          {taskStats.ongoing > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
              {taskStats.ongoing} Ongoing
            </span>
          )}
          {taskStats.completed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
              {taskStats.completed} Completed
            </span>
          )}
          {taskStats.delayed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black">
              {taskStats.delayed} Delayed
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Clients" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Clients</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedClients.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedClients.length})
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
                    <i className="ri-download-2-line me-2"></i> Import
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
                  <i className="ri-upload-2-line me-2"></i> Export
                </button>
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
                      className="form-control py-2 w-full"
                      placeholder="Search by name, email, phone, city, PAN..."
                      value={filters.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters(prev => ({
                          ...prev,
                          name: value,
                          email: value,
                          phone: value,
                          district: value,
                          pan: value,
                        }));
                        setCurrentPage(1);
                      }}
                    />
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
                    {Object.values(filters).some(f => f !== "" && f !== filters.name) && (
                      <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-1">
                        {Object.values(filters).filter(f => f !== "" && f !== filters.name).length}
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
                      setFilters({
                        name: "",
                        email: "",
                        phone: "",
                        district: "",
                        state: "",
                        country: "",
                        pan: "",
                        branch: "",
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
              {Object.values(filters).some(f => f !== "" && f !== filters.name) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-filter-3-fill text-blue-600 mr-2"></i>
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
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
                      <i className="ri-close-line mr-1"></i>
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
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
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={selectedClients.length === clients.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Business Type</th>
                        <th className="px-4 py-3">Entity Type</th>

                        <th className="px-4 py-3">PAN</th>
                        <th className="px-4 py-3">Task Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length > 0 ? (
                        clients.map((client: ClientWithTasks, index: number) => (
                          <tr
                            key={client.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedClients.includes(client.id)}
                                onChange={() => handleClientSelect(client.id)}
                              />
                            </td>
                            <td>
                              <div className="flex flex-col">
                                <div className="font-medium text-gray-900">{client.name}</div>
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
                            <td>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                client.businessType ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {client.businessType || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                client.entityType ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {client.entityType || 'N/A'}
                              </span>
                            </td>

                            <td>{client.pan}</td>
                            <td className="px-4 py-3">
                              {renderTaskStatus(client.taskStats)}
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link
                                  href={`/clients/edit/${client.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                {/* <button
                                  className="ti-btn ti-btn-success ti-btn-sm"
                                  title="View Files"
                                >
                                  <i className="ri-folder-line"></i>
                                </button> */}
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(client.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-8">
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

export default ClientsPage;
