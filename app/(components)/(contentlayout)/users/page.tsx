"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  assignedBranch?: {
    id: string;
    name: string;
  };
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface ApiResponse {
  results: User[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "User Name": string;
  "User Email": string;
  "Role": string;
  "Assigned Branch"?: string;
  "Email Verified": string;
  "Created At"?: string;
}

const UsersPage = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
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
    role: "",
    branch: "",
  });

  const fetchUsers = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.role && { role: filters.role }),
        ...(filters.branch && { branch: filters.branch }),
      });

      const response = await fetch(`${Base_url}users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: ApiResponse = await response.json();
      setUsers(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${Base_url}roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${Base_url}branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, itemsPerPage);
    fetchRoles();
    fetchBranches();
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  const handleUserSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${Base_url}users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;

    try {
      const deletePromises = selectedUsers.map(userId =>
        fetch(`${Base_url}users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      toast.success('Selected users deleted successfully');
      setSelectedUsers([]);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting users:', err);
      toast.error('Failed to delete selected users');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      if (selectedUsers.length > 0) {
        // Export selected users
        exportData = users
          .filter((user) => selectedUsers.includes(user.id))
          .map((user) => ({
            ID: user.id,
            "User Name": user.name,
            "User Email": user.email,
            "Role": user.role?.name || 'N/A',
            "Assigned Branch": user.assignedBranch?.name || 'N/A',
            "Email Verified": user.isEmailVerified ? 'Yes' : 'No',
            "Created At": new Date(user.createdAt).toLocaleDateString(),
          }));
      } else {
        // Export all users
        const response = await fetch(`${Base_url}users?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        exportData = data.results.map((user: User) => ({
          ID: user.id,
          "User Name": user.name,
          "User Email": user.email,
          "Role": user.role?.name || 'N/A',
          "Assigned Branch": user.assignedBranch?.name || 'N/A',
          "Email Verified": user.isEmailVerified ? 'Yes' : 'No',
          "Created At": new Date(user.createdAt).toLocaleDateString(),
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(wb, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Users exported successfully');
    } catch (err) {
      console.error('Error exporting users:', err);
      toast.error('Failed to export users');
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
      const requiredFields = ['User Name', 'User Email'];
      const missingFields = jsonData.some(row => 
        requiredFields.some(field => !row[field as keyof ExcelRow])
      );

      if (missingFields) {
        toast.error('Some rows are missing required fields (User Name, User Email)');
        return;
      }

      setImportProgress(50);

      // Process each row
      const importPromises = jsonData.map(async (row, index) => {
        try {
          const userData = {
            name: row['User Name'],
            email: row['User Email'],
            password: 'DefaultPassword123!', // Default password for imported users
            role: row['Role'] || roles[0]?.id, // Use first role if not specified
            assignedBranch: row['Assigned Branch'] || undefined,
          };

          const response = await fetch(`${Base_url}users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
          });

          if (!response.ok) {
            throw new Error(`Failed to import user ${row['User Name']}`);
          }

          setImportProgress(50 + ((index + 1) / jsonData.length) * 40);
        } catch (err) {
          console.error(`Error importing user ${row['User Name']}:`, err);
          throw err;
        }
      });

      await Promise.all(importPromises);
      setImportProgress(100);
      toast.success(`Successfully imported ${jsonData.length} users`);
      
      // Reset file input and refresh data
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setImportProgress(null);
        fetchUsers();
      }, 2000);

    } catch (err) {
      console.error('Error importing users:', err);
      toast.error('Failed to import users');
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
      <Seo title="Users" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Users</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedUsers.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedUsers.length})
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
                <Link href="/users/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New User
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

                  {/* Email filter */}
                  <input
                    type="email"
                    className="form-control py-2 w-full sm:max-w-xs"
                    placeholder="Filter by email..."
                    value={filters.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        email: value,
                      }));
                      setCurrentPage(1);
                    }}
                  />

                  {/* Role filter */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={filters.role}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        role: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Roles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  {/* Branch filter */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={filters.branch}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        branch: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>

                  {/* Sort dropdown */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name:asc">Name (A-Z)</option>
                    <option value="name:desc">Name (Z-A)</option>
                    <option value="email:asc">Email (A-Z)</option>
                    <option value="email:desc">Email (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                  </select>

                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setFilters({
                        name: "",
                        email: "",
                        role: "",
                        branch: "",
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
                            checked={selectedUsers.length === users.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Assigned Branch</th>
                        <th className="px-4 py-3">Email Verified</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((user: User, index: number) => (
                          <tr
                            key={user.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleUserSelect(user.id)}
                              />
                            </td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className="badge bg-primary/10 text-primary">
                                {user.role?.name || 'N/A'}
                              </span>
                            </td>
                            <td>
                              {user.assignedBranch ? (
                                <span className="badge bg-secondary/10 text-secondary">
                                  {user.assignedBranch.name}
                                </span>
                              ) : (
                                <span className="text-gray-500">Not Assigned</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${user.isEmailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                {user.isEmailVerified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link
                                  href={`/users/edit/${user.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(user.id)}
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
                                <i className="ri-user-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Users Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first user.
                              </p>
                              <Link
                                href="/users/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add First User
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

export default UsersPage; 