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
    assignedBranch: "",
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
        ...(filters.assignedBranch && { assignedBranch: filters.assignedBranch }),
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

  const hasActiveFilters = !!(filters.name || filters.email || filters.role || filters.assignedBranch);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Users" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Users</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedUsers.length > 0 && (
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" onClick={handleDeleteSelected}>
                    <i className="ri-delete-bin-line text-xs" /> Delete Selected ({selectedUsers.length})
                  </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
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
                <Link href="/users/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                  <i className="ri-add-line text-xs" /> Add New User
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700">Total</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{totalResults}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-purple-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">On page</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{users.length}</p>
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
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedUsers.length}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-amber-600 text-sm" />
                </div>
              </div>
            </div>
          </div>

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
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <input type="text" className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 w-full sm:max-w-[140px]" placeholder="Name..." value={filters.name} onChange={(e) => { setFilters(prev => ({ ...prev, name: e.target.value })); setCurrentPage(1); }} />
                  <input type="email" className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 w-full sm:max-w-[140px]" placeholder="Email..." value={filters.email} onChange={(e) => { setFilters(prev => ({ ...prev, email: e.target.value })); setCurrentPage(1); }} />
                  <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[100px]" value={filters.role} onChange={(e) => { setFilters(prev => ({ ...prev, role: e.target.value })); setCurrentPage(1); }}>
                    <option value="">All Roles</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[100px]" value={filters.assignedBranch} onChange={(e) => { setFilters(prev => ({ ...prev, assignedBranch: e.target.value })); setCurrentPage(1); }}>
                    <option value="">All Branches</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name:asc">Name (A-Z)</option>
                    <option value="name:desc">Name (Z-A)</option>
                    <option value="email:asc">Email (A-Z)</option>
                    <option value="email:desc">Email (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                  </select>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100" onClick={() => { setFilters({ name: "", email: "", role: "", assignedBranch: "" }); setSortBy("name:asc"); }}>
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-sky-700">Filters active</span>
                    <button onClick={() => { setFilters({ name: "", email: "", role: "", assignedBranch: "" }); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800"><i className="ri-close-line text-xs" /> Clear</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[200px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedUsers.length === users.length && users.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Email</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Role</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Branch</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Verified</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created</th>
                      <th className="pl-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                            <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase">Loading</p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-user-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO USERS</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No users match your filters." : "Start by adding your first user."}</p>
                            {hasActiveFilters ? (
                              <button onClick={() => { setFilters({ name: "", email: "", role: "", assignedBranch: "" }); setCurrentPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-refresh-line text-xs" /> Clear Filters</button>
                            ) : (
                              <Link href="/users/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-add-line text-xs" /> Add First User</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user: User) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleUserSelect(user.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{user.name}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{user.email}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">{user.role?.name || "N/A"}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{user.assignedBranch?.name || "—"}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${user.isEmailVerified ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>{user.isEmailVerified ? "Verified" : "Pending"}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <Link href={`/users/edit/${user.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit"><i className="ri-pencil-line text-sm" /></Link>
                              <button type="button" onClick={() => handleDelete(user.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && users.length > 0 && (
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
    </div>
  );
};

export default UsersPage; 