"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import axios from "axios";
import { API_BASE_URL } from "@/shared/data/utilities/api";

interface TeamMember {
  id: string;
  name: string;
  phone: string;
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const TeamsPage = () => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams from API
  const fetchTeams = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE_URL}/team-members?page=${page}&limit=${limit}`
      );
      const data = response.data.results;

      // Transform the API response to match our TeamMember interface
      const transformedTeams = data.map((teamMember: any) => ({
        id: teamMember.id,
        name: teamMember.name,
        phone: teamMember.phone,
        email: teamMember.email,
        address: teamMember.address,
        branch: teamMember.branch,
        createdDate: formatDate(teamMember.createdAt),
        sortOrder: teamMember.sortOrder || 1,
      }));

      setTeams(transformedTeams);
      setTotalResults(response.data.totalResults || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teams");
      setTeams([]);
      setTotalResults(0);
      setTotalPages(1);
      toast.error("Failed to fetch teams");
    } finally {
      setIsLoading(false);
    }
  };

  // Call fetchTeams when component mounts
  useEffect(() => {
    fetchTeams(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

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

  const handleDelete = async (teamMemberId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/team-members/${teamMemberId}`);
      toast.success("Team member deleted successfully");
      setTeams((prevTeams) =>
        prevTeams.filter((teamMember) => teamMember.id !== teamMemberId)
      );
      setSelectedTeams(selectedTeams.filter((id) => id !== teamMemberId));
      toast.success("Team member deleted successfully");
    } catch (err) {
      toast.error("Failed to delete team member");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTeams.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedTeams.length} selected team member(s)?`
      )
    ) {
      try {
        let hasError = false;
        const deletePromises = selectedTeams.map(async (id) => {
          try {
            await axios.delete(`${API_BASE_URL}/team-members/${id}`);
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting team member ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(deletePromises);
        const successfulDeletes = results.filter(
          (id): id is string => id !== null
        );

        // Remove successfully deleted team members from the local state
        setTeams((prevTeams) =>
          prevTeams.filter((team) => !successfulDeletes.includes(team.id))
        );

        // Clear selected teams
        setSelectedTeams([]);
        setSelectAll(false);

        if (hasError) {
          toast.error("Some team members could not be deleted");
        } else {
          toast.success("Selected team members deleted successfully");
        }
      } catch (err) {
        console.error("Error in bulk delete:", err);
        toast.error("Failed to delete some team members");
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading("Importing team members...");
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

          let successCount = 0;
          let errorCount = 0;

          // Fetch all team members for upsert by name
          const allResponse = await axios.get(`${API_BASE_URL}/team-members`);
          const allData = allResponse.data;
          const allTeamMembers: TeamMember[] = allData.results || [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const teamMemberData = {
                name: row["Team Member Name"].toString().trim(),
                phone: (row["Team Member Phone Number"]).toString().trim(),
                email: row["Team Member Email"].toString().trim(),
                address: (row["Team Member Address"]).toString().trim(),
                branch: (row["Team Member Branch"]).toString().trim(),
                sortOrder: parseInt(row["Sort Order"]?.toString() || "1"),
              };

              let teamMemberId = row["ID"];
              if (!teamMemberId) {
                // Try to find by email (case-insensitive)
                const found = allTeamMembers.find(
                  (t) =>
                    t.email.trim().toLowerCase() ===
                    teamMemberData.email.trim().toLowerCase()
                );
                if (found) teamMemberId = found.id;
              }

              if (allTeamMembers.find((t) => t.id === teamMemberId)) {
                // Update existing
                await axios.patch(
                  `${API_BASE_URL}/team-members/${teamMemberId}`,
                  teamMemberData
                );
                successCount++;
              } else {
                // Create new
                await axios.post(
                  `${API_BASE_URL}/team-members`,
                  teamMemberData
                );
                successCount++;
              }
            } catch (error) {
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = "";
          setImportProgress(null);
          toast.dismiss(loadingToast);

          if (successCount > 0)
            toast.success(
              `Successfully imported/updated ${successCount} team members`
            );
          if (errorCount > 0)
            toast.error(`Failed to import/update ${errorCount} team members`);

          // Refresh the teams list
          fetchTeams();
        } catch (error) {
          setImportProgress(null);
          toast.error("Failed to process import file", { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setImportProgress(null);
      toast.error("Failed to import team members", { id: loadingToast });
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
      const response = await axios.get(`${API_BASE_URL}/team-members`);
      const data = response.data;
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const exportData = exportSource.map((teamMember: TeamMember) => ({
        ID: teamMember.id,
        "Team Member Name": teamMember.name,
        "Team Member Phone Number": teamMember.phone,
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
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedTeams.length})
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
                        currentTeams.map(
                          (teamMember: TeamMember, index: number) => (
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
                                  checked={selectedTeams.includes(
                                    teamMember.id
                                  )}
                                  onChange={() =>
                                    handleTeamSelect(teamMember.id)
                                  }
                                />
                              </td>
                              <td>{teamMember.name}</td>
                              <td>{teamMember.phone}</td>
                              <td>{teamMember.email}</td>
                              <td>{teamMember.address}</td>
                              <td>{teamMember.branch}</td>
                              <td>{teamMember.createdDate}</td>
                              <td>{teamMember.sortOrder}</td>
                              <td>
                                <div className="flex space-x-2">
                                  <Link
                                    href={`/teams/edit/${teamMember.id}`}
                                    className="ti-btn ti-btn-primary ti-btn-sm"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </Link>
                                  <button
                                    className="ti-btn ti-btn-danger ti-btn-sm"
                                    onClick={() => handleDelete(teamMember.id)}
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )
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
