"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Role[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "Role Name": string;
  "Description"?: string;
  "Active Status": string;
  "Created At"?: string;
}

const RolesPage = () => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
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
    status: "",
  });

  const fetchRoles = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`${Base_url}roles?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data: ApiResponse = await response.json();
      setRoles(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(roles.map((role) => role.id));
    }
    setSelectAll(!selectAll);
  };

  const handleRoleSelect = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`${Base_url}roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete role');
      }

      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      toast.error('Failed to delete role');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRoles.length} roles?`)) return;

    try {
      const deletePromises = selectedRoles.map(roleId =>
        fetch(`${Base_url}roles/${roleId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      toast.success('Selected roles deleted successfully');
      setSelectedRoles([]);
      fetchRoles();
    } catch (err) {
      console.error('Error deleting roles:', err);
      toast.error('Failed to delete selected roles');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      if (selectedRoles.length > 0) {
        // Export selected roles
        exportData = roles
          .filter((role) => selectedRoles.includes(role.id))
          .map((role) => ({
            ID: role.id,
            "Role Name": role.name,
            "Description": role.description || 'N/A',
            "Active Status": role.isActive ? 'Active' : 'Inactive',
            "Created At": new Date(role.createdAt).toLocaleDateString(),
          }));
      } else {
        // Export all roles
        const response = await fetch(`${Base_url}roles?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        exportData = data.results.map((role: Role) => ({
          ID: role.id,
          "Role Name": role.name,
          "Description": role.description || 'N/A',
          "Active Status": role.isActive ? 'Active' : 'Inactive',
          "Created At": new Date(role.createdAt).toLocaleDateString(),
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Roles");
      XLSX.writeFile(wb, `roles_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Roles exported successfully');
    } catch (err) {
      console.error('Error exporting roles:', err);
      toast.error('Failed to export roles');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportProgress(0);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('No data found in the file');
        return;
      }

      setImportProgress(25);

      // Validate required fields
      const requiredFields = ['Role Name'];
      const missingFields = jsonData.some(row => 
        requiredFields.some(field => !row[field as keyof ExcelRow])
      );

      if (missingFields) {
        toast.error('Some rows are missing required fields (Role Name)');
        return;
      }

      setImportProgress(50);

      // Process each row
      const importPromises = jsonData.map(async (row, index) => {
        try {
          const roleData = {
            name: row['Role Name'],
            description: row['Description'] || '',
            isActive: row['Active Status']?.toLowerCase() === 'active' || true,
          };

          const response = await fetch(`${Base_url}roles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(roleData)
          });

          if (!response.ok) {
            throw new Error(`Failed to import role ${row['Role Name']}`);
          }

          setImportProgress(50 + ((index + 1) / jsonData.length) * 40);
        } catch (err) {
          console.error(`Error importing role ${row['Role Name']}:`, err);
          throw err;
        }
      });

      await Promise.all(importPromises);
      setImportProgress(100);
      toast.success(`Successfully imported ${jsonData.length} roles`);
      
      // Reset file input and refresh data
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setImportProgress(null);
        fetchRoles();
      }, 2000);

    } catch (err) {
      console.error('Error importing roles:', err);
      toast.error('Failed to import roles');
      setImportProgress(null);
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
      <Seo title="Roles" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Roles</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedRoles.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedRoles.length})
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
                <Link href="/roles/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Role
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

                  {/* Status filter */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={filters.status}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        status: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

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
                      setFilters({
                        name: "",
                        status: "",
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
                            checked={selectedRoles.length === roles.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Permissions</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.length > 0 ? (
                        roles.map((role: Role, index: number) => (
                          <tr
                            key={role.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedRoles.includes(role.id)}
                                onChange={() => handleRoleSelect(role.id)}
                              />
                            </td>
                            <td className="font-medium">{role.name}</td>
                            <td>
                              {role.description ? (
                                <span className="text-gray-600">{role.description}</span>
                              ) : (
                                <span className="text-gray-400 italic">No description</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${role.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                {role.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {role.permissions && role.permissions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {role.permissions.slice(0, 3).map((permission, idx) => (
                                    <span key={idx} className="badge bg-primary/10 text-primary text-xs">
                                      {permission}
                                    </span>
                                  ))}
                                  {role.permissions.length > 3 && (
                                    <span className="badge bg-gray-100 text-gray-600 text-xs">
                                      +{role.permissions.length - 3} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No permissions</span>
                              )}
                            </td>
                            <td>{new Date(role.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link
                                  href={`/roles/edit/${role.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(role.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-shield-user-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Roles Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first role.
                              </p>
                              <Link
                                href="/roles/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add First Role
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

export default RolesPage; 