"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [emailForm, setEmailForm] = useState({
    taskTitle: '',
    taskDescription: '',
    assignedBy: 'Super Admin',
    dueDate: '',
    priority: 'medium'
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
        `${Base_url}team-members?${queryParams.toString()}`,{
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
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
      await axios.delete(`${Base_url}team-members/${teamMemberId}`,{
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
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
            await axios.delete(`${Base_url}team-members/${id}`,{
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
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

        // Fetch all branches and activities for reference
        const [branchesResponse, activitiesResponse] = await Promise.all([
          axios.get(`${Base_url}branches`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          axios.get(`${Base_url}activities`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ]);

        const branches = branchesResponse.data.results;
        const activities = activitiesResponse.data.results;

        // Transform data for bulk import
        const teamMembers = jsonData.map((row, index) => {
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

          return {
            ...(row["ID"] && { id: row["ID"] }),
            ...teamMemberData
          };
        });

        // Single API call instead of multiple requests
        const response = await axios.post(
          `${Base_url}team-members/bulk-import`,
          { teamMembers },
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

        // Refresh the teams list
        fetchTeams();
      } catch (error) {
        setImportProgress(null);
        toast.error("Failed to process import file", { id: loadingToast });
        console.error('Error processing file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    setImportProgress(null);
    toast.error("Failed to import team members", { id: loadingToast });
    console.error('Error reading file:', error);
  }
};

  // Filter teams based on search query
  // const filteredTeams = teams.filter((teamMember) =>
  //   teamMember.name.toLowerCase().includes(searchQuery.toLowerCase())
  // );

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
        const response = await axios.get(`${Base_url}team-members?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
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

  const handleSendEmail = (teamMember: TeamMember) => {
    setSelectedTeamMember(teamMember);
    setEmailForm({
      taskTitle: '',
      taskDescription: '',
      assignedBy: 'Super Admin',
      dueDate: '',
      priority: 'medium'
    });
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async () => {
    if (!selectedTeamMember || !emailForm.taskTitle || !emailForm.taskDescription || !emailForm.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSendingEmail(true);
    try {
      const emailData = {
        to: selectedTeamMember.email,
        taskTitle: emailForm.taskTitle,
        taskDescription: emailForm.taskDescription,
        assignedBy: emailForm.assignedBy,
        dueDate: emailForm.dueDate,
        priority: emailForm.priority
      };

      await axios.post(`${Base_url}common-email/task-assignment`, emailData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Task assignment email sent successfully');
      setShowEmailModal(false);
      setSelectedTeamMember(null);
      setEmailForm({
        taskTitle: '',
        taskDescription: '',
        assignedBy: 'Super Admin',
        dueDate: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== "");

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Teams" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header – timelines-style: accent bar, 14px bold title, 11px bold buttons */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Teams</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedTeams.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line text-xs" />
                    Delete Selected ({selectedTeams.length})
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                />
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="ri-download-2-line text-xs" /> Import
                </button>
                {importProgress !== null && (
                  <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                    <div className="bg-purple-600 h-full transition-all duration-200" style={{ width: `${importProgress}%` }} />
                    <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                  </div>
                )}
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                  onClick={handleExport}
                >
                  <i className="ri-upload-2-line text-xs" /> Export
                </button>
                <Link
                  href="/teams/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                >
                  <i className="ri-add-line text-xs" />
                  Add New Team Member
                </Link>
              </div>
            </div>
          </div>

          {/* Summary card – single total card to match timelines card style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700">Total Members</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{totalResults}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-group-line text-purple-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">On this page</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{teams.length}</p>
                </div>
                <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-sky-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700">Selected</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedTeams.length}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-amber-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700">Page</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{currentPage} / {totalPages || 1}</p>
                </div>
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                  <i className="ri-file-list-3-line text-emerald-600 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Box – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
            <div className="p-[10px]">
              {/* Search and Sort – 11px inputs, gray-200 border */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <div className="flex items-center w-full lg:w-auto gap-2">
                  <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <input
                    type="text"
                    className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium w-full sm:max-w-[200px]"
                    placeholder="Search by name..."
                    value={filters.name}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, name: e.target.value }));
                      setCurrentPage(1);
                    }}
                  />
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 w-full sm:w-auto min-w-[100px]"
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
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 shadow-sm w-full sm:w-auto"
                    onClick={() => {
                      setFilters({ name: "", email: "", phone: "", branch: "", city: "", state: "", country: "", pinCode: "", skills: [] });
                      setSortBy("name:asc");
                    }}
                  >
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>
              </div>

              {/* Active filters bar */}
              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[11px] font-bold text-sky-700">Active Filters:</span>
                      {filters.name && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">Name: {filters.name}</span>}
                      {filters.branch && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">Branch: {filters.branch}</span>}
                    </div>
                    <button
                      onClick={() => { setFilters({ name: "", email: "", phone: "", branch: "", city: "", state: "", country: "", pinCode: "", skills: [] }); setCurrentPage(1); }}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-800"
                    >
                      <i className="ri-close-line text-xs" /> Clear All
                    </button>
                  </div>
                </div>
              )}

              {/* Table – gray-50/30 header, 11px uppercase th, 12px td, compact action buttons */}
              <div className="overflow-x-auto min-h-[300px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectAll} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Team Member</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Address</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Skills</th>
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
                            <p className="mt-3 text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={6} className="text-center text-red-600 py-20 text-[12px] font-medium border border-gray-200">{error}</td>
                      </tr>
                    ) : teams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-group-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO TEAM MEMBERS</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No members match your filters." : "Start by adding your first team member."}</p>
                            {hasActiveFilters ? (
                              <button onClick={() => { setFilters({ name: "", email: "", phone: "", branch: "", city: "", state: "", country: "", pinCode: "", skills: [] }); setCurrentPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700">
                                <i className="ri-refresh-line text-xs" /> Clear Filters
                              </button>
                            ) : (
                              <Link href="/teams/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700">
                                <i className="ri-add-line text-xs" /> Add First Team Member
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      teams.map((teamMember: TeamMember) => (
                        <tr key={teamMember.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedTeams.includes(teamMember.id)} onChange={() => handleTeamSelect(teamMember.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="space-y-0.5 text-[12px]">
                              <button onClick={() => router.push(`/analytics/team-members/${teamMember.id}/overview`)} className="font-medium text-[#323251] hover:text-purple-600 cursor-pointer text-left">
                                {teamMember.name}
                              </button>
                              <div className="text-[11px] text-[#495057]">{teamMember.email}</div>
                              <div className="text-[11px] text-[#495057]">{teamMember.phone}</div>
                              <div className="text-[11px] text-[#495057] flex items-center gap-1">
                                <i className="ri-building-line text-[10px]" />
                                {teamMember?.branch?.name || "-"}
                              </div>
                            </div>
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">
                            <div className="space-y-0.5">
                              <div>{teamMember.city}</div>
                              <div className="text-[11px] text-[#495057]">{teamMember.state} {teamMember.country}</div>
                              <div className="text-[11px] text-[#495057]">{teamMember.pinCode}</div>
                            </div>
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <button type="button" onClick={() => handleViewSkills(teamMember.skills)} className="w-7 h-7 rounded flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100" title="View Skills">
                              <i className="ri-eye-line text-sm" />
                            </button>
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{formatDate(teamMember.createdAt)}</td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Link href={`/teams/edit/${teamMember.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit">
                                <i className="ri-pencil-line text-sm" />
                              </Link>
                              <button type="button" onClick={() => handleSendEmail(teamMember)} className="w-7 h-7 rounded flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100" title="Send Email">
                                <i className="ri-mail-line text-sm" />
                              </button>
                              <button type="button" onClick={() => handleDelete(teamMember.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete">
                                <i className="ri-delete-bin-line text-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination – 11px bold, purple active */}
              {!isLoading && !error && teams.length > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-4 p-[10px] pt-4 border-t border-gray-100">
                  <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                  </div>
                  <nav className="flex flex-wrap items-center gap-1">
                    <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                    {getPagination(currentPage, totalPages).map((page, idx) =>
                      page === "..." ? (
                        <span key={"ellipsis-" + idx} className="px-2 text-[10px] text-gray-300">...</span>
                      ) : (
                        <button
                          key={page}
                          className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === page ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
                          onClick={() => setCurrentPage(Number(page))}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Drawer – slide from right, timelines-style */}
      {showSkillsModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowSkillsModal(false)} aria-hidden />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Skills</h3>
              <button type="button" onClick={() => setShowSkillsModal(false)} className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <div className="space-y-2">
                {selectedMemberSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center p-3 bg-gray-50 border border-gray-100 rounded text-[12px] font-medium text-[#323251]">
                    <i className="ri-check-line text-purple-600 mr-2 text-sm" />
                    {skill.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-[10px] border-t border-gray-200">
              <button type="button" onClick={() => setShowSkillsModal(false)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Email Drawer – slide from right, timelines-style */}
      {showEmailModal && selectedTeamMember && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowEmailModal(false)} aria-hidden />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Send Task Assignment Email</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded">
                <p className="text-[11px] font-medium text-sky-800">To: {selectedTeamMember.email}</p>
                <p className="text-[11px] font-medium text-sky-800">Team Member: {selectedTeamMember.name}</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Task Title *</label>
                <input type="text" className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300" placeholder="Enter task title" value={emailForm.taskTitle} onChange={(e) => setEmailForm(prev => ({ ...prev, taskTitle: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Task Description *</label>
                <textarea className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300" rows={4} placeholder="Enter task description" value={emailForm.taskDescription} onChange={(e) => setEmailForm(prev => ({ ...prev, taskDescription: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Assigned By</label>
                  <input type="text" className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300" value={emailForm.assignedBy} onChange={(e) => setEmailForm(prev => ({ ...prev, assignedBy: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Due Date *</label>
                  <input type="date" className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300" value={emailForm.dueDate} onChange={(e) => setEmailForm(prev => ({ ...prev, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Priority</label>
                <select className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300" value={emailForm.priority} onChange={(e) => setEmailForm(prev => ({ ...prev, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 p-[10px] border-t border-gray-200">
              <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 px-3 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200" disabled={isSendingEmail}>Cancel</button>
              <button type="button" onClick={handleEmailSubmit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700" disabled={isSendingEmail}>
                {isSendingEmail ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-mail-send-line text-xs" />}
                {isSendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamsPage;
