"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

interface EntityMaster {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: EntityMaster[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "Entity Type Name": string;
  "Created At"?: string;
  "Updated At"?: string;
}

const EntityMasterPage = () => {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entities, setEntities] = useState<EntityMaster[]>([]);
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

  const fetchEntities = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
        ...(sortBy && { sortBy })
      });

      const response = await fetch(`${Base_url}entity-master?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entity types');
      }

      const data: ApiResponse = await response.json();
      setEntities(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity types');
      toast.error('Failed to fetch entity types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEntities(entities.map(entity => entity.id));
    } else {
      setSelectedEntities([]);
    }
  };

  const handleSelectEntity = (entityId: string) => {
    setSelectedEntities(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleDelete = async (entityId: string) => {
    if (!confirm('Are you sure you want to delete this entity type?')) return;

    try {
      const response = await fetch(`${Base_url}entity-master/${entityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete entity type');
      }

      toast.success('Entity type deleted successfully');
      fetchEntities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete entity type');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected entity types?')) return;

    try {
      await Promise.all(
        selectedEntities.map(entityId =>
          fetch(`${Base_url}entity-master/${entityId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        )
      );

      toast.success('Selected entity types deleted successfully');
      setSelectedEntities([]);
      fetchEntities();
    } catch (err) {
      toast.error('Failed to delete some entity types');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      if (selectedEntities.length > 0) {
        exportData = entities
          .filter(entity => selectedEntities.includes(entity.id))
          .map((entity: EntityMaster) => ({
            ID: entity.id,
            "Entity Type Name": entity.name,
            "Created At": entity.createdAt,
            "Updated At": entity.updatedAt
          }));
        successMessage = "Selected entity types exported successfully";
      } else {
        const response = await fetch(`${Base_url}entity-master?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch entity types for export');
        }

        const apiData: ApiResponse = await response.json();
        exportData = apiData.results.map((entity: EntityMaster) => ({
          ID: entity.id,
          "Entity Type Name": entity.name,
          "Created At": entity.createdAt,
          "Updated At": entity.updatedAt
        }));
        successMessage = "All entity types exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Entity Type Name
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Entity Type Masters");
      const fileName = `entity_type_masters_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting entity type masters:", error);
      toast.error("Failed to export entity type masters");
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
          const entityTypeMasters = jsonData.map(row => ({
            name: row["Entity Type Name"]
          }));

          // Single API call for bulk import
          const response = await fetch(`${Base_url}entity-master/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ entityTypeMasters })
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

          fetchEntities(); // Refresh the list
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

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Entity Master" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Entity Master</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedEntities.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedEntities.length})
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ti-btn ti-btn-success"
                >
                  <i className="ri-download-2-line me-2"></i>
                  Import
                </button>
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
                <Link
                  href="/settings/entity-master/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i>
                  Add New Entity Type
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
                          name: value
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
                  </select>

                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setFilters({
                        name: ""
                      });
                      setSortBy("name:asc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Entity Types Table */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap table-bordered">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedEntities.length === entities.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Created At</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="text-center text-red-500 py-4">
                          {error}
                        </td>
                      </tr>
                    ) : entities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                              <i className="ri-government-line text-4xl text-primary"></i>
                            </div>
                            <h3 className="text-xl font-medium mb-2">
                              No Entity Types Found
                            </h3>
                            <p className="text-gray-500 text-center mb-6">
                              Start by adding your first entity type.
                            </p>
                            <Link
                              href="/settings/entity-master/add"
                              className="ti-btn ti-btn-primary"
                            >
                              <i className="ri-add-line me-2"></i> Add First Entity Type
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      entities.map((entity) => (
                        <tr key={entity.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedEntities.includes(entity.id)}
                              onChange={() => handleSelectEntity(entity.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td>{entity.name}</td>
                          <td>{new Date(entity.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDelete(entity.id)}
                                className="ti-btn ti-btn-danger ti-btn-sm"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

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

export default EntityMasterPage;
