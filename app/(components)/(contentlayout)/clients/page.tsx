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
  fNo: string;
  pan: string;
  dob: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  "F No"?: string;
  "PAN"?: string;
  "Date of Birth"?: string;
  "Sort Order"?: string | number;
  "Created At"?: string;
}

const ClientsPage = () => {
  const selectedBranchId = useSelectedBranchId();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
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
    fNo: "",
    pan: ""
  });


  console.log(selectedBranchId, "selectedBranchId");

  const fetchClients = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

     
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
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
      setClients(data.results);
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
            "F No": client.fNo,
            "PAN": client.pan,
            "Date of Birth": client.dob,
            "Sort Order": client.sortOrder,
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
          "F No": client.fNo,
          "PAN": client.pan,
          "Date of Birth": client.dob,
          "Sort Order": client.sortOrder
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
        { wch: 15 }, // F No
        { wch: 15 }, // PAN
        { wch: 15 }, // Date of Birth
        { wch: 10 }, // Sort Order
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const fileName = `clients_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(selectedClients.length > 0 ? "Selected clients exported successfully" : "All clients exported successfully");
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
              fNo: row["F No"]?.toString().trim() || "",
              pan: row["PAN"]?.toString().trim() || "",
              dob: convertDateFormat(row["Date of Birth"]?.toString() || ""),
              sortOrder: parseInt(row["Sort Order"]?.toString() || "1")
            };

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

            return {
              ...(clientId && { id: clientId }),
              ...clientData
            };
          } catch (error) {
            console.error(`Error processing row ${index + 1}:`, error);
            console.error('Row data:', row);
            throw new Error(`Error processing row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

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
          toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
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
                      placeholder="Search by name..."
                      value={filters.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters(prev => ({
                          ...prev,
                          name: value,
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
                        name: "",
                        email: "",
                        phone: "",
                        district: "",
                        state: "",
                        country: "",
                        fNo: "",
                        pan: ""
                      });
                      setSortBy("name:asc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

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
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Email 2</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3">State</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">F No</th>
                        <th className="px-4 py-3">PAN</th>
                        <th className="px-4 py-3">Date of Birth</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3">Sort Order</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length > 0 ? (
                        clients.map((client: Client, index: number) => (
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
                            <td>{client.name}</td>
                            <td>{client.email}</td>
                            <td>{client.email2}</td>
                            <td>{client.phone}</td>
                            <td>{client.district}</td>
                            <td>{client.state}</td>
                            <td>{client.country}</td>
                            <td>{client.fNo}</td>
                            <td>{client.pan}</td>
                            <td>{client.dob ? new Date(client.dob).toLocaleDateString() : '-'}</td>
                            <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                            <td>{client.sortOrder}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link
                                  href={`/clients/edit/${client.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
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
                          <td colSpan={14} className="text-center py-8">
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
                                <i className="ri-add-line me-2"></i> Add First
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
