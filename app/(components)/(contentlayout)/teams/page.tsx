"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";

interface Branch {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  branch: Branch;
  sortOrder: number;
  skills: Activity[];
  createdAt: string;
  updatedAt: string;
}

interface ExcelRow {
  ID?: string;
  "Name": string;
  "Email": string;
  "Phone": string;
  "Address": string;
  "Branch": string;
  "City": string;
  "State": string;
  "Country": string;
  "Pin Code": string;
  "Skills": string;
  "Sort Order": number;
}

interface ApiResponse {
  results: TeamMember[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
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
  // const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    branch: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    skills: [] as string[],
  });
  const [sortBy, setSortBy] = useState("name:asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedMemberSkills, setSelectedMemberSkills] = useState<Activity[]>([]);

  // Fetch teams from API
  const fetchTeams = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.phone && { phone: filters.phone }),
        ...(filters.branch && { branch: filters.branch }),
        ...(filters.city && { city: filters.city }),
        ...(filters.state && { state: filters.state }),
        ...(filters.country && { country: filters.country }),
        ...(filters.pinCode && { pinCode: filters.pinCode }),
        ...(filters.skills.length > 0 && { skills: filters.skills.join(",") }),
      });

      const response = await axios.get<ApiResponse>(
        `${Base_url}team-members?${queryParams.toString()}`
      );

      setTeams(response.data.results);
      setTotalResults(response.data.totalResults);
      setTotalPages(response.data.totalPages);
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

  // Call fetchTeams when component mounts or when filters/sort changes
  useEffect(() => {
    fetchTeams(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(teams.map((teamMember) => teamMember.id));
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
      await axios.delete(`${Base_url}team-members/${teamMemberId}`);
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
            await axios.delete(`${Base_url}team-members/${id}`);
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

          // Fetch all branches and activities for reference
          const [branchesResponse, activitiesResponse] = await Promise.all([
            axios.get(`${Base_url}branches`),
            axios.get(`${Base_url}activities`)
          ]);

          const branches = branchesResponse.data.results;
          const activities = activitiesResponse.data.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              // Find branch ID by name
              const branch = branches.find((b: Branch) => 
                b.name.toLowerCase() === row["Branch"].toLowerCase()
              );

              if (!branch) {
                throw new Error(`Branch not found: ${row["Branch"]}`);
              }

              // Find skill IDs by names
              const skillNames = row["Skills"].split(',').map((s: string) => s.trim());
              const skillIds = activities
                .filter((a: Activity) => skillNames.includes(a.name))
                .map((a: Activity) => a.id);

              if (skillIds.length === 0) {
                throw new Error(`No valid skills found for: ${row["Name"]}`);
              }

              // Ensure phone is a string and handle potential number format
              const phoneNumber = row["Phone"] ? String(row["Phone"]).replace(/[^0-9+]/g, '') : '';

              const teamMemberData = {
                name: row["Name"],
                email: row["Email"],
                phone: phoneNumber,
                address: row["Address"],
                city: row["City"],
                state: row["State"],
                country: row["Country"],
                pinCode: row["Pin Code"],
                branch: branch.id,
                sortOrder: row["Sort Order"] || 1,
                skills: skillIds
              };

              if (row["ID"]) {
                // Update existing team member
                await axios.patch(
                  `${Base_url}team-members/${row["ID"]}`,
                  teamMemberData
                );
              } else {
                // Add new team member
                await axios.post(
                  `${Base_url}team-members`,
                  teamMemberData
                );
              }
              successCount++;
            } catch (error) {
              console.error('Error processing row:', error);
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = "";
          setImportProgress(null);
          toast.dismiss(loadingToast);

          if (successCount > 0) {
            toast.success(`Successfully imported/updated ${successCount} team members`);
          }
          if (errorCount > 0) {
            toast.error(`Failed to import/update ${errorCount} team members`);
          }

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
  // const filteredTeams = teams.filter((teamMember) =>
  //   teamMember.name.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  // Calculate current teams for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTeams = teams.slice(startIndex, endIndex);

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      // Only export selected teams if any are selected
      if (selectedTeams.length > 0) {
        exportData = teams
          .filter(team => selectedTeams.includes(team.id))
          .map((team: TeamMember) => ({
            ID: team.id,
            "Name": team.name,
            "Email": team.email,
            "Phone": team.phone,
            "Address": team.address,
            "Branch": team.branch.name,
            "City": team.city,
            "State": team.state,
            "Country": team.country,
            "Pin Code": team.pinCode,
            "Skills": team.skills.map(skill => skill.name).join(', '),
            "Sort Order": team.sortOrder
          }));
        successMessage = "Selected team members exported successfully";
      } else {
        // Export all teams if none are selected
        const response = await axios.get(`${Base_url}team-members?limit=1000`);
        const apiData: ApiResponse = response.data;
        exportData = apiData.results.map((team: TeamMember) => ({
          ID: team.id,
          "Name": team.name,
          "Email": team.email,
          "Phone": team.phone,
          "Address": team.address,
          "Branch": team.branch.name,
          "City": team.city,
          "State": team.state,
          "Country": team.country,
          "Pin Code": team.pinCode,
          "Skills": team.skills.map(skill => skill.name).join(', '),
          "Sort Order": team.sortOrder
        }));
        successMessage = "All team members exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Phone
        { wch: 40 }, // Address
        { wch: 20 }, // Branch
        { wch: 20 }, // City
        { wch: 20 }, // State
        { wch: 20 }, // Country
        { wch: 15 }, // Pin Code
        { wch: 40 }, // Skills
        { wch: 15 }, // Sort Order
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Team Members");
      const fileName = `team_members_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting team members:", error);
      toast.error("Failed to export team members");
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

  const handleViewSkills = (skills: Activity[]) => {
    setSelectedMemberSkills(skills);
    setShowSkillsModal(true);
  };

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
                <Link href="/teams/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Team Member
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar and Filters */}
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
                        branch: "",
                        city: "",
                        state: "",
                        country: "",
                        pinCode: "",
                        skills: [],
                      });
                      setSortBy("createdAt:desc");
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
                        <th scope="col" className="!text-start">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">Name</th>
                        <th scope="col" className="text-start">Email</th>
                        <th scope="col" className="text-start">Phone</th>
                        <th scope="col" className="text-start">Branch</th>
                        <th scope="col" className="text-start">City</th>
                        <th scope="col" className="text-start">State</th>
                        <th scope="col" className="text-start">Country</th>
                        <th scope="col" className="text-start">Pin Code</th>
                        <th scope="col" className="text-start">Skills</th>
                        <th scope="col" className="text-start">Created Date</th>
                        <th scope="col" className="text-start">Sort Order</th>
                        <th scope="col" className="text-start">Action</th>
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
                            <td>{teamMember.email}</td>
                            <td>{teamMember.phone}</td>
                            <td>{teamMember?.branch?.name || '-'}</td>
                            <td>{teamMember.city}</td>
                            <td>{teamMember.state}</td>
                            <td>{teamMember.country}</td>
                            <td>{teamMember.pinCode}</td>
                            <td>
                              <button
                                onClick={() => handleViewSkills(teamMember.skills)}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                title="View Skills"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                            </td>
                            <td>{formatDate(teamMember.createdAt)}</td>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={13} className="text-center py-8">
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

      {/* Add Skills Modal */}
      {showSkillsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Skills</h3>
              <button
                onClick={() => setShowSkillsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="space-y-2">
              {selectedMemberSkills.map((skill) => (
                <div key={skill.id} className="flex items-center p-2 bg-gray-50 rounded">
                  <i className="ri-check-line text-primary mr-2"></i>
                  <span>{skill.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSkillsModal(false)}
                className="ti-btn ti-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
