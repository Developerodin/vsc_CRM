"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from "axios";

interface Branch {
  id: string;
  name: string;
  branchHead: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ExcelRow {
  ID?: string;
  "Branch Name": string;
  "Branch Head": string;
  "Email": string;
  "Phone": string;
  "Address": string;
  "City": string;
  "State": string;
  "Country": string;
  "Pin Code": string;
  "Sort Order": number;
}

interface ImportRow {
  "Branch Name": string;
  "Branch Head": string;
  "Email": string;
  "Phone": string;
  "Address": string;
  "City": string;
  "State": string;
  "Country": string;
  "Pin Code": string;
  "Sort Order"?: string | number;
}

const BranchesPage = () => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    name: "",
    city: "",
    state: "",
    country: "",
    pinCode: ""
  });
  const [sortBy, setSortBy] = useState("name:asc");

  // Fetch branches
  const fetchBranches = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name })
      });

      const response = await fetch(`${Base_url}branches?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }

      const data = await response.json();
      setBranches(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      toast.error('Failed to fetch branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = () => {
    if (!selectAll) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map((branch) => branch.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBranchSelect = (branchId: string) => {
    if (selectedBranches.includes(branchId)) {
      setSelectedBranches(selectedBranches.filter((id) => id !== branchId));
    } else {
      setSelectedBranches([...selectedBranches, branchId]);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
      const response = await fetch(`${Base_url}branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete branch');
      }

      toast.success('Branch deleted successfully');
      fetchBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedBranches.length} branches?`)) return;

    try {
      const deletePromises = selectedBranches.map(branchId =>
        fetch(`${Base_url}branches/${branchId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      toast.success('Selected branches deleted successfully');
      setSelectedBranches([]);
      fetchBranches();
    } catch (err) {
      toast.error('Failed to delete selected branches');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedBranches.length > 0) {
        exportData = branches
          .filter(branch => selectedBranches.includes(branch.id))
          .map((branch: Branch) => ({
            ID: branch.id,
            "Branch Name": branch.name,
            "Branch Head": branch.branchHead,
            "Email": branch.email,
            "Phone": branch.phone,
            "Address": branch.address,
            "City": branch.city,
            "State": branch.state,
            "Country": branch.country,
            "Pin Code": branch.pinCode,
            "Sort Order": branch.sortOrder
          }));
        successMessage = "Selected branches exported successfully";
      } else {
        const response = await axios.get(`${Base_url}branches?limit=1000`);
        const apiData = response.data;
        exportData = apiData.results.map((branch: Branch) => ({
          ID: branch.id,
          "Branch Name": branch.name,
          "Branch Head": branch.branchHead,
          "Email": branch.email,
          "Phone": branch.phone,
          "Address": branch.address,
          "City": branch.city,
          "State": branch.state,
          "Country": branch.country,
          "Pin Code": branch.pinCode,
          "Sort Order": branch.sortOrder
        }));
        successMessage = "All branches exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Branch Name
        { wch: 30 }, // Branch Head
        { wch: 30 }, // Email
        { wch: 20 }, // Phone
        { wch: 40 }, // Address
        { wch: 20 }, // City
        { wch: 20 }, // State
        { wch: 20 }, // Country
        { wch: 15 }, // Pin Code
        { wch: 15 }, // Sort Order
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Branches");
      const fileName = `branches_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting branches:", error);
      toast.error("Failed to export branches");
    }
  };

 const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setImportProgress(0);
  const loadingToast = toast.loading("Importing branches...");

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

        // Fetch all branches for upsert by name
        const allResponse = await axios.get(`${Base_url}branches`);
        const allData = allResponse.data;
        const allBranches: Branch[] = allData.results || [];

        // Transform data for bulk import
        const branches = jsonData.map((row, index) => {
          const branchData = {
            name: row["Branch Name"].toString().trim(),
            branchHead: row["Branch Head"]?.toString().trim() || undefined,
            email: row["Email"].toString().trim(),
            phone: String(row["Phone"]).replace(/[^0-9+]/g, ''),
            address: row["Address"].toString().trim(),
            city: row["City"].toString().trim(),
            state: row["State"].toString().trim(),
            country: row["Country"].toString().trim(),
            pinCode: row["Pin Code"].toString().trim(),
            sortOrder: parseInt(row["Sort Order"]?.toString() || "1")
          };

          let branchId = row["ID"];
          if (!branchId) {
            // Try to find by name (case-insensitive)
            const found = allBranches.find(
              (b) =>
                b.name.trim().toLowerCase() ===
                branchData.name.trim().toLowerCase()
            );
            if (found) branchId = found.id;
          }

          return {
            ...(branchId && { id: branchId }),
            ...branchData
          };
        });

        // Single API call instead of multiple requests
        const response = await axios.post(
          `${Base_url}branches/bulk-import`,
          { branches },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        const result = response.data;
        
        if (fileInputRef.current) fileInputRef.current.value = "";
        setImportProgress(null);
        toast.dismiss(loadingToast);

        if (result.errors && result.errors.length > 0) {
          toast.error(`Import completed with ${result.errors.length} errors`);
          console.log('Import errors:', result.errors);
        } else {
          toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
        }

        // Refresh the branches list
        fetchBranches();
      } catch (error) {
        setImportProgress(null);
        toast.error("Failed to process import file", { id: loadingToast });
        console.error('Error processing file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    setImportProgress(null);
    toast.error("Failed to import branches", { id: loadingToast });
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

  const hasActiveFilters = !!filters.name;

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Branches" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Branches</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedBranches.length > 0 && (
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" onClick={handleDeleteSelected}>
                    <i className="ri-delete-bin-line text-xs" /> Delete Selected ({selectedBranches.length})
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
                <Link href="/branches/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                  <i className="ri-add-line text-xs" /> Add New Branch
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
                  <i className="ri-building-line text-purple-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">On page</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{branches.length}</p>
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
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedBranches.length}</p>
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
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100" onClick={() => { setFilters({ name: "", city: "", state: "", country: "", pinCode: "" }); setSortBy("name:asc"); }}>
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-sky-700">Active filter: Name — {filters.name}</span>
                    <button onClick={() => { setFilters({ name: "", city: "", state: "", country: "", pinCode: "" }); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800"><i className="ri-close-line text-xs" /> Clear</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[200px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedBranches.length === branches.length && branches.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Head / Email</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">City / State</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created</th>
                      <th className="pl-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                            <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase">Loading</p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={6} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
                      </tr>
                    ) : branches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-building-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO BRANCHES</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No branches match your filter." : "Start by adding your first branch."}</p>
                            {hasActiveFilters ? (
                              <button onClick={() => { setFilters({ name: "", city: "", state: "", country: "", pinCode: "" }); setCurrentPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-refresh-line text-xs" /> Clear Filter</button>
                            ) : (
                              <Link href="/branches/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-add-line text-xs" /> Add First Branch</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      branches.map((branch: Branch) => (
                        <tr key={branch.id} className="hover:bg-gray-50/50 group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedBranches.includes(branch.id)} onChange={() => handleBranchSelect(branch.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{branch.name}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="text-[12px] font-medium text-[#323251]">{branch.branchHead || "-"}</div>
                            <div className="text-[11px] text-[#495057]">{branch.email}</div>
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{branch.city}, {branch.state}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{new Date(branch.createdAt).toLocaleDateString()}</td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <Link href={`/branches/edit/${branch.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit"><i className="ri-pencil-line text-sm" /></Link>
                              <button type="button" onClick={() => handleDelete(branch.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && branches.length > 0 && (
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

export default BranchesPage;