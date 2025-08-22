"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useGroupFilters, GroupWithTasks } from "./hooks/useGroupFilters";
import { AdvancedFiltersPanel, ActiveFiltersSummary, SearchAndFilterControls } from "./components";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
  numberOfClients: number;
  clients: Client[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Group[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface TaskStatisticsResponse {
  results: Array<{
    groupId: string;
    groupName: string;
    numberOfClients: number;
    clients: Array<{
      clientId: string;
      clientName: string;
      clientEmail: string;
      taskStatistics: {
        total: number;
        pending: number;
        ongoing: number;
        completed: number;
        onHold: number;
        cancelled: number;
        delayed: number;
      };
    }>;
    taskStatistics: {
      total: number;
      pending: number;
      ongoing: number;
      completed: number;
      onHold: number;
      cancelled: number;
      delayed: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ExcelRow {
  "Group Name": string;
  "Sort Order"?: number;
  "ID"?: string;
  "Total Tasks"?: number;
  "Pending"?: number;
  "Completed"?: number;
  "Delayed"?: number;
  "Ongoing"?: number;
  "On Hold"?: number;
  "Cancelled"?: number;
}

const GroupsPage = () => {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [groups, setGroups] = useState<GroupWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithTasks | null>(null);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(1);
  const [clientTotalResults, setClientTotalResults] = useState(0);
  const [taskStatsMap, setTaskStatsMap] = useState<Map<string, any>>(new Map());
  const [isLoadingTaskStats, setIsLoadingTaskStats] = useState(false);

  // Use the custom hook for filters
  const {
    showAdvancedFilters,
    setShowAdvancedFilters,
    advancedFilters,
    hasActiveAdvancedFilters,
    applyAdvancedFilters,
    clearAdvancedFilters,
    updateFilter,
    updateTaskStatusFilter
  } = useGroupFilters();

  // Function to fetch task statistics for all groups
  const fetchGroupTaskStats = async (): Promise<Map<string, any>> => {
    try {
      setIsLoadingTaskStats(true);
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000', // Get all groups' task stats
        // Pass the same filters as groups
        ...(filters.name && { name: filters.name }),
      });

      console.log('Fetching task statistics with query params:', queryParams.toString());

      const response = await fetch(`${Base_url}groups/task-statistics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task statistics');
      }

      const data: TaskStatisticsResponse = await response.json();
      console.log('Task statistics API response:', data);
      
      // Create a map of groupId to taskStatistics
      const statsMap = new Map<string, any>();
      data.results.forEach(item => {
        statsMap.set(item.groupId, item.taskStatistics);
      });

      console.log('Task statistics map created:', statsMap);
      return statsMap;
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      toast.error('Failed to fetch task statistics');
      // Return empty map on error
      return new Map();
    } finally {
      setIsLoadingTaskStats(false);
    }
  };

  const fetchGroups = async (page = 1, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
      });

      const response = await fetch(`${Base_url}groups?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data: ApiResponse = await response.json();
      
      // Fetch task statistics for all groups with the same search filter
      const newTaskStatsMap = await fetchGroupTaskStats();
      setTaskStatsMap(newTaskStatsMap);
      
      // Merge groups with their task statistics
      const groupsWithTasks: GroupWithTasks[] = data.results.map(group => {
        const taskStats = newTaskStatsMap.get(group.id) || {
          pending: 0,
          ongoing: 0,
          completed: 0,
          delayed: 0,
          onHold: 0,
          cancelled: 0,
          total: 0
        };
        return { ...group, taskStats };
      });
      
      // Apply advanced filters if any are active
      const filteredGroups = applyAdvancedFilters(groupsWithTasks);
      
      setGroups(filteredGroups);
      setTotalResults(filteredGroups.length);
      setTotalPages(Math.ceil(filteredGroups.length / itemsPerPage));
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortBy, filters.name]);

  // Separate useEffect for advanced filters to update task statistics
  useEffect(() => {
    const updateTaskStats = async () => {
      const newTaskStatsMap = await fetchGroupTaskStats();
      setTaskStatsMap(newTaskStatsMap);
      
      // Update existing groups with new task stats
      setGroups(prevGroups => 
        prevGroups.map(group => {
          const taskStats = newTaskStatsMap.get(group.id) || {
            pending: 0,
            ongoing: 0,
            completed: 0,
            delayed: 0,
            onHold: 0,
            cancelled: 0,
            total: 0
          };
          return { ...group, taskStats };
        })
      );
    };

    updateTaskStats();
  }, [advancedFilters]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(groups.map((group) => group.id));
    }
    setSelectAll(!selectAll);
  };

  const handleGroupSelect = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      const response = await fetch(`${Base_url}groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      toast.error('Failed to delete group');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedGroups.length} groups?`)) {
      return;
    }

    try {
      const deletePromises = selectedGroups.map(groupId =>
        fetch(`${Base_url}groups/${groupId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      toast.success(`${selectedGroups.length} groups deleted successfully`);
      setSelectedGroups([]);
      fetchGroups();
    } catch (err) {
      console.error('Error deleting groups:', err);
      toast.error('Failed to delete groups');
    }
  };

  const handleExport = async () => {
    try {
      let exportData;
      let successMessage;

      // Only export selected groups if any are selected
      if (selectedGroups.length > 0) {
        exportData = groups
          .filter(group => selectedGroups.includes(group.id))
          .map((group: GroupWithTasks) => ({
            ID: group.id,
            "Group Name": group.name,
            "Number Of Clients": group.numberOfClients,
            "Created Date": new Date(group.createdAt).toLocaleDateString(),
            "Sort Order": group.sortOrder,
            "Client IDs": group.clients?.map(client => client.id).join(',') || '',
            "Total Tasks": group.taskStats.total,
            "Pending": group.taskStats.pending,
            "Completed": group.taskStats.completed,
            "Delayed": group.taskStats.delayed,
            "Ongoing": group.taskStats.ongoing
          }));
        successMessage = "Selected groups exported successfully";
      } else {
        // Export all groups if none are selected
        const response = await fetch(`${Base_url}groups?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch groups for export');
        }

        const apiData: ApiResponse = await response.json();
                exportData = apiData.results.map((group: Group) => {
          const taskStats = taskStatsMap.get(group.id) || {
            total: 0,
            pending: 0,
            completed: 0,
            delayed: 0,
            ongoing: 0,
            onHold: 0,
            cancelled: 0
          };
          
          return {
          ID: group.id,
          "Group Name": group.name,
          "Number Of Clients": group.numberOfClients,
          "Created Date": new Date(group.createdAt).toLocaleDateString(),
          "Sort Order": group.sortOrder,
          "Client IDs": group.clients?.map(client => client.id).join(',') || '',
            "Total Tasks": taskStats.total,
            "Pending": taskStats.pending,
            "Completed": taskStats.completed,
            "Delayed": taskStats.delayed,
            "Ongoing": taskStats.ongoing
          };
        });
        successMessage = "All groups exported successfully";
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 20 }, // Group Name
        { wch: 30 }, // Number Of Clients
        { wch: 20 }, // Created Date
        { wch: 10 }, // Sort Order
        { wch: 50 }, // Client IDs
        { wch: 10 }, // Total Tasks
        { wch: 10 }, // Pending
        { wch: 10 }, // Completed
        { wch: 10 }, // Delayed
        { wch: 10 }, // Ongoing
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Groups");
      const fileName = `groups_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(successMessage);
    } catch (error) {
      console.error("Error exporting groups:", error);
      toast.error("Failed to export groups");
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

        setImportProgress(0);

        // Fetch all groups for upsert by name
        const allGroupsResponse = await fetch(`${Base_url}groups?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const allGroupsData = await allGroupsResponse.json();
        const allGroups: Group[] = allGroupsData.results || [];

        // Transform data for bulk import
        const groups = jsonData.map((row, index) => {
          let existingGroup = null;
          if (row["ID"]) {
            existingGroup = allGroups.find(g => g.id === row["ID"]);
          } else {
            // Try to find by name (case-insensitive)
            existingGroup = allGroups.find(
              (g) => g.name.trim().toLowerCase() === row["Group Name"].toString().trim().toLowerCase()
            );
          }

          const groupData = {
            name: row["Group Name"].toString().trim(),
            sortOrder: parseInt(row["Sort Order"]?.toString() || "1"),
            numberOfClients: existingGroup?.clients?.length || 0,
            clients: existingGroup?.clients?.map((client: Client) => client.id) || [],
            // Use imported task stats if available, otherwise use default values
            taskStats: (() => {
              const total = parseInt(row["Total Tasks"]?.toString() || "0") || 0;
              const pending = parseInt(row["Pending"]?.toString() || "0") || 0;
              const completed = parseInt(row["Completed"]?.toString() || "0") || 0;
              const delayed = parseInt(row["Delayed"]?.toString() || "0") || 0;
              
              // Ensure ongoing is never negative by adjusting other values if needed
              let ongoing = parseInt(row["Ongoing"]?.toString() || "0") || 0;
              
              // If the sum exceeds total, recalculate ongoing to prevent negative values
              if (pending + completed + delayed + ongoing > total) {
                ongoing = Math.max(0, total - pending - completed - delayed);
              }
              
              return { 
                total, 
                pending, 
                completed, 
                delayed, 
                ongoing,
                onHold: 0,
                cancelled: 0
              };
            })()
          };

          return {
            ...(row["ID"] && { id: row["ID"] }),
            ...groupData
          };
        });

        // Single API call instead of multiple requests
        const response = await fetch(`${Base_url}groups/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ groups })
        });

        if (!response.ok) {
          throw new Error('Bulk import failed');
        }

        const result = await response.json();
        setImportProgress(100);

        if (result.errors && result.errors.length > 0) {
          toast.error(`Import completed with ${result.errors.length} errors`);
          console.log('Import errors:', result.errors);
        } else {
          toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
        }

        fetchGroups(); // Refresh the groups list
      } catch (err) {
        console.error('Error processing file:', err);
        toast.error('Failed to process file');
      } finally {
        setImportProgress(null);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('Error reading file:', err);
    toast.error('Failed to read file');
  }
};

  const fetchAvailableClients = async (groupId: string) => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams({
        page: clientCurrentPage.toString(),
        limit: "10",
        ...(clientSearchQuery && { name: clientSearchQuery })
      });

      // First get the group details to get the clients
      const groupResponse = await fetch(`${Base_url}groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!groupResponse.ok) {
        throw new Error('Failed to fetch group details');
      }

      const groupData = await groupResponse.json();
      
      // If the group has clients array, use it directly
      if (Array.isArray(groupData.clients)) {
        const searchedClients = groupData.clients.filter((client: Client) => client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()));
        setAvailableClients(searchedClients);
        setClientTotalResults(searchedClients.length);
        setClientTotalPages(Math.ceil(searchedClients.length / 10));
      } else {
        // If no clients array, fetch clients for the group
        const clientsResponse = await fetch(`${Base_url}groups/${groupId}/clients?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!clientsResponse.ok) {
          throw new Error('Failed to fetch clients');
        }

        const clientsData = await clientsResponse.json();
        setAvailableClients(clientsData.results || []);
        setClientTotalResults(clientsData.totalResults || 0);
        setClientTotalPages(clientsData.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to fetch clients');
      setAvailableClients([]);
      setClientTotalResults(0);
      setClientTotalPages(1);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Update useEffect to refetch clients when search or page changes
  useEffect(() => {
    if (showClientModal && selectedGroup) {
      fetchAvailableClients(selectedGroup.id);
    }
  }, [clientSearchQuery, clientCurrentPage, showClientModal, selectedGroup]);

  const handleViewClients = async (group: GroupWithTasks) => {
    setSelectedGroup(group);
    setShowClientModal(true);
    setClientCurrentPage(1);
    setClientSearchQuery("");
    await fetchAvailableClients(group.id);
  };

  const handleAddClient = async (clientId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`${Base_url}groups/${selectedGroup.id}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ clientId })
      });

      if (!response.ok) {
        throw new Error('Failed to add client to group');
      }

      toast.success('Client added to group successfully');
      fetchAvailableClients(selectedGroup.id);
      fetchGroups(); // Refresh groups list to update client count
    } catch (err) {
      console.error('Error adding client to group:', err);
      toast.error('Failed to add client to group');
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`${Base_url}groups/${selectedGroup.id}/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove client from group');
      }

      toast.success('Client removed from group successfully');
      fetchAvailableClients(selectedGroup.id);
      fetchGroups(); // Refresh groups list to update client count
    } catch (err) {
      console.error('Error removing client from group:', err);
      toast.error('Failed to remove client from group');
    }
  };

  // Function to render task status badges
  const renderTaskStatus = (taskStats: any, groupId: string) => {
    if (isLoadingTaskStats) {
      return (
        <div className="text-center text-gray-400 text-xs">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mx-auto mb-1"></div>
          Loading...
        </div>
      );
    }

    if (taskStats.total === 0) {
      return (
        <div className="text-center text-gray-400 text-xs">
          <i className="ri-task-line mr-1"></i>
          No tasks
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total: {taskStats.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {taskStats.pending > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-black">
              {taskStats.pending} Pending
            </span>
          )}
          {taskStats.ongoing > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-black">
              {taskStats.ongoing} Ongoing
            </span>
          )}
          {taskStats.completed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-black">
              {taskStats.completed} Completed
            </span>
          )}
          {taskStats.onHold > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {taskStats.onHold} On Hold
            </span>
          )}
          {taskStats.cancelled > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {taskStats.cancelled} Cancelled
            </span>
          )}
          {taskStats.delayed > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger text-black">
              {taskStats.delayed} Delayed
            </span>
          )}
        </div>
      </div>
    );
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

  // Reset all filters and sorting
  const handleReset = () => {
    setFilters({ name: "" });
    setSortBy("name:asc");
    clearAdvancedFilters();
    setCurrentPage(1);
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Groups" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Groups</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedGroups.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedGroups.length})
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
                <Link
                  href="/groups/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i> Add New Group
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search and Filter Controls */}
              <SearchAndFilterControls
                filters={filters}
                sortBy={sortBy}
                itemsPerPage={itemsPerPage}
                showAdvancedFilters={showAdvancedFilters}
                hasActiveAdvancedFilters={hasActiveAdvancedFilters()}
                onFilterChange={(value) => {
                  setFilters(prev => ({ ...prev, name: value }));
                  setCurrentPage(1);
                }}
                onSortChange={setSortBy}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
                onReset={handleReset}
              />

              {/* Clear Search Button */}
              {filters.name && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, name: "" }));
                      setCurrentPage(1);
                    }}
                    className="ti-btn ti-btn-secondary"
                  >
                    <i className="ri-close-line me-2"></i>
                    Clear Search
                  </button>
                </div>
              )}

              {/* Advanced Filters Panel */}
              <AdvancedFiltersPanel
                showAdvancedFilters={showAdvancedFilters}
                advancedFilters={advancedFilters}
                onUpdateFilter={(key, value) => {
                  updateFilter(key, value);
                  setCurrentPage(1);
                }}
                onUpdateTaskStatusFilter={(status, value) => {
                  updateTaskStatusFilter(status, value);
                  setCurrentPage(1);
                }}
                onClearFilters={() => {
                  clearAdvancedFilters();
                  setCurrentPage(1);
                }}
              />

              {/* Active Filters Summary */}
              <ActiveFiltersSummary
                advancedFilters={advancedFilters}
                onClearAll={() => {
                  clearAdvancedFilters();
                  setCurrentPage(1);
                }}
              />

              {/* Search Results Indicator */}
              {filters.name && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-search-line text-green-600 mr-2"></i>
                      <span className="text-sm font-medium text-green-800">
                        Search Results for "{filters.name}": {groups.length} groups found
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, name: "" }));
                        setCurrentPage(1);
                      }}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      <i className="ri-close-line mr-1"></i>
                      Clear Search
                    </button>
                  </div>
                </div>
              )}

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
                            checked={selectedGroups.length === groups.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Number of Clients</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3">Tasks</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.length > 0 ? (
                        groups.map((group: GroupWithTasks, index: number) => (
                          <tr
                            key={group.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedGroups.includes(group.id)}
                                onChange={() => handleGroupSelect(group.id)}
                              />
                            </td>
                            <td>{group.name}</td>
                            <td>{group.numberOfClients}</td>
                            <td>{new Date(group.createdAt).toLocaleDateString()}</td>
                                               <td className="px-4 py-3">
                              {renderTaskStatus(group.taskStats, group.id)}
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <button
                                  className="ti-btn ti-btn-info ti-btn-sm"
                                  onClick={() => handleViewClients(group)}
                                >
                                  <i className="ri-eye-line"></i>
                                </button>
                                <Link
                                  href={`/groups/edit/${group.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(group.id)}
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
                                <i className="ri-folder-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                {filters.name ? 'No Search Results Found' : 'No Groups Found'}
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                {filters.name 
                                  ? `No groups found matching "${filters.name}". Try adjusting your search terms.`
                                  : 'Start by adding your first group.'
                                }
                              </p>
                              {filters.name ? (
                                <button
                                  onClick={() => {
                                    setFilters(prev => ({ ...prev, name: "" }));
                                    setCurrentPage(1);
                                  }}
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-refresh-line me-2"></i>
                                  Clear Search
                                </button>
                              ) : (
                                <Link
                                  href="/groups/add"
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-add-line me-2"></i> Add First
                                  Group
                                </Link>
                              )}
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

      {/* Client Modal */}
      {showClientModal && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-xl font-semibold">
                  Clients in {selectedGroup.name}
                </h3>
                <button
                  onClick={() => {
                    setShowClientModal(false);
                    setAvailableClients([]);
                    setClientSearchQuery("");
                    setClientCurrentPage(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      className="form-control py-3 pr-10"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                    />
                    <button className="absolute end-0 top-0 px-4 h-full">
                      <i className="ri-search-line text-lg"></i>
                    </button>
                  </div>
                </div>

                {isLoadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th scope="col" className="text-start">Name</th>
                          <th scope="col" className="text-start">Email</th>
                          <th scope="col" className="text-start">Phone</th>
                          <th scope="col" className="text-start">City</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(availableClients) && availableClients.length > 0 ? (
                          availableClients.map((client) => (
                            <tr key={client.id} className="border-b border-gray-200">
                              <td>{client.name}</td>
                              <td>{client.email}</td>
                              <td>{client.phone}</td>
                              <td>{client.city}</td>
                              <td>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleRemoveClient(client.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8">
                              No clients found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Client Pagination */}
                {!isLoadingClients && clientTotalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {clientTotalResults === 0 ? 0 : (clientCurrentPage - 1) * 10 + 1} to{" "}
                      {Math.min(clientCurrentPage * 10, clientTotalResults)} of {clientTotalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${clientCurrentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setClientCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={clientCurrentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {getPagination(clientCurrentPage, clientTotalPages).map((page, idx) =>
                          page === "..." ? (
                            <li key={"ellipsis-" + idx} className="page-item">
                              <span className="px-3">...</span>
                            </li>
                          ) : (
                            <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  clientCurrentPage === page
                                    ? "bg-primary text-white hover:bg-primary-dark"
                                    : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                }`}
                                onClick={() => setClientCurrentPage(Number(page))}
                              >
                                {page}
                              </button>
                            </li>
                          )
                        )}
                        <li className={`page-item ${clientCurrentPage === clientTotalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setClientCurrentPage((prev) => Math.min(prev + 1, clientTotalPages))}
                            disabled={clientCurrentPage === clientTotalPages}
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
      )}
    </div>
  );
};

export default GroupsPage;
