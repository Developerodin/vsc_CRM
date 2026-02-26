"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

interface BusinessMaster {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: BusinessMaster[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "Business Type Name": string;
  "Created At"?: string;
  "Updated At"?: string;
}

const BusinessMasterPage = () => {
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [businesses, setBusinesses] = useState<BusinessMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    name: ""
  });

  const fetchBusinesses = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
        ...(sortBy && { sortBy })
      });

      const response = await fetch(`${Base_url}business-master?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch business types');
      }

      const data: ApiResponse = await response.json();
      setBusinesses(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch business types');
      toast.error('Failed to fetch business types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBusinesses(businesses.map(business => business.id));
    } else {
      setSelectedBusinesses([]);
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const handleDelete = async (businessId: string) => {
    if (!confirm('Are you sure you want to delete this business type?')) return;

    try {
      const response = await fetch(`${Base_url}business-master/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete business type');
      }

      toast.success('Business type deleted successfully');
      fetchBusinesses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete business type');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected business types?')) return;

    try {
      await Promise.all(
        selectedBusinesses.map(businessId =>
          fetch(`${Base_url}business-master/${businessId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        )
      );

      toast.success('Selected business types deleted successfully');
      setSelectedBusinesses([]);
      fetchBusinesses();
    } catch (err) {
      toast.error('Failed to delete some business types');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedBusinesses.length > 0) {
        exportData = businesses
          .filter(business => selectedBusinesses.includes(business.id))
          .map((business: BusinessMaster) => ({
            ID: business.id,
            "Business Type Name": business.name,
            "Created At": business.createdAt,
            "Updated At": business.updatedAt
          }));
        successMessage = "Selected business types exported successfully";
      } else {
        const response = await fetch(`${Base_url}business-master?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch business types for export');
        }

        const apiData: ApiResponse = await response.json();
        exportData = apiData.results.map((business: BusinessMaster) => ({
          ID: business.id,
          "Business Type Name": business.name,
          "Created At": business.createdAt,
          "Updated At": business.updatedAt
        }));
        successMessage = "All business types exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Business Type Name
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Business Masters");
      const fileName = `business_masters_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting business masters:", error);
      toast.error("Failed to export business masters");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

          if (jsonData.length === 0) {
            toast.error('No data found in the file');
            return;
          }

          // Transform data for bulk import
          const businessMasters = jsonData.map(row => ({
            name: row["Business Type Name"]
          }));

          // Single API call for bulk import
          const response = await fetch(`${Base_url}business-master/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ businessMasters })
          });

          if (!response.ok) {
            throw new Error('Bulk import failed');
          }

          const result = await response.json();
          
          if (result.errors && result.errors.length > 0) {
            toast.error(`Import completed with ${result.errors.length} errors`);
            console.log('Import errors:', result.errors);
          } else {
            toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
          }

          fetchBusinesses(); // Refresh the list
        } catch (err) {
          console.error('Error processing file:', err);
          toast.error('Failed to process file');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error reading file:', err);
      toast.error('Failed to read file');
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
      <Seo title="Business Master" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Business Master</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedBusinesses.length > 0 && (
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" onClick={handleDeleteSelected}>
                    <i className="ri-delete-bin-line text-xs" /> Delete Selected ({selectedBusinesses.length})
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
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
                <Link href="/settings/business-master/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                  <i className="ri-add-line text-xs" /> Add New Business Type
                </Link>
              </div>
            </div>
          </div>

          {/* Summary card */}
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
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{businesses.length}</p>
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
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedBusinesses.length}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-amber-600 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Box – timelines-style */}
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
                  </select>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100" onClick={() => { setFilters({ name: "" }); setSortBy("name:asc"); }}>
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-sky-700">Active filter: Name — {filters.name}</span>
                    <button onClick={() => { setFilters({ name: "" }); setCurrentPage(1); }} className="text-[11px] font-bold text-sky-600 hover:text-sky-800"><i className="ri-close-line text-xs" /> Clear</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[200px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedBusinesses.length === businesses.length && businesses.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                      <th className="pl-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                            <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase">Loading</p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
                      </tr>
                    ) : businesses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-building-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO BUSINESS TYPES</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No items match your filter." : "Start by adding your first business type."}</p>
                            {hasActiveFilters ? (
                              <button onClick={() => { setFilters({ name: "" }); setCurrentPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-refresh-line text-xs" /> Clear Filter</button>
                            ) : (
                              <Link href="/settings/business-master/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-add-line text-xs" /> Add First</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      businesses.map((business) => (
                        <tr key={business.id} className="hover:bg-gray-50/50 group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedBusinesses.includes(business.id)} onChange={() => handleSelectBusiness(business.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{business.name}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{new Date(business.createdAt).toLocaleDateString()}</td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end">
                              <button type="button" onClick={() => handleDelete(business.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && businesses.length > 0 && (
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

export default BusinessMasterPage;
