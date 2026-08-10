"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useGroupFilters, GroupWithTasks, AdvancedFilters, TaskStatus } from "./hooks/useGroupFilters";
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
  "Client IDs"?: string;
  "Client Names"?: string;
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
  const [totalClients, setTotalClients] = useState(0);

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

  // Function to fetch total clients count (once; capped page to avoid full scan)
  /**
   * Approximate unique client membership across groups (capped sample).
   * @returns {Promise<void>}
   */
  const fetchTotalClients = async () => {
    try {
      const response = await fetch(`${Base_url}groups?limit=100&page=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        const allClientIds = new Set<string>();
        data.results.forEach(group => {
          if (group.clients && Array.isArray(group.clients)) {
            group.clients.forEach(client => {
              if (typeof client === 'string') {
                allClientIds.add(client);
              } else if (client && typeof client === 'object' && 'id' in client) {
                allClientIds.add(client.id);
              }
            });
          }
        });
        setTotalClients(allClientIds.size);
      }
    } catch (error) {
      const allClientIds = new Set<string>();
      groups.forEach(group => {
        if (group.clients && Array.isArray(group.clients)) {
          group.clients.forEach(client => {
            if (typeof client === 'string') {
              allClientIds.add(client);
            } else if (client && typeof client === 'object' && 'id' in client) {
              allClientIds.add(client.id);
            }
          });
        }
      });
      setTotalClients(allClientIds.size);
    }
  };

  // Function to fetch task statistics for the current page of groups
  /**
   * Load task stats for the same page/filters as the groups list.
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<Map<string, any>>}
   */
  const fetchGroupTaskStats = async (page = 1, limit = itemsPerPage): Promise<Map<string, any>> => {
    try {
      setIsLoadingTaskStats(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: Math.min(limit, 100).toString(),
        ...(filters.name && { name: filters.name }),
        ...(advancedFilters.clientName && { client: advancedFilters.clientName }),
      });

      const response = await fetch(`${Base_url}groups/task-statistics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task statistics');
      }

      const data: TaskStatisticsResponse = await response.json();
      
      // Create a map of groupId to taskStatistics
      const statsMap = new Map<string, any>();
      data.results.forEach(item => {
        statsMap.set(item.groupId, item.taskStatistics);
      });

      return statsMap;
    } catch (error) {
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
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        ...(filters.name && { name: filters.name }),
        ...(advancedFilters.clientName && { client: advancedFilters.clientName }),
      });

      const response = await fetch(`${Base_url}groups?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groups API error:', response.status, errorText);
        throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      
      // Validate response structure
      if (!data || !Array.isArray(data.results)) {
        console.error('Invalid API response structure:', data);
        throw new Error('Invalid response format from API');
      }
      
      // Fetch task statistics for this page of groups (handle errors gracefully)
      let newTaskStatsMap = new Map<string, any>();
      try {
        newTaskStatsMap = await fetchGroupTaskStats(page, limit);
        setTaskStatsMap(newTaskStatsMap);
      } catch (taskStatsError) {
        console.error('Failed to fetch task statistics:', taskStatsError);
        // Continue without task stats - use empty stats
      }
      
      // Merge groups with their task statistics
      let groupsWithTasks: GroupWithTasks[] = data.results.map(group => {
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
      
      // Check if any advanced filters are active (excluding clientName as it's handled by API)
      const hasAdvancedFilters = 
        advancedFilters.minClients || 
        advancedFilters.maxClients || 
        advancedFilters.minTasks || 
        advancedFilters.maxTasks ||
        (advancedFilters.taskStatus && Object.values(advancedFilters.taskStatus).some(v => v === true));
      
      // Apply other advanced filters (Task Count, Client Count, Task Status)
      // Note: clientName filter is handled by the API, so no client-side filtering needed
      let filteredGroups: GroupWithTasks[] = [];
      try {
        filteredGroups = applyAdvancedFilters(groupsWithTasks);
      } catch (filterError) {
        console.error('Failed to apply advanced filters:', filterError);
        // If filter application fails, use unfiltered groups
        filteredGroups = groupsWithTasks;
      }
      
      setGroups(filteredGroups);
      setError(null); // Clear any previous errors
      
      // Only use filtered results for pagination if advanced filters are active
      // Otherwise, use the API's pagination data
      if (hasAdvancedFilters) {
        setTotalResults(filteredGroups.length);
        setTotalPages(Math.ceil(filteredGroups.length / limit));
      } else {
        setTotalResults(data.totalResults);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch groups';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortBy, filters.name, advancedFilters.clientName]);

  useEffect(() => {
    fetchTotalClients();
  }, []);

  // Re-apply client-side advanced filters without re-hitting task-statistics
  useEffect(() => {
    const hasOnlyClientNameFilter = advancedFilters.clientName && 
      !advancedFilters.minClients && 
      !advancedFilters.maxClients && 
      !advancedFilters.minTasks && 
      !advancedFilters.maxTasks &&
      (!advancedFilters.taskStatus || !Object.values(advancedFilters.taskStatus).some(v => v === true));
    
    if (hasOnlyClientNameFilter) {
      return;
    }

    setGroups(prevGroups => {
      const finalFiltered = applyAdvancedFilters(prevGroups);
      const hasAdvancedFilters = 
        advancedFilters.minClients || 
        advancedFilters.maxClients || 
        advancedFilters.minTasks || 
        advancedFilters.maxTasks ||
        (advancedFilters.taskStatus && Object.values(advancedFilters.taskStatus).some(v => v === true));
      
      if (hasAdvancedFilters) {
        setTotalResults(finalFiltered.length);
        setTotalPages(Math.ceil(finalFiltered.length / itemsPerPage));
      }
      
      return finalFiltered;
    });
  }, [advancedFilters, applyAdvancedFilters, itemsPerPage]);

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
            "Number Of Clients": group.clients ? group.clients.length : 0,
            "Created Date": new Date(group.createdAt).toLocaleDateString(),
            "Sort Order": group.sortOrder,
            "Client IDs": group.clients?.map(client => 
              typeof client === 'string' ? client : client.id
            ).join(',') || '',
            "Client Names": group.clients?.map(client => 
              typeof client === 'string' ? '' : client.name
            ).filter(name => name).join(',') || '',
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
          "Number Of Clients": group.clients ? group.clients.length : 0,
          "Created Date": new Date(group.createdAt).toLocaleDateString(),
          "Sort Order": group.sortOrder,
          "Client IDs": group.clients?.map(client => 
            typeof client === 'string' ? client : client.id
          ).join(',') || '',
          "Client Names": group.clients?.map(client => 
            typeof client === 'string' ? '' : client.name
          ).filter(name => name).join(',') || '',
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
        { wch: 50 }, // Client Names
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

        // Fetch all clients once so we can resolve IDs from names
        let allClients: Client[] = [];
        try {
          const allClientsResponse = await fetch(`${Base_url}clients?limit=1000`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (allClientsResponse.ok) {
            const allClientsData = await allClientsResponse.json();
            allClients = allClientsData.results || [];
          }
        } catch (clientErr) {
          // If this fails we will just fall back to existing group clients
          console.error("Failed to fetch clients for group import:", clientErr);
        }

        // Build a map for fast lookup by client name (case-insensitive)
        const clientNameToId = new Map<string, string>();
        allClients.forEach((client) => {
          if (client.name) {
            clientNameToId.set(client.name.trim().toLowerCase(), client.id);
          }
        });

        const unresolvedClientNames: string[] = [];

        // Transform data for bulk import
        const groups = jsonData.map((row) => {
          let existingGroup: Group | null = null;
          if (row["ID"]) {
            existingGroup = allGroups.find(g => g.id === row["ID"]);
          } else {
            // Try to find by name (case-insensitive)
            const rowGroupName = row["Group Name"]?.toString().trim().toLowerCase() || "";
            existingGroup = allGroups.find(
              (g) => g.name.trim().toLowerCase() === rowGroupName
            );
          }

          // Resolve client IDs either from "Client IDs" column or from "Client Names"
          let resolvedClientIds: string[] = [];

          // 1. If Client IDs column is provided, use it directly
          if (row["Client IDs"] && row["Client IDs"]?.toString().trim() !== "") {
            resolvedClientIds = row["Client IDs"]
              ?.toString()
              .split(",")
              .map(id => id.trim())
              .filter(id => id.length > 0) || [];
          } else if (row["Client Names"] && row["Client Names"]?.toString().trim() !== "") {
            // 2. Otherwise, try to resolve from Client Names column
            const names = row["Client Names"]
              ?.toString()
              .split(",")
              .map(name => name.trim())
              .filter(name => name.length > 0) || [];

            names.forEach((name) => {
              const key = name.toLowerCase();
              const clientId = clientNameToId.get(key);
              if (clientId) {
                resolvedClientIds.push(clientId);
              } else {
                unresolvedClientNames.push(name);
              }
            });
          }

          // 3. If nothing provided in Excel, fall back to existing group clients (if any)
          if (resolvedClientIds.length === 0 && existingGroup?.clients?.length) {
            resolvedClientIds = existingGroup.clients.map((client: any) =>
              typeof client === "string" ? client : client.id
            );
          }

          const groupData = {
            name: row["Group Name"].toString().trim(),
            sortOrder: parseInt(row["Sort Order"]?.toString() || "1"),
            numberOfClients: resolvedClientIds.length,
            clients: resolvedClientIds,
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

        // If there were any client names we could not match, just inform the user.
        // These names are skipped only on the frontend and are NOT sent to the backend.
        if (unresolvedClientNames.length > 0) {
          const uniqueNames = Array.from(new Set(unresolvedClientNames));
          toast(
            `Import completed. Some client names could not be matched and were skipped: ${uniqueNames
              .slice(0, 5)
              .join(", ")}${uniqueNames.length > 5 ? "..." : ""}`
          );
        }

        if (result.errors && result.errors.length > 0) {
          toast.error(`Import completed with ${result.errors.length} errors`);
        } else {
          toast.success(`Import completed: ${result.created} added, ${result.updated} updated`);
        }

        fetchGroups(); // Refresh the groups list
      } catch (err) {
        toast.error('Failed to process file');
      } finally {
        setImportProgress(null);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (err) {
    toast.error('Failed to read file');
  }
};

  const fetchAvailableClients = async (groupId: string) => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams({
        page: clientCurrentPage.toString(),
        limit: "10",
        ...(clientSearchQuery && { search: clientSearchQuery })
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
        let searchedClients = groupData.clients;
        
        // Apply search filter if search query exists
        if (clientSearchQuery) {
          searchedClients = groupData.clients.filter((client: Client) => 
            client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
            client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
          );
        }
        
        setAvailableClients(searchedClients);
        setClientTotalResults(searchedClients.length);
        setClientTotalPages(Math.ceil(searchedClients.length / 10));
      } else {
        // If no clients array, fetch clients for the group with search
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
      toast.error('Failed to remove client from group');
    }
  };

  const renderTaskStatus = (taskStats: any) => {
    if (isLoadingTaskStats) {
      return (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600" />
          Loading
        </div>
      );
    }
    if (!taskStats || taskStats.total === 0) {
      return <span className="text-[11px] text-gray-400">No tasks</span>;
    }
    return (
      <div className="flex flex-wrap gap-0.5">
        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">{taskStats.total} total</span>
        {taskStats.pending > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-100">{taskStats.pending} P</span>}
        {taskStats.ongoing > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-100">{taskStats.ongoing} O</span>}
        {taskStats.completed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">{taskStats.completed} C</span>}
        {taskStats.delayed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">{taskStats.delayed} D</span>}
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
    // Clear existing groups to show loading state
    
    
    
    // Reset all filters and sorting
    setFilters({ name: "" });
    setSortBy("name:asc");
    clearAdvancedFilters();
    setCurrentPage(1);
  };

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (key: keyof AdvancedFilters, value: string | TaskStatus) => {
    // Update the filter
    updateFilter(key, value);
    setCurrentPage(1); // Reset to first page when filters change
    
    // Clear existing groups to show loading state for immediate feedback
    setGroups([]);
    setTotalResults(0);
    setTotalPages(1);
  };

  // Handle task status filter changes - Commented out
  // const handleTaskStatusFilterChange = (status: keyof TaskStatus, value: boolean) => {
  //   updateTaskStatusFilter(status, value);
  //   setCurrentPage(1); // Reset to first page when filters change
  //   
  //   // Refresh the groups data to apply the new filters
  //   fetchGroups(1, itemsPerPage);
  // };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    // Clear existing groups to show loading state
    setGroups([]);
    setTotalResults(0);
    setTotalPages(1);
    
    clearAdvancedFilters();
    setCurrentPage(1);
  };

  const hasActiveFilters = !!(filters.name || hasActiveAdvancedFilters());

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Groups" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Groups</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedGroups.length > 0 && (
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" onClick={handleDeleteSelected}>
                    <i className="ri-delete-bin-line text-xs" /> Delete Selected ({selectedGroups.length})
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
                <Link href="/groups/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                  <i className="ri-add-line text-xs" /> Add New Group
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700">Total Groups</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{totalResults}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-folder-line text-purple-600 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4 opacity-90">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">Total Clients</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{totalClients}</p>
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
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{selectedGroups.length}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-amber-600 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
            <div className="p-[10px]">
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

              <AdvancedFiltersPanel
                showAdvancedFilters={showAdvancedFilters}
                advancedFilters={advancedFilters}
                onUpdateFilter={handleAdvancedFilterChange}
                onClearFilters={handleClearAllFilters}
              />

              <ActiveFiltersSummary
                advancedFilters={advancedFilters}
                onClearAll={handleClearAllFilters}
              />

              {hasActiveFilters && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-sky-700">Filters active</span>
                    <button onClick={handleReset} className="text-[11px] font-bold text-sky-600 hover:text-sky-800"><i className="ri-close-line text-xs" /> Clear</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[200px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedGroups.length === groups.length && groups.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Group Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Clients</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Tasks</th>
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
                    ) : groups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-folder-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">NO GROUPS</p>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? "No groups match your filters." : "Start by adding your first group."}</p>
                            {hasActiveFilters ? (
                              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-refresh-line text-xs" /> Clear Filters</button>
                            ) : (
                              <Link href="/groups/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"><i className="ri-add-line text-xs" /> Add First Group</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      groups.map((group: GroupWithTasks) => (
                        <tr key={group.id} className="hover:bg-gray-50/50 group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => handleGroupSelect(group.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{group.name}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{group.clients ? group.clients.length : 0}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-[#495057] border border-gray-200">{new Date(group.createdAt).toLocaleDateString()}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">{renderTaskStatus(group.taskStats)}</td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <button type="button" onClick={() => handleViewClients(group)} className="w-7 h-7 rounded flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100" title="View clients"><i className="ri-eye-line text-sm" /></button>
                              <Link href={`/groups/edit/${group.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit"><i className="ri-pencil-line text-sm" /></Link>
                              <button type="button" onClick={() => handleDelete(group.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && groups.length > 0 && (
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

      {/* Clients drawer */}
      {showClientModal && selectedGroup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden onClick={() => { setShowClientModal(false); setAvailableClients([]); setClientSearchQuery(""); setClientCurrentPage(1); }} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 flex flex-col">
            <div className="p-[10px] border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[0.875rem] font-bold text-gray-800">Clients in {selectedGroup.name}</h3>
              <button type="button" onClick={() => { setShowClientModal(false); setAvailableClients([]); setClientSearchQuery(""); setClientCurrentPage(1); }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-[10px] flex-1 overflow-auto">
              <input type="text" className="w-full bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 mb-3" placeholder="Search clients..." value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} />
              {isLoadingClients ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-2 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Name</th>
                        <th className="px-2 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Email</th>
                        <th className="px-2 py-2 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200 w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(availableClients) && availableClients.length > 0 ? (
                        availableClients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50/50">
                            <td className="px-2 py-2 text-[12px] font-medium text-[#323251] border border-gray-200">{client.name}</td>
                            <td className="px-2 py-2 text-[12px] text-[#495057] border border-gray-200 truncate max-w-[140px]">{client.email}</td>
                            <td className="px-2 py-2 text-right border border-gray-200">
                              <button type="button" onClick={() => handleRemoveClient(client.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Remove"><i className="ri-delete-bin-line text-sm" /></button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-[12px] text-[#495057] border border-gray-200">
                            {clientSearchQuery ? `No clients matching "${clientSearchQuery}"` : "No clients in this group."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {!isLoadingClients && clientTotalPages > 1 && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-medium text-[#495057]">
                    {(clientCurrentPage - 1) * 10 + 1}–{Math.min(clientCurrentPage * 10, clientTotalResults)} of {clientTotalResults}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded text-gray-400 hover:bg-gray-50 disabled:opacity-30" onClick={() => setClientCurrentPage((p) => Math.max(p - 1, 1))} disabled={clientCurrentPage === 1}>Prev</button>
                    {getPagination(clientCurrentPage, clientTotalPages).map((p, i) => p === "..." ? <span key={`c-${i}`} className="px-1 text-[10px] text-gray-300">...</span> : <button key={p} type="button" className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${clientCurrentPage === p ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-50"}`} onClick={() => setClientCurrentPage(Number(p))}>{p}</button>)}
                    <button type="button" className="w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded text-gray-400 hover:bg-gray-50 disabled:opacity-30" onClick={() => setClientCurrentPage((p) => Math.min(p + 1, clientTotalPages))} disabled={clientCurrentPage === clientTotalPages}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupsPage;
