"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

interface TeamMember {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  branch: string;
  createdDate: string;
  sortOrder: number;
}

interface ExcelRow {
  ID?: string;
  "Team Member Name": string;
  "Team Member Phone Number": string;
  "Team Member Email": string;
  "Team Member Address": string;
  "Team Member Branch": string;
  "Created Date": string;
  "Sort Order"?: string | number;
}

const TeamsPage = () => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [teams, setTeams] = useState<TeamMember[]>([
    {
      id: "1",
      name: "Vinod Sanghal",
      phoneNumber: "+91-9877543270",
      email: "vinod.sanghal@example.com",
      address: "123 Park Street, Jaipur, Rajasthan",
      branch: "VSC Jaipur",
      createdDate: "19 March 2025",
      sortOrder: 1,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false); // Initially set to true when API integrated
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(1); // Initially set to 0 when API integrated
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(filteredTeams.map((teamMember) => teamMember.id));
    }
    setSelectAll(!selectAll);
  };

  const handleTeamSelect = (teamMemberId: string) => {
    if (selectedTeams.includes(teamMemberId)) {
      setSelectedTeams(selectedTeams.filter((id) => id !== teamMemberId));
    } else {
      setSelectedTeams([...selectedTeams, teamMemberId]);
    }
  };

  // Filter teams based on search query
  const filteredTeams = teams.filter((teamMember) =>
    teamMember.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate current teams for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTeams = filteredTeams.slice(startIndex, endIndex);

  const handleExport = async () => {
    try {
      // Always fetch all categories for export
      // const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
      // if (!response.ok) throw new Error('Failed to fetch all categories for export');
      // const data = await response.json();
      const exportSource = Array.isArray(teams) ? teams : [];
      const exportData = exportSource.map((teamMember: TeamMember) => ({
        ID: teamMember.id,
        "Team Member Name": teamMember.name,
        "Team Member Phone Number": teamMember.phoneNumber,
        "Team Member Email": teamMember.email,
        "Team Member Address": teamMember.address,
        "Team Member Branch": teamMember.branch,
        "Created Date": teamMember.createdDate,
        "Sort Order": teamMember.sortOrder,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Teams");
      const fileName = `teams_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Teams exported successfully");
    } catch (error) {
      console.error("Error exporting teams:", error);
      toast.error("Failed to export teams");
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
      <Seo title="Teams" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Teams</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedTeams.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    // onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedTeams.length})
                  </button>
                )}
                {/* Import/Export Buttons */}
                <div className="relative group">
                  <input
                    type="file"
                    // ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    // onChange={handleImport}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-success"
                    // onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ri-upload-2-line me-2"></i> Import
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
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/teams/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Team Member
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">
                    Rows per page:
                  </label>
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
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by team member name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
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
                        <th scope="col" className="!text-start">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">
                          Team Member Name
                        </th>
                        <th scope="col" className="text-start">
                          Team Member Phone Number
                        </th>
                        <th scope="col" className="text-start">
                          Team Member Email
                        </th>
                        <th scope="col" className="text-start">
                          Team Member Address
                        </th>
                        <th scope="col" className="text-start">
                          Team Member Branch
                        </th>
                        <th scope="col" className="text-start">
                          Created Date
                        </th>
                        <th scope="col" className="text-start">
                          Sort Order
                        </th>
                        <th scope="col" className="text-start">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTeams.length > 0 ? (
                        currentTeams.map((teamMember: TeamMember, index: number) => (
                          <tr
                            key={teamMember.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedTeams.includes(teamMember.id)}
                                onChange={() => handleTeamSelect(teamMember.id)}
                              />
                            </td>
                            <td>{teamMember.name}</td>
                            <td>{teamMember.phoneNumber}</td>
                            <td>{teamMember.email}</td>
                            <td>{teamMember.address}</td>
                            <td>{teamMember.branch}</td>
                            <td>{teamMember.createdDate}</td>
                            <td>{teamMember.sortOrder}</td>
                            <td>
                              <div className="flex space-x-2">
                                {/* <Link
                                  href={`/catalog/teams/edit/${teamMember.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                > */}
                                {/* Wrapper div temporarily used for styling */}
                                <div className="ti-btn ti-btn-primary ti-btn-sm">
                                  <i className="ri-edit-line"></i>
                                </div>
                                {/* </Link> */}
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  // onClick={() => handleDelete(teamMember.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
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
                                No Teams Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first team member.
                              </p>
                              <Link
                                href="/teams/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add First
                                Team Member
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

export default TeamsPage;
