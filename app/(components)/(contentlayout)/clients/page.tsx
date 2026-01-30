"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useSelectedBranchId } from "@/shared/contextapi";
import { useRouter } from "next/navigation";
import { BulkEmailDrawer } from "./components/bulk-email";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;
  status: string;
  pan: string;
  dob: string;
  branch: string;
  sortOrder: number;
  businessType: string;
  gstNumbers?: GstNumber[];
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  category: string;
  turnover?: string;
  activities?: ActivityMapping[];
  createdAt: string;
  updatedAt: string;
}

interface GstNumber {
  state: string;
  gstNumber: string;
  dateOfRegistration: string;
  gstUserId: string;
}

interface ActivityMapping {
  activity: string;
  subactivity?: string;
  assignedTeamMember?: string;
  assignedDate?: string;
  notes?: string;
}

interface Activity {
  id: string;
  name: string;
  description?: string;
  subactivities?: Array<{
    _id: string;
    name: string;
    frequency?: string;
    frequencyConfig?: any;
    fields?: Array<{
      _id: string;
      name: string;
      type: string;
      required?: boolean;
      options?: string[];
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface TaskStats {
  pending: number;
  ongoing: number;
  completed: number;
  delayed: number;
  onHold: number;
  cancelled: number;
  total: number;
}

interface ClientWithTasks extends Client {
  taskStats: TaskStats;
}

interface ApiResponse {
  results: Client[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  ID?: string;
  "Client Name"?: string;
  "Client Phone"?: string;
  "Client Email"?: string;
  "Client Email 2"?: string;
  "Client Address"?: string;
  "Client District"?: string;
  "Client State"?: string;
  "Client Country"?: string;
  "Branch"?: string;
  "Category"?: string;
  "Turnover"?: string;

  "PAN"?: string;
  "Date of Birth"?: string;
  "Sort Order"?: string | number;
  "Business Type"?: string;
  "Entity Type"?: string;
  "TAN Number"?: string;
  "CIN Number"?: string;
  "Udyam Number"?: string;
  "IEC Code"?: string;
  
  // Multiple GST Numbers (up to 3)
  "GST State 1"?: string;
  "GST Number 1"?: string;
  "GST Date of Registration 1"?: string;
  "GST User ID 1"?: string;
  "GST State 2"?: string;
  "GST Number 2"?: string;
  "GST Date of Registration 2"?: string;
  "GST User ID 2"?: string;
  "GST State 3"?: string;
  "GST Number 3"?: string;
  "GST Date of Registration 3"?: string;
  "GST User ID 3"?: string;
  
  // Multiple Activities (up to 5)
  "Activity 1"?: string;
  "Subactivity 1"?: string;
  "Activity Notes 1"?: string;
  "Activity 2"?: string;
  "Subactivity 2"?: string;
  "Activity Notes 2"?: string;
  "Activity 3"?: string;
  "Subactivity 3"?: string;
  "Activity Notes 3"?: string;
  "Activity 4"?: string;
  "Subactivity 4"?: string;
  "Activity Notes 4"?: string;
  "Activity 5"?: string;
  "Subactivity 5"?: string;
  "Activity Notes 5"?: string;
}

const ClientsPage = () => {
  const router = useRouter();
  const selectedBranchId = useSelectedBranchId();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<ClientWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    district: "",
    state: "",
    country: "",
    status: "",
    pan: "",
    branch: "",
    category: "",
    businessType: "",
    entityType: "",
    gstNumber: "",
    tanNumber: "",
    cinNumber: "",
    udyamNumber: "",
    iecCode: "",
    activity: "",
    subactivity: ""
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [taskStatsMap, setTaskStatsMap] = useState<Map<string, TaskStats>>(new Map());
  const [isLoadingTaskStats, setIsLoadingTaskStats] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<Array<{id: string, name: string}>>([]);
  const [entityTypes, setEntityTypes] = useState<Array<{id: string, name: string}>>([]);
  const [businessTypeLoading, setBusinessTypeLoading] = useState(false);
  const [entityTypeLoading, setEntityTypeLoading] = useState(false);
  const [showBulkActivityModal, setShowBulkActivityModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedSubactivityId, setSelectedSubactivityId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [showBulkEmailDrawer, setShowBulkEmailDrawer] = useState(false);

  // Function to fetch activities (same as add page)
  const fetchActivities = async (): Promise<Activity[]> => {
    try {
      setIsLoadingActivities(true);
      const response = await fetch(`${Base_url}activities?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      const activitiesList = data.results || [];
      setActivities(activitiesList);
      return activitiesList;
    } catch (error) {
      toast.error('Failed to fetch activities');
      return [];
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Function to find activity ID by name
  const findActivityIdByName = (activityName: string, activitiesList: Activity[]): string | null => {
    if (!activityName || !activityName.trim()) return null;
    
    const trimmedName = activityName.trim();
    const found = activitiesList.find(act => 
      act.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (found) {
      return found.id;
    } else {
      return null;
    }
  };

  // Function to find subactivity ID by name within an activity
  const findSubactivityIdByName = (activityId: string, subactivityName: string, activitiesList: Activity[]): string | null => {
    if (!subactivityName || !subactivityName.trim()) return null;
    if (!activityId) return null;
    
    const activity = activitiesList.find(act => act.id === activityId);
    if (!activity || !activity.subactivities) {
      return null;
    }
    
    const trimmedName = subactivityName.trim();
    const found = activity.subactivities.find(sub => 
      sub.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (found) {
      return found._id;
    } else {
      return null;
    }
  };

  // Function to fetch business types
  const fetchBusinessTypes = async (page = 1, search = "") => {
    setBusinessTypeLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '1000', // Get all business types
        ...(search && { name: search }),
        sortBy: 'name:asc'
      });

      const url = `${Base_url}business-master?${queryParams}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch business types: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.results && Array.isArray(data.results)) {
        setBusinessTypes(data.results);
      } else {
        setBusinessTypes([]);
      }
    } catch (err) {
      toast.error(`Failed to fetch business types: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setBusinessTypes([]);
    } finally {
      setBusinessTypeLoading(false);
    }
  };

  // Function to fetch entity types
  const fetchEntityTypes = async (page = 1, search = "") => {
    setEntityTypeLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '1000', // Get all entity types
        ...(search && { name: search }),
        sortBy: 'name:asc'
      });

      const url = `${Base_url}entity-master?${queryParams}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch entity types: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.results && Array.isArray(data.results)) {
        setEntityTypes(data.results);
      } else {
        setEntityTypes([]);
      }
    } catch (err) {
      toast.error(`Failed to fetch entity types: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setEntityTypes([]);
    } finally {
      setEntityTypeLoading(false);
    }
  };

  // Function to fetch task statistics for all clients
  const fetchClientTaskStats = async (): Promise<Map<string, TaskStats>> => {
    try {
      setIsLoadingTaskStats(true);
      
      // Check if any filters are active
      const hasActiveFilters = Object.values(filters).some(f => f !== "");
      
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000', // Get all clients' task stats
        // Only pass filters if they have values
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.phone && { phone: filters.phone }),
        ...(filters.district && { district: filters.district }),
        ...(filters.pan && { pan: filters.pan }),
        ...(filters.branch && { branch: filters.branch }),
        ...(filters.category && { category: filters.category }),
        ...(filters.businessType && { businessType: filters.businessType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.gstNumber && { gstNumber: filters.gstNumber }),
        ...(filters.tanNumber && { tanNumber: filters.tanNumber }),
        ...(filters.cinNumber && { cinNumber: filters.cinNumber }),
        ...(filters.udyamNumber && { udyamNumber: filters.udyamNumber }),
        ...(filters.iecCode && { iecCode: filters.iecCode }),
      });

      const response = await fetch(`${Base_url}clients/task-statistics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task statistics');
      }

      const data = await response.json();
      
      
      // Create a map of clientId to taskStatistics
      const statsMap = new Map<string, TaskStats>();
      data.results.forEach((item: any) => {
        const taskStats: TaskStats = {
          pending: item.pendingTasks,
          ongoing: item.ongoingTasks,
          completed: item.completedTasks,
          delayed: item.delayedTasks,
          onHold: item.on_holdTasks,
          cancelled: item.cancelledTasks,
          total: item.totalTasks
        };
        
        statsMap.set(item._id, taskStats);
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

  const fetchClients = async (page: number = 1, limit: number = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters, only including non-empty values
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(sortBy && { sortBy }),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.phone && { phone: filters.phone }),
        ...(filters.district && { district: filters.district }),
        ...(filters.state && { state: filters.state }),
        ...(filters.country && { country: filters.country }),
        ...(filters.status && { status: filters.status }),
        ...(filters.pan && { pan: filters.pan }),
        ...(filters.branch && { branch: filters.branch }),
        ...(filters.category && { category: filters.category }),
        ...(filters.businessType && { businessType: filters.businessType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.gstNumber && { gstNumber: filters.gstNumber }),
        ...(filters.tanNumber && { tanNumber: filters.tanNumber }),
        ...(filters.cinNumber && { cinNumber: filters.cinNumber }),
        ...(filters.udyamNumber && { udyamNumber: filters.udyamNumber }),
        ...(filters.iecCode && { iecCode: filters.iecCode }),
        ...(filters.activity && { activity: filters.activity }),
        ...(filters.subactivity && { subactivity: filters.subactivity })
      });

      const response = await fetch(`${Base_url}clients?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the actual API response structure
      if (data.results) {
        setTotalResults(data.totalResults || 0);
        setTotalPages(data.totalPages || 1);
        
        // Fetch task statistics for the found clients
        const newTaskStatsMap = await fetchClientTaskStats();
        setTaskStatsMap(newTaskStatsMap);
        
        
        // Merge clients with their task statistics
        const clientsWithTasks = (data.results || []).map((client: Client) => {
          const taskStats = newTaskStatsMap.get(client.id) || {
            pending: 0,
            ongoing: 0,
            completed: 0,
            delayed: 0,
            onHold: 0,
            cancelled: 0,
            total: 0
          };
          
          return { ...client, taskStats };
        });
        
        setClients(clientsWithTasks);
      } else {
        setError('Invalid response format from API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to load initial data without any filters
  const loadInitialData = async () => {
    await fetchClients(1, itemsPerPage);
  };

  useEffect(() => {
    loadInitialData();
    // Fetch business types, entity types, and activities on mount
    fetchBusinessTypes();
    fetchEntityTypes();
    fetchActivities();
  }, []); // Only run once on component mount

  useEffect(() => {
    fetchClients(currentPage, itemsPerPage);
  }, [currentPage, sortBy, itemsPerPage]);

  // Refetch clients when filters change
  useEffect(() => {
    if (Object.values(filters).some(f => f !== "")) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchClients(1, itemsPerPage);
    }
  }, [filters]);

  // Refetch clients when search query changes
  useEffect(() => {
    if (debouncedSearchQuery !== undefined) {
      setCurrentPage(1); // Reset to first page when searching
      fetchClients(1, itemsPerPage);
    }
  }, [debouncedSearchQuery]);

  // Debounce search query
  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.status-dropdown')) {
        // Close all status dropdowns
        const dropdowns = document.querySelectorAll('[id^="status-dropdown-"]');
        dropdowns.forEach(dropdown => {
          if (dropdown instanceof HTMLElement) {
            dropdown.classList.add('hidden');
          }
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Separate useEffect for filters and search to update task statistics
  useEffect(() => {
    // Update task stats when filters change
    const updateTaskStats = async () => {
      const newTaskStatsMap = await fetchClientTaskStats();
      setTaskStatsMap(newTaskStatsMap);
      
      // Update existing clients with new task stats
      setClients(prevClients => 
        prevClients.map(client => {
          const taskStats = newTaskStatsMap.get(client.id) || {
            pending: 0,
            ongoing: 0,
            completed: 0,
            delayed: 0,
            onHold: 0,
            cancelled: 0,
            total: 0
          };
          return { ...client, taskStats };
        })
      );
    };

    updateTaskStats();
  }, [filters, debouncedSearchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((client) => client.id));
    }
    setSelectAll(!selectAll);
  };

  const handleClientSelect = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch(`${Base_url}clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast.success('Client deleted successfully');
      fetchClients();
    } catch (err) {
      toast.error('Failed to delete client');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) return;

    setIsDeleting(true);
    try {
      
      const response = await fetch(`${Base_url}clients/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ clientIds: selectedClients })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete clients: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      toast.success(`Successfully deleted ${selectedClients.length} client(s)`);
      setSelectedClients([]);
      setSelectAll(false);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete selected clients');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to handle client status change
  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      // Convert status to lowercase for API
      const apiStatus = newStatus.toLowerCase();
      
      const response = await fetch(`${Base_url}clients/${clientId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: apiStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update client status');
      }

      toast.success(`Client status updated to ${newStatus}`);
      
      // Update the client status in the local state (keep display format)
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, status: apiStatus }
            : client
        )
      );
    } catch (err) {
      toast.error('Failed to update client status');
    }
  };

  const handleDownloadTemplate = () => {
    // Sample data that matches the validation schema
    const templateData = [
      {
        "ID": "", // Leave blank for new clients
        "Client Name": "Sample Client Name",
        "Client Phone": "9876543210",
        "Client Email": "sample@example.com",
        "Client Email 2": "sample2@example.com",
        "Client Address": "123 Sample Street, Sample City",
        "Client District": "Sample District",
        "Client State": "Maharashtra",
        "Client Country": "India",
        "Branch": "685140f7a5039eb69705aed6", // Valid ObjectId format
        "Category": "A", // Category: A, B, or C
        "Turnover": "10000000", // Annual turnover
        "Status": "active",
        "PAN": "ABCDE1234F", // Valid PAN format: 5 letters + 4 digits + 1 letter
        "Date of Birth": "1990-01-01",
        "Sort Order": 1,
        "Business Type": "Banking",
        "Entity Type": "Private Limited",
        "TAN Number": "ABCD12345E", // Valid TAN format: 4 letters + 5 digits + 1 letter
        "CIN Number": "A12345BC6789DEF123456", // Valid CIN format
        "Udyam Number": "UDYAM-MH-12-1234567", // Valid Udyam format
        "IEC Code": "1234567890", // Valid IEC format: 10 digits
        
        // GST Numbers (3 sets with valid formats)
        "GST State 1": "Maharashtra",
        "GST Number 1": "27ABCDE1234F1Z5", // Valid GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 letter + 1 letter + 1 letter
        "GST Date of Registration 1": "2023-01-15",
        "GST User ID 1": "GST_MAH_001",
        "GST State 2": "Karnataka",
        "GST Number 2": "29ABCDE1234F1Z5",
        "GST Date of Registration 2": "2023-03-20",
        "GST User ID 2": "GST_KAR_001",
        "GST State 3": "Tamil Nadu",
        "GST Number 3": "33ABCDE1234F1Z5",
        "GST Date of Registration 3": "2023-06-10",
        "GST User ID 3": "GST_TN_001",
        
        // Activities (5 sets with valid ObjectId formats)
        "Activity 1": "68b1a141564f514accb9b501", // Valid MongoDB ObjectId
        "Subactivity 1": "68b1a141564f514accb9b505", // Valid MongoDB ObjectId
        "Activity Notes 1": "Sample activity notes for activity 1",
        "Activity 2": "68b1a141564f514accb9b502",
        "Subactivity 2": "68b1a141564f514accb9b506",
        "Activity Notes 2": "Sample activity notes for activity 2",
        "Activity 3": "68b1a141564f514accb9b503",
        "Subactivity 3": "68b1a141564f514accb9b507",
        "Activity Notes 3": "Sample activity notes for activity 3",
        "Activity 4": "68b1a141564f514accb9b504",
        "Subactivity 4": "68b1a141564f514accb9b508",
        "Activity Notes 4": "Sample activity notes for activity 4",
        "Activity 5": "68b1a141564f514accb9b509",
        "Subactivity 5": "68b1a141564f514accb9b50A",
        "Activity Notes 5": "Sample activity notes for activity 5"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 20 }, // ID
      { wch: 30 }, // Name
      { wch: 20 }, // Phone
      { wch: 30 }, // Email
      { wch: 30 }, // Email 2
      { wch: 40 }, // Address
      { wch: 20 }, // District
      { wch: 20 }, // State
      { wch: 20 }, // Country
      { wch: 30 }, // Branch ID
      { wch: 15 }, // Category
      { wch: 20 }, // Turnover
      { wch: 20 }, // Status

      { wch: 15 }, // PAN
      { wch: 15 }, // Date of Birth
      { wch: 10 }, // Sort Order
      { wch: 25 }, // Business Type
      { wch: 20 }, // Entity Type
      { wch: 20 }, // TAN Number
      { wch: 20 }, // CIN Number
      { wch: 20 }, // Udyam Number
      { wch: 20 }, // IEC Code
      
      // GST Numbers (3 sets)
      { wch: 20 }, // GST State 1
      { wch: 20 }, // GST Number 1
      { wch: 20 }, // GST Date of Registration 1
      { wch: 20 }, // GST User ID 1
      { wch: 20 }, // GST State 2
      { wch: 20 }, // GST Number 2
      { wch: 20 }, // GST Date of Registration 2
      { wch: 20 }, // GST User ID 2
      { wch: 20 }, // GST State 3
      { wch: 20 }, // GST Number 3
      { wch: 20 }, // GST Date of Registration 3
      { wch: 20 }, // GST User ID 3
      
      // Activities (5 sets)
      { wch: 25 }, // Activity 1
      { wch: 25 }, // Subactivity 1
      { wch: 30 }, // Activity Notes 1
      { wch: 25 }, // Activity 2
      { wch: 25 }, // Subactivity 2
      { wch: 25 }, // Activity Notes 2
      { wch: 25 }, // Activity 3
      { wch: 25 }, // Subactivity 3
      { wch: 30 }, // Activity Notes 3
      { wch: 25 }, // Activity 4
      { wch: 25 }, // Subactivity 4
      { wch: 30 }, // Activity Notes 4
      { wch: 25 }, // Activity 5
      { wch: 25 }, // Subactivity 5
      { wch: 30 }, // Activity Notes 5
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Template");
    const fileName = `client_import_template_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Template downloaded successfully with sample data");
  };

  const handleExport = async () => {
    try {
      let exportData;
      if (selectedClients.length > 0) {
        // Export selected clients
        exportData = clients
          .filter((client) => selectedClients.includes(client.id))
          .map((client) => {
            // Helper function to get GST data for export
            const getGstExportData = (gstNumbers: any[]) => {
              const gstData: any = {};
              for (let i = 0; i < 3; i++) {
                const gst = gstNumbers[i];
                if (gst) {
                  gstData[`GST State ${i + 1}`] = gst.state || "";
                  gstData[`GST Number ${i + 1}`] = gst.gstNumber || "";
                  gstData[`GST Date of Registration ${i + 1}`] = gst.dateOfRegistration || "";
                  gstData[`GST User ID ${i + 1}`] = gst.gstUserId || "";
                } else {
                  gstData[`GST State ${i + 1}`] = "";
                  gstData[`GST Number ${i + 1}`] = "";
                  gstData[`GST Date of Registration ${i + 1}`] = "";
                  gstData[`GST User ID ${i + 1}`] = "";
                }
              }
              return gstData;
            };

            // Helper function to get activity data for export
            const getActivityExportData = (activities: any[]) => {
              const activityData: any = {};
              for (let i = 0; i < 5; i++) {
                const activity = activities[i];
                if (activity) {
                  activityData[`Activity ${i + 1}`] = activity.activity || "";
                  activityData[`Subactivity ${i + 1}`] = activity.subactivity || "";
                  activityData[`Activity Notes ${i + 1}`] = activity.notes || "";
                } else {
                  activityData[`Activity ${i + 1}`] = "";
                  activityData[`Subactivity ${i + 1}`] = "";
                  activityData[`Activity Notes ${i + 1}`] = "";
                }
              }
              return activityData;
            };

            return {
              ID: client.id,
              "Client Name": client.name,
              "Client Phone": client.phone,
              "Client Email": client.email,
              "Client Email 2": client.email2,
              "Client Address": client.address,
              "Client District": client.district,
              "Client State": client.state,
              "Client Country": client.country,
              "Branch": client.branch,
              "Category": client.category,
              "Turnover": client.turnover || "",
              "Status": client.status,

              "PAN": client.pan,
              "Date of Birth": client.dob,
              "Sort Order": client.sortOrder,
              "Business Type": client.businessType,
              "Entity Type": client.entityType,
              "TAN Number": client.tanNumber,
              "CIN Number": client.cinNumber,
              "Udyam Number": client.udyamNumber,
              "IEC Code": client.iecCode,
              
              // Multiple GST Numbers
              ...getGstExportData(client.gstNumbers || []),
              
              // Multiple Activities
              ...getActivityExportData(client.activities || []),
            };
          });
      } else {
        // Export all clients
        const response = await fetch(`${Base_url}clients?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        exportData = data.results.map((client: Client) => {
                      // Helper function to get GST data for export
            const getGstExportData = (gstNumbers: any[]) => {
              const gstData: any = {};
              for (let i = 0; i < 3; i++) {
                const gst = gstNumbers[i];
                if (gst) {
                  gstData[`GST State ${i + 1}`] = gst.state || "";
                  gstData[`GST Number ${i + 1}`] = gst.gstNumber || "";
                  gstData[`GST Date of Registration ${i + 1}`] = gst.dateOfRegistration || "";
                  gstData[`GST User ID ${i + 1}`] = gst.gstUserId || "";
                } else {
                  gstData[`GST State ${i + 1}`] = "";
                  gstData[`GST Number ${i + 1}`] = "";
                  gstData[`GST Date of Registration ${i + 1}`] = "";
                  gstData[`GST User ID ${i + 1}`] = "";
                }
              }
              return gstData;
            };

          // Helper function to get activity data for export
          const getActivityExportData = (activities: any[]) => {
            const activityData: any = {};
            for (let i = 0; i < 5; i++) {
              const activity = activities[i];
              if (activity) {
                activityData[`Activity ${i + 1}`] = activity.activity || "";
                activityData[`Subactivity ${i + 1}`] = activity.subactivity || "";
                activityData[`Activity Notes ${i + 1}`] = activity.notes || "";
              } else {
                activityData[`Activity ${i + 1}`] = "";
                activityData[`Subactivity ${i + 1}`] = "";
                activityData[`Activity Notes ${i + 1}`] = "";
              }
            }
            return activityData;
          };

          return {
            ID: client.id,
            "Client Name": client.name,
            "Client Phone": client.phone,
            "Client Email": client.email,
            "Client Email 2": client.email2,
            "Client Address": client.address,
            "Client District": client.district,
            "Client State": client.state,
            "Client Country": client.country,
            "Branch": client.branch,
            "Category": client.category,
            "Turnover": (client as any).turnover || "",
            "Status": client.status,
            
            "PAN": client.pan,
            "Date of Birth": client.dob,
            "Sort Order": client.sortOrder,
            "Business Type": client.businessType,
            "Entity Type": client.entityType,
            "TAN Number": client.tanNumber,
            "CIN Number": client.cinNumber,
            "Udyam Number": client.udyamNumber,
            "IEC Code": client.iecCode,
            
            // Multiple GST Numbers
            ...getGstExportData(client.gstNumbers || []),
            
            // Multiple Activities
            ...getActivityExportData(client.activities || []),
          };
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Name
        { wch: 20 }, // Phone
        { wch: 30 }, // Email
        { wch: 30 }, // Email 2
        { wch: 40 }, // Address
        { wch: 20 }, // District
        { wch: 20 }, // State
        { wch: 20 }, // Country
        { wch: 30 }, // Branch ID
        { wch: 15 }, // Category
        { wch: 20 }, // Turnover
        { wch: 20 }, // Status

        { wch: 15 }, // PAN
        { wch: 15 }, // Date of Birth
        { wch: 10 }, // Sort Order
        { wch: 25 }, // Business Type
        { wch: 20 }, // Entity Type
        { wch: 20 }, // TAN Number
        { wch: 20 }, // CIN Number
        { wch: 20 }, // Udyam Number
        { wch: 20 }, // IEC Code
        
        // GST Numbers (3 sets)
        { wch: 20 }, // GST State 1
        { wch: 20 }, // GST Number 1
        { wch: 20 }, // GST Date of Registration 1
        { wch: 20 }, // GST User ID 1
        { wch: 20 }, // GST State 2
        { wch: 20 }, // GST Number 2
        { wch: 20 }, // GST Date of Registration 2
        { wch: 20 }, // GST User ID 2
        { wch: 20 }, // GST State 3
        { wch: 20 }, // GST Number 3
        { wch: 20 }, // GST Date of Registration 3
        { wch: 20 }, // GST User ID 3
        
        // Activities (5 sets)
        { wch: 25 }, // Activity 1
        { wch: 25 }, // Subactivity 1
        { wch: 30 }, // Activity Notes 1
        { wch: 25 }, // Activity 2
        { wch: 25 }, // Subactivity 2
        { wch: 30 }, // Activity Notes 2
        { wch: 25 }, // Activity 3
        { wch: 25 }, // Subactivity 3
        { wch: 30 }, // Activity Notes 3
        { wch: 25 }, // Activity 4
        { wch: 25 }, // Subactivity 4
        { wch: 30 }, // Activity Notes 4
        { wch: 25 }, // Activity 5
        { wch: 25 }, // Subactivity 5
        { wch: 30 }, // Activity Notes 5
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const fileName = `clients_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(selectedClients.length > 0 ? "Selected clients exported successfully with 3 GST numbers and activities" : "All clients exported successfully with 3 GST numbers and activities");
    } catch (error) {
      toast.error("Failed to export clients");
    }
  };

const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setImportProgress(0);
  const loadingToast = toast.loading("Importing clients...");

  // Excel structure:
  // - First row should contain headers exactly as defined in ExcelRow interface
  // - ID column: Leave empty for new clients, include ID for updates
  // - GST Number fields (up to 3 sets):
  //   * "GST State 1" to "GST State 3": State names
  //   * "GST Number 1" to "GST Number 3": GST numbers
  //   * "GST Date of Registration 1" to "GST Date of Registration 3": Dates
  //   * "GST User ID 1" to "GST User ID 3": User IDs
  // - Activity fields (up to 5 sets):
  //   * "Activity 1" to "Activity 5": Activity NAMES (will be converted to IDs)
  //   * "Subactivity 1" to "Subactivity 5": Subactivity NAMES (will be converted to IDs)
  //   * "Activity Notes 1" to "Activity Notes 5": Activity notes text
  // - All other fields: Standard client information

  try {
    // First, fetch activities to convert names to IDs
    const activitiesList = await fetchActivities();
    
    if (activitiesList.length === 0) {
      toast.error("Failed to fetch activities. Please try again.", { id: loadingToast });
      return;
    }
    
    
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

        // Debug: Log the first few rows to see the structure
        const columnNames = Object.keys(jsonData[0] || {});
        columnNames.forEach((col, idx) => {
        });
        const activityColumns = columnNames.filter(col => col.toLowerCase().includes('activity'));
        activityColumns.forEach(col => {
        });
        if (activityColumns.length === 0) {
        }
        jsonData.slice(0, 2).forEach((row, idx) => {
        });

        // Fetch all clients for upsert by name
        const allResponse = await fetch(`${Base_url}clients?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const allData = await allResponse.json();
        const allClients: Client[] = allData.results || [];

        // Track processing stats
        const processingStats = {
          total: jsonData.length,
          processed: 0,
          skipped: 0,
          errors: [] as Array<{ row: number; error: string; data: any }>,
          warnings: [] as Array<{ row: number; warning: string; data: any }>
        };

        // Transform data for bulk import
        const clients = jsonData.map((row, index) => {
          const rowNumber = index + 1;
          
          try {
            // Convert date format from "26.09.1991" to "1990-01-01"
            const convertDateFormat = (dateString: string): string => {
              if (!dateString || dateString.trim() === '') return '';
              
              const trimmedDate = dateString.toString().trim();
              
              // Handle "26.09.1991" format
              if (trimmedDate.includes('.')) {
                const parts = trimmedDate.split('.');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = parts[1].padStart(2, '0');
                  const year = parts[2];
                  return `${year}-${month}-${day}`;
                }
              }
              
              // Handle "26/09/1991" format
              if (trimmedDate.includes('/')) {
                const parts = trimmedDate.split('/');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = parts[1].padStart(2, '0');
                  const year = parts[2];
                  return `${year}-${month}-${day}`;
                }
              }
              
              // If already in "1990-01-01" format, return as is
              if (trimmedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return trimmedDate;
              }
              
              // If can't parse, return empty string
              return '';
            };

            // Parse/normalize dates coming from Excel (including ISO strings like 2017-06-30T18:30:00.000Z)
            // Backend expects date strings in DD.MM.YYYY format (e.g. 30.06.2017).
            // We always send dd.MM.yyyy for GST-related dates.
            const formatDateForBackend = (value: unknown): string => {
              if (value === null || value === undefined) return "";

              const toDate = (v: unknown): Date | null => {
                if (v instanceof Date) {
                  return isNaN(v.getTime()) ? null : v;
                }

                if (typeof v === "number" && Number.isFinite(v)) {
                  // Excel may provide dates as serial numbers.
                  try {
                    const parsed =
                      (XLSX as any)?.SSF?.parse_date_code?.(v) ?? null;
                    if (parsed && parsed.y && parsed.m && parsed.d) {
                      return new Date(parsed.y, parsed.m - 1, parsed.d);
                    }
                  } catch {
                    // fall through to manual conversion
                  }

                  // Manual Excel serial -> JS Date (1900 date system)
                  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel day 0
                  const ms = Math.round(v * 86400 * 1000);
                  const dt = new Date(excelEpoch.getTime() + ms);
                  return isNaN(dt.getTime()) ? null : dt;
                }

                const s = String(v).trim();
                if (!s) return null;

                // ISO formats (e.g. 2017-06-30T18:30:00.000Z)
                if (s.includes("T") || s.endsWith("Z")) {
                  const dt = new Date(s);
                  return isNaN(dt.getTime()) ? null : dt;
                }

                // yyyy-mm-dd
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                  const dt = new Date(`${s}T00:00:00`);
                  return isNaN(dt.getTime()) ? null : dt;
                }

                // dd-mm-yyyy or dd/mm/yyyy or dd.mm.yyyy
                const m = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
                if (m) {
                  const day = parseInt(m[1], 10);
                  const month = parseInt(m[2], 10);
                  const year = parseInt(m[3], 10);
                  if (
                    Number.isFinite(day) &&
                    Number.isFinite(month) &&
                    Number.isFinite(year)
                  ) {
                    const dt = new Date(year, month - 1, day);
                    return isNaN(dt.getTime()) ? null : dt;
                  }
                }

                // Fallback: let JS try
                const fallback = new Date(s);
                return isNaN(fallback.getTime()) ? null : fallback;
              };

              const dt = toDate(value);
              if (!dt) return "";

              const dd = String(dt.getDate()).padStart(2, "0");
              const mm = String(dt.getMonth() + 1).padStart(2, "0");
              const yyyy = String(dt.getFullYear());
              // Use dots as separators to match backend expectation: DD.MM.YYYY
              return `${dd}.${mm}.${yyyy}`;
            };

            // Helper function to extract GST numbers from Excel
            const extractGstNumbers = (row: ExcelRow) => {
              const gstNumbers = [];
              for (let i = 1; i <= 3; i++) {
                const stateRaw = row[`GST State ${i}` as keyof ExcelRow];
                const gstNumberRaw = row[`GST Number ${i}` as keyof ExcelRow];
                const dateRaw = row[`GST Date of Registration ${i}` as keyof ExcelRow];
                const gstUserIdRaw = row[`GST User ID ${i}` as keyof ExcelRow];

                const state = stateRaw ? String(stateRaw).trim() : "";
                const gstNumber = gstNumberRaw ? String(gstNumberRaw).trim() : "";
                const dateOfRegistration = formatDateForBackend(dateRaw);
                const gstUserId = gstUserIdRaw ? String(gstUserIdRaw).trim() : "";
                
                // Only add if at least state and gstNumber are provided
                if (state && gstNumber) {
                  gstNumbers.push({
                    state,
                    gstNumber,
                    dateOfRegistration: dateOfRegistration || "",
                    gstUserId: gstUserId || ""
                  });
                }
              }
              return gstNumbers;
            };

            // Helper function to extract activities from Excel and convert names to IDs
            const extractActivities = (row: ExcelRow, activitiesList: Activity[]) => {
              const activities = [];
              
              for (let i = 1; i <= 5; i++) {
                const activityKey = `Activity ${i}` as keyof ExcelRow;
                const subactivityKey = `Subactivity ${i}` as keyof ExcelRow;
                const notesKey = `Activity Notes ${i}` as keyof ExcelRow;
                
                const activityName = row[activityKey]?.toString().trim();
                const subactivityName = row[subactivityKey]?.toString().trim();
                const notes = row[notesKey]?.toString().trim();
                
                
                // Only process if at least activity name is provided
                if (activityName) {
                  // Convert activity name to ID
                  const activityId = findActivityIdByName(activityName, activitiesList);
                  
                  if (!activityId) {
                    // Still add it but log warning - backend will handle validation
                    continue; // Skip this activity if name not found
                  }
                  
                  const activityData: any = {
                    activity: activityId
                  };
                  
                  // Convert subactivity name to ID if provided
                  if (subactivityName) {
                    const subactivityId = findSubactivityIdByName(activityId, subactivityName, activitiesList);
                    if (subactivityId) {
                      activityData.subactivity = subactivityId;
                    } else {
                      // Don't add subactivity if not found
                    }
                  }
                  
                  // Only include notes if it has a value
                  if (notes) {
                    activityData.notes = notes;
                  }
                  
                  activities.push(activityData);
                } else {
                }
              }
              
              return activities;
            };

            const clientData = {
              name: (row["Client Name"]?.toString() || "").trim(),
              phone: String(row["Client Phone"] || "").replace(/[^0-9+]/g, ''),
              email: (row["Client Email"]?.toString() || "").trim(),
              email2: row["Client Email 2"]?.toString().trim() || "",
              address: (row["Client Address"]?.toString() || "").trim(),
              district: (row["Client District"]?.toString() || "").trim(),
              state: (row["Client State"]?.toString() || "").trim(),
              country: (row["Client Country"]?.toString() || "").trim(),

              pan: row["PAN"]?.toString().trim() || "",
              dob: convertDateFormat(row["Date of Birth"]?.toString() || ""),
              branch: row["Branch"]?.toString().trim() || "",
              category: row["Category"]?.toString().trim() || "",
              turnover: row["Turnover"]?.toString().trim() || "",
              sortOrder: parseInt(row["Sort Order"]?.toString() || "1"),
              businessType: row["Business Type"]?.toString().trim() || "",
              entityType: row["Entity Type"]?.toString().trim() || "",
              tanNumber: row["TAN Number"]?.toString().trim() || "",
              cinNumber: row["CIN Number"]?.toString().trim() || "",
              udyamNumber: row["Udyam Number"]?.toString().trim() || "",
              iecCode: row["IEC Code"]?.toString().trim() || ""
            };

            // Validation checks with warnings
            const validationIssues: string[] = [];
            if (!clientData.name) {
              validationIssues.push('Missing Client Name');
            }
            if (!clientData.email && !clientData.phone) {
              validationIssues.push('Missing both Email and Phone');
            }
            if (clientData.branch && !/^[0-9a-fA-F]{24}$/.test(clientData.branch)) {
              validationIssues.push(`Invalid Branch ID format: ${clientData.branch}`);
            }
            if (clientData.category && !['A', 'B', 'C'].includes(clientData.category)) {
              validationIssues.push(`Invalid Category: ${clientData.category}. Must be A, B, or C`);
            }
            if (clientData.dob && !clientData.dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
              validationIssues.push(`Invalid Date of Birth format: ${row["Date of Birth"]} -> ${clientData.dob}`);
            }
            
            if (validationIssues.length > 0) {
              processingStats.warnings.push({
                row: rowNumber,
                warning: validationIssues.join(', '),
                data: { name: clientData.name, email: clientData.email, phone: clientData.phone }
              });
            }

            // Extract GST numbers and activities
            const gstNumbers = extractGstNumbers(row);
            const activities = extractActivities(row, activitiesList);
            
            if (gstNumbers.length > 0) {
            }

            // Activities are already validated and converted to IDs in extractActivities
            // Filter out any activities that don't have an activity ID (name not found)
            const validActivities = activities.filter(act => {
              if (!act.activity) {
                return false;
              }
              return true;
            });

            // Log activity validation
            if (activities.length > validActivities.length) {
              const invalidCount = activities.length - validActivities.length;
            }
            if (validActivities.length > 0) {
            }

            let clientId = row["ID"];
            let isUpdate = false;
            let matchMethod = '';
            
            if (clientId) {
              isUpdate = true;
              matchMethod = 'ID provided in Excel';
            } else {
              // Try to find by name (case-insensitive)
              const found = allClients.find(
                (c) =>
                  c.name.trim().toLowerCase() ===
                  clientData.name.trim().toLowerCase()
              );
              if (found) {
                clientId = found.id;
                isUpdate = true;
                matchMethod = 'Matched by name';
              } else {
                isUpdate = false;
                matchMethod = 'New client';
              }
            }

            const finalClientData = {
              ...(clientId && { id: clientId }),
              ...clientData,
              gstNumbers,
              activities: validActivities
            };

            if (finalClientData.activities && finalClientData.activities.length > 0) {
              finalClientData.activities.forEach((act: any, idx: number) => {
              });
            } else {
            }

            processingStats.processed++;
            return finalClientData;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            processingStats.errors.push({
              row: rowNumber,
              error: errorMessage,
              data: row
            });
            processingStats.skipped++;
            // Return null to filter out failed rows
            return null;
          }
        });

        // Filter out null entries (failed rows)
        const validClients = clients.filter((client, index) => {
          if (!client) {
            return false;
          }
          return true;
        });

        if (processingStats.errors.length > 0) {
          processingStats.errors.forEach(err => {
          });
        }

        if (processingStats.warnings.length > 0) {
          processingStats.warnings.forEach(warn => {
          });
        }

        if (validClients.length === 0) {
          throw new Error('No valid clients to import after processing');
        }

        // Debug logging for the final data being sent
        
        const createCount = validClients.filter(c => c && !c.id).length;
        const updateCount = validClients.filter(c => c && c.id).length;
        
        const clientsWithActivities = validClients.filter(c => c && c.activities && c.activities.length > 0);
        const clientsWithGst = validClients.filter(c => c && c.gstNumbers && c.gstNumbers.length > 0);

        // Single API call instead of multiple requests
        
        // Log activity data for each client before sending
        validClients.forEach((client: any, idx: number) => {
          if (client.activities && client.activities.length > 0) {
          }
        });
        
        // Log first 2 clients full data
        validClients.slice(0, 2).forEach((client: any, idx: number) => {
        });
        
        const response = await fetch(`${Base_url}clients/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ clients: validClients })
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
          } catch (e) {
            // Not JSON, already logged as text
          }
          throw new Error(`Bulk import failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        

        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: any, index: number) => {
          });
          
          // Try to match errors back to rows
          result.errors.forEach((error: any, index: number) => {
            const entry = error.entry || error.client || error.data || {};
            const clientName = entry.name || 'Unknown';
            const matchingRow = jsonData.findIndex((row: ExcelRow) => 
              (row["Client Name"]?.toString() || "").trim().toLowerCase() === clientName.toLowerCase()
            );
            if (matchingRow >= 0) {
            } else {
            }
          });
        }

        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((warning: any, index: number) => {
          });
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        setImportProgress(null);
        toast.dismiss(loadingToast);

        if (result.errors && result.errors.length > 0) {
          const errorDetails = result.errors
            .map((err: any, idx: number) => {
              const entry = err.entry || err.client || err.data || {};
              const name = entry.name || 'Unknown';
              const msg = err.message || err.error || 'Unknown error';
              return `${idx + 1}. ${name}: ${msg}`;
            })
            .join('\n');
          
          toast.error(`Import completed with ${result.errors.length} errors. Check console for details.`, {
            duration: 5000
          });
        } else {
          const activityCount = result.activitiesCreated || 0;
          const gstCount = result.gstNumbersCreated || 0;
          let message = `Import completed: ${result.created || 0} clients added, ${result.updated || 0} clients updated`;
          if (activityCount > 0) message += `, ${activityCount} activities mapped`;
          if (gstCount > 0) message += `, ${gstCount} GST numbers added`;
          toast.success(message);
        }
        

        // Refresh the clients list
        fetchClients();
      } catch (error) {
        setImportProgress(null);
        toast.error("Failed to process import file", { id: loadingToast });
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    setImportProgress(null);
    toast.error("Failed to import clients", { id: loadingToast });
  }
};

  // Function to handle bulk activity assignment
  const handleBulkActivityAssignment = async () => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }

    if (!selectedActivityId) {
      toast.error('Please select an activity');
      return;
    }

    setIsBulkAssigning(true);
    try {
      const response = await fetch(`${Base_url}activities/bulk-create-timelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clientIds: selectedClients,
          activityId: selectedActivityId,
          subactivityId: selectedSubactivityId || undefined,
          status: "pending"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign activities');
      }

      const result = await response.json();
      toast.success(`Successfully assigned activity to ${selectedClients.length} client(s)`);
      
      // Reset states
      setShowBulkActivityModal(false);
      setSelectedActivityId("");
      setSelectedSubactivityId("");
      setSelectedClients([]);
      setSelectAll(false);
      
      // Refresh the clients list
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign activities');
    } finally {
      setIsBulkAssigning(false);
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

  // Function to format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Function to render task status badges
  const renderTaskStatus = (taskStats: TaskStats, clientId: string) => {
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

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Clients" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Clients</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedClients.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2 inline-block"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="ri-delete-bin-line me-2"></i>
                        Delete Selected ({selectedClients.length})
                      </>
                    )}
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
                  className="ti-btn ti-btn-secondary"
                  onClick={handleDownloadTemplate}
                  title="Download Excel template with sample data"
                >
                  <i className="ri-file-download-line me-2"></i> Template
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={handleExport}
                >
                  <i className="ri-upload-2-line me-2"></i> Export
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={() => setShowBulkEmailDrawer(true)}
                  title="Bulk email & templates"
                >
                  <i className="ri-mail-send-line me-2"></i> Bulk Email
                </button>
                <Link href="/clients/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Client
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search and Sort */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                {/* Left Section: Rows per page and Total clients */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                  {/* Rows per page selector */}
                  <div className="flex items-center">
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

                  {/* Total clients count */}
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      <i className="ri-group-line mr-1 text-primary"></i>
                      Total Clients: <span className="text-primary font-semibold">{totalResults}</span>
                    </span>
                  </div>

                  {/* Bulk Activity Button */}
                  {selectedClients.length > 0 && (
                    <button
                      type="button"
                      className="ti-btn ti-btn-success whitespace-nowrap"
                      onClick={() => setShowBulkActivityModal(true)}
                      title="Assign Activity to Selected Clients"
                    >
                      <i className="ri-task-line me-1"></i>
                      Assign Activity ({selectedClients.length})
                    </button>
                  )}
                </div>

                {/* Search and filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Search bar */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full pl-10 pr-4"
                      placeholder="Search by name, email, phone, city, business type, PAN..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      {isSearching ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                      <i className="ri-search-line text-gray-400"></i>
                      )}
                    </div>
                    {searchQuery && (
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          setSearchQuery("");
                        }}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>

                  {/* Filter button */}
                  <button
                    className={`ti-btn py-2 w-full sm:w-auto ${
                      showAdvancedFilters ? 'ti-btn-primary' : 'ti-btn-secondary'
                    }`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <i className={`ri-filter-${showAdvancedFilters ? 'fill' : 'line'} me-2`}></i>
                    Filters
                    {Object.values(filters).some(f => f !== "") && (
                      <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-1">
                        {Object.values(filters).filter(f => f !== "").length}
                      </span>
                    )}
                  </button>

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
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                      setFilters({
                        name: "",
                        email: "",
                        phone: "",
                        district: "",
                        state: "",
                        country: "",
                        status: "",
                        pan: "",
                        branch: "",
                        category: "",
                        businessType: "",
                        entityType: "",
                        gstNumber: "",
                        tanNumber: "",
                        cinNumber: "",
                        udyamNumber: "",
                        iecCode: "",
                        activity: "",
                        subactivity: ""
                      });
                      setSortBy("name:asc");
                      setCurrentPage(1);
                      // Load initial data without any filters
                      loadInitialData();
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.category}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, category: e.target.value }));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="">All Categories</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </div>

                    {/* Business Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Type
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.businessType}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, businessType: e.target.value }));
                          setCurrentPage(1);
                        }}
                        disabled={businessTypeLoading}
                      >
                        <option value="">All Business Types</option>
                        {businessTypeLoading ? (
                          <option value="" disabled>Loading...</option>
                        ) : (
                          businessTypes.map((businessType) => (
                            <option key={businessType.id} value={businessType.name}>
                              {businessType.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Entity Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entity Type
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.entityType}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, entityType: e.target.value }));
                          setCurrentPage(1);
                        }}
                        disabled={entityTypeLoading}
                      >
                        <option value="">All Entity Types</option>
                        {entityTypeLoading ? (
                          <option value="" disabled>Loading...</option>
                        ) : (
                          entityTypes.map((entityType) => (
                            <option key={entityType.id} value={entityType.name}>
                              {entityType.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Activity Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.activity}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            activity: e.target.value,
                            subactivity: ""
                          }));
                          setCurrentPage(1);
                        }}
                        disabled={isLoadingActivities}
                      >
                        <option value="">All Activities</option>
                        {isLoadingActivities ? (
                          <option value="" disabled>Loading...</option>
                        ) : (
                          activities.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Subactivity Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subactivity
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.subactivity}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, subactivity: e.target.value }));
                          setCurrentPage(1);
                        }}
                        disabled={!filters.activity}
                      >
                        <option value="">All Subactivities</option>
                        {filters.activity &&
                          activities.find((a) => a.id === filters.activity)?.subactivities?.map((sub) => (
                            <option key={sub._id} value={sub._id}>
                              {sub.name}
                              {sub.frequency ? ` (${sub.frequency})` : ""}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* GST Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter GST number"
                        value={filters.gstNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, gstNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* TAN Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TAN Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter TAN number"
                        value={filters.tanNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, tanNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* CIN Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CIN Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter CIN number"
                        value={filters.cinNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, cinNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* Udyam Number Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Udyam Number
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter Udyam number"
                        value={filters.udyamNumber}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, udyamNumber: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* IEC Code Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IEC Code
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter IEC code"
                        value={filters.iecCode}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, iecCode: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* State Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter state"
                        value={filters.state}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, state: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* Country Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Enter country"
                        value={filters.country}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, country: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        className="form-select w-full"
                        value={filters.status}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, status: e.target.value }));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                    <button
                      className="ti-btn ti-btn-secondary me-2"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          category: "",
                          businessType: "",
                          entityType: "",
                          gstNumber: "",
                          tanNumber: "",
                          cinNumber: "",
                          udyamNumber: "",
                          iecCode: "",
                          state: "",
                          country: "",
                          status: "",
                          activity: "",
                          subactivity: ""
                        }));
                        setCurrentPage(1);
                        // Load initial data without these filters
                        loadInitialData();
                      }}
                    >
                      <i className="ri-filter-off-line me-2"></i>
                      Clear Filters
                    </button>
                    <button
                      className="ti-btn ti-btn-primary"
                      onClick={() => setShowAdvancedFilters(false)}
                    >
                      <i className="ri-check-line me-2"></i>
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Active Filters Summary */}
              {(searchQuery || Object.values(filters).some(f => f !== "")) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-filter-3-fill text-blue-600 mr-2"></i>
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => {
                        setSearchQuery("");
                        setDebouncedSearchQuery("");
                        setFilters(prev => ({
                          ...prev,
                          category: "",
                          businessType: "",
                          entityType: "",
                          gstNumber: "",
                          tanNumber: "",
                          cinNumber: "",
                          udyamNumber: "",
                          iecCode: "",
                          state: "",
                          country: "",
                          status: "",
                          activity: "",
                          subactivity: ""
                        }));
                        setCurrentPage(1);
                        // Load initial data without any filters
                        loadInitialData();
                      }}
                    >
                      <i className="ri-close-line mr-1"></i>
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {debouncedSearchQuery && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i className="ri-search-line mr-1"></i>
                        Search: "{debouncedSearchQuery}"
                        <button
                          className="ml-1 text-green-600 hover:text-green-800"
                          onClick={() => {
                            setSearchQuery("");
                          }}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Category: {filters.category}
                        <button
                          className="ml-1 text-purple-600 hover:text-purple-800"
                          onClick={() => setFilters(prev => ({ ...prev, category: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.businessType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Business Type: {filters.businessType}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, businessType: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.entityType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Entity Type: {filters.entityType}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, entityType: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.activity && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Activity: {activities.find((a) => a.id === filters.activity)?.name ?? filters.activity}
                        <button
                          className="ml-1 text-amber-600 hover:text-amber-800"
                          onClick={() => setFilters(prev => ({ ...prev, activity: "", subactivity: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.subactivity && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Subactivity: {activities.find((a) => a.id === filters.activity)?.subactivities?.find((s) => s._id === filters.subactivity)?.name ?? filters.subactivity}
                        <button
                          className="ml-1 text-amber-600 hover:text-amber-800"
                          onClick={() => setFilters(prev => ({ ...prev, subactivity: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.gstNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        GST: {filters.gstNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, gstNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.tanNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        TAN: {filters.tanNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, tanNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.cinNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        CIN: {filters.cinNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, cinNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.udyamNumber && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Udyam: {filters.udyamNumber}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, udyamNumber: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.iecCode && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        IEC: {filters.iecCode}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, iecCode: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.state && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        State: {filters.state}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, state: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.country && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Country: {filters.country}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, country: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
                    {filters.status && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Status: {filters.status}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setFilters(prev => ({ ...prev, status: "" }))}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </span>
                    )}
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
                <>
                  {/* Search Results Indicator */}
                  {debouncedSearchQuery && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <i className="ri-search-line text-green-600 mr-2"></i>
                        <span className="text-sm font-medium text-green-800">
                          Search Results for "{debouncedSearchQuery}": {totalResults} clients found
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        <i className="ri-information-line mr-1"></i>
                        Note: Search results show basic client info and task statistics. Use filters for detailed information.
                      </div>
                    </div>
                  )}
                  
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="form-checkbox border-gray-500"
                              checked={selectedClients.length === clients.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">City</th>
                          <th className="px-4 py-3">Created Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Task Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.length > 0 ? (
                          clients.map((client: ClientWithTasks, index: number) => (
                            <tr
                              key={client.id}
                              className={`border-b border-gray-200 ${
                                index % 2 === 0 ? "bg-gray-50" : ""
                              }`}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedClients.includes(client.id)}
                                  onChange={() => handleClientSelect(client.id)}
                                  style={{ borderColor: 'black',borderWidth: '1px' }}
                                />
                              </td>
                              <td>
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => router.push(`/analytics/clients/${client.id}/overview`)}
                                    className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                                  >
                                    {client.name}
                                  </button>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <i className="ri-mail-line mr-1 text-gray-400"></i>
                                    {client.email}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <i className="ri-phone-line mr-1 text-gray-400"></i>
                                    {client.phone}
                                  </div>
                                  {client.category && (
                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                      <i className="ri-bookmark-line mr-1 text-gray-400"></i>
                                      <span className="mr-1">Category:</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        client.category.trim().toUpperCase() === 'A' ? 'bg-purple-100 text-purple-800' :
                                        client.category.trim().toUpperCase() === 'B' ? 'bg-indigo-100 text-indigo-800' :
                                        client.category.trim().toUpperCase() === 'C' ? 'bg-pink-100 text-pink-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {client.category.trim().toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  {client.businessType && (
                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                      <i className="ri-building-line mr-1 text-gray-400"></i>
                                      <span className="mr-1">Business Type:</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800`}>
                                        {client.businessType}
                                      </span>
                                    </div>
                                  )}
                                  {client.entityType && (
                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                      <i className="ri-file-list-line mr-1 text-gray-400"></i>
                                      <span className="mr-1">Entity Type:</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800`}>
                                        {client.entityType}
                                      </span>
                                    </div>
                                  )}
                                  {client.pan && (
                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                      <i className="ri-id-card-line mr-1 text-gray-400"></i>
                                      PAN: {client.pan}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{client.district || 'N/A'}</td>
                              <td>
                                <div className="text-sm text-gray-700">
                                  <i className="ri-calendar-line mr-1 text-gray-400"></i>
                                  {formatDate(client.createdAt)}
                                </div>
                              </td>
                              <td>
                                <div className="relative group">
                                  <button
                                    className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-all duration-200 ${
                                      client.status === 'active' ? 'bg-success text-white hover:bg-success-dark' : 
                                      client.status === 'inactive' ? 'bg-danger text-white hover:bg-danger-dark' :
                                      'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    }`}
                                    onClick={() => {
                                      // Toggle dropdown visibility
                                      const dropdown = document.getElementById(`status-dropdown-${client.id}`);
                                      if (dropdown) {
                                        dropdown.classList.toggle('hidden');
                                      }
                                    }}
                                  >
                                    {client.status === 'active' ? 'Active' : 
                                     client.status === 'inactive' ? 'Inactive' : 
                                     client.status || 'N/A'}
                                    <i className="ri-arrow-down-s-line ml-1"></i>
                                  </button>
                                  
                                  {/* Status Dropdown */}
                                  <div
                                    id={`status-dropdown-${client.id}`}
                                    className="status-dropdown hidden absolute z-10 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg"
                                  >
                                    <div className="py-1">
                                      <button
                                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => {
                                          handleStatusChange(client.id, 'Active');
                                          document.getElementById(`status-dropdown-${client.id}`)?.classList.add('hidden');
                                        }}
                                      >
                                        <span className="inline-block w-2 h-2 bg-success rounded-full mr-2"></span>
                                        Active
                                      </button>
                                      <button
                                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => {
                                          handleStatusChange(client.id, 'Inactive');
                                          document.getElementById(`status-dropdown-${client.id}`)?.classList.add('hidden');
                                        }}
                                      >
                                        <span className="inline-block w-2 h-2 bg-danger rounded-full mr-2"></span>
                                        Inactive
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {renderTaskStatus(client.taskStats, client.id)}
                              </td>
                              <td>
                                <div className="flex space-x-2">
                                  <Link
                                    href={`/clients/edit/${client.id}`}
                                    className="ti-btn ti-btn-primary ti-btn-sm"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </Link>
                                  {/* <button
                                    className="ti-btn ti-btn-success ti-btn-sm"
                                    title="View Files"
                                  >
                                    <i className="ri-folder-line"></i>
                                  </button> */}
                                  <button
                                    className="ti-btn ti-btn-danger ti-btn-sm"
                                    onClick={() => handleDelete(client.id)}
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-8">
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                  <i className="ri-folder-line text-4xl text-primary"></i>
                                </div>
                                <h3 className="text-xl font-medium mb-2">
                                  {debouncedSearchQuery ? 'No Search Results Found' : 'No Clients Found'}
                                </h3>
                                <p className="text-gray-500 text-center mb-6">
                                  {debouncedSearchQuery 
                                    ? `No clients found matching "${debouncedSearchQuery}". Try adjusting your search terms.`
                                    : 'Start by adding your first client.'
                                  }
                                </p>
                                {!debouncedSearchQuery && (
                                  <Link
                                    href="/clients/add"
                                    className="ti-btn ti-btn-primary"
                                  >
                                    <i className="ri-add-line mr-2"></i> Add First
                                    Client
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
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

      {/* Bulk Email right-side drawer */}
      <BulkEmailDrawer
        isOpen={showBulkEmailDrawer}
        onClose={() => setShowBulkEmailDrawer(false)}
        selectedClientIds={selectedClients}
        branchId={selectedBranchId}
        totalClientsCount={totalResults}
      />

      {/* Bulk Activity Assignment Modal */}
      {showBulkActivityModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                if (!isBulkAssigning) {
                  setShowBulkActivityModal(false);
                  setSelectedActivityId("");
                  setSelectedSubactivityId("");
                }
              }}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Modal header */}
              <div className="bg-primary px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    <i className="ri-task-line mr-2"></i>
                    Assign Activity to {selectedClients.length} Client(s)
                  </h3>
                  <button
                    onClick={() => {
                      if (!isBulkAssigning) {
                        setShowBulkActivityModal(false);
                        setSelectedActivityId("");
                        setSelectedSubactivityId("");
                      }
                    }}
                    className="text-white hover:text-gray-200"
                    disabled={isBulkAssigning}
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="bg-white px-6 py-4">
                <div className="space-y-4">
                  {/* Activity Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Activity <span className="text-red-500">*</span>
                    </label>
                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading activities...</span>
                      </div>
                    ) : (
                      <select
                        className="form-select w-full"
                        value={selectedActivityId}
                        onChange={(e) => {
                          setSelectedActivityId(e.target.value);
                          setSelectedSubactivityId(""); // Reset subactivity when activity changes
                        }}
                        disabled={isBulkAssigning}
                      >
                        <option value="">Choose an activity</option>
                        {activities.map((activity) => (
                          <option key={activity.id} value={activity.id}>
                            {activity.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Subactivity Selection */}
                  {selectedActivityId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Subactivity (Optional)
                      </label>
                      {(() => {
                        const selectedActivity = activities.find(
                          (act) => act.id === selectedActivityId
                        );
                        const subactivities = selectedActivity?.subactivities || [];

                        if (subactivities.length === 0) {
                          return (
                            <div className="text-sm text-gray-500 italic py-2">
                              No subactivities available for this activity
                            </div>
                          );
                        }

                        return (
                          <select
                            className="form-select w-full"
                            value={selectedSubactivityId}
                            onChange={(e) => setSelectedSubactivityId(e.target.value)}
                            disabled={isBulkAssigning}
                          >
                            <option value="">Choose a subactivity (optional)</option>
                            {subactivities.map((subactivity) => (
                              <option key={subactivity._id} value={subactivity._id}>
                                {subactivity.name}
                                {subactivity.frequency && ` (${subactivity.frequency})`}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  )}

                  {/* Info message */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <i className="ri-information-line text-blue-600 mr-2 mt-0.5"></i>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">About this action:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>This will create timelines for {selectedClients.length} selected client(s)</li>
                          <li>Initial status will be set to "Pending"</li>
                          <li>You can manage these timelines later from each client's profile</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={() => {
                    setShowBulkActivityModal(false);
                    setSelectedActivityId("");
                    setSelectedSubactivityId("");
                  }}
                  disabled={isBulkAssigning}
                >
                  <i className="ri-close-line mr-1"></i>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={handleBulkActivityAssignment}
                  disabled={isBulkAssigning || !selectedActivityId}
                >
                  {isBulkAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2 inline-block"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line mr-1"></i>
                      Assign Activity
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;

