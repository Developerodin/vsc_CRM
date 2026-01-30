"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';
import TaskManagement from './components/TaskManagement';
import ComplianceRegister from './components/ComplianceRegister';
import { normalizeQuarterlyPeriods } from './utils/quarterPeriods';
import { getClientIdDisplay, getClientIdsForExport } from './utils/timelineClientId';

interface Timeline {
  _id: string;
  id: string;
  activity: {
    _id: string;
    id: string;
    name: string;
    sortOrder: number;
    subactivities: Array<{
      _id: string;
      name: string;
      frequency: string;
      frequencyConfig: any;
      fields: Array<{
        _id: string;
        name: string;
        type: string;
        required: boolean;
        options: string[];
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  subactivity: {
    _id: string;
    name: string;
    frequency: string;
    frequencyConfig: any;
    fields: Array<{
      _id: string;
      name: string;
      type: string;
      required: boolean;
      options: string[];
    }>;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    _id: string;
    id: string;
    name: string;
    phone: string;
    email: string;
    state?: string;
    pan?: string;
    tanNumber?: string;
    cinNumber?: string;
    gstNumbers?: Array<{ state?: string; gstNumber?: string }>;
  };
  status: 'pending' | 'completed' | 'ongoing' | 'delayed';
  frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  timelineType: string;
  period: string;
  financialYear: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  completedAt?: string;
  referenceNumber?: string;
  frequencyConfig: any;
  branch: string;
  fields: Array<{
    _id: string;
    fileName: string;
    fieldType: string;
    fieldValue: any;
  }>;
  metadata?: {
    gstState?: string;
    gstNumber?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  results: Timeline[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  "Timeline ID": string;
  "Name of Clients": string;
  "Subactivity": string;
  "Frequency": string;
  "Period": string;
  "Status": string;
  "Completed At": string;
  [key: string]: string; // For dynamic field columns
}

const TimelinesPage = () => {
  const [activeTab, setActiveTab] = useState<'timelines' | 'tasks' | 'register'>('tasks');
  const [selectedTimelines, setSelectedTimelines] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("activityName:asc");
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [clientSearchInputValue, setClientSearchInputValue] = useState("");
  const [filters, setFilters] = useState({
    activityName: "",
    clientName: "",
    status: "",
    group: ""
  });
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    activity: '',
    subActivity: '',
    frequency: '',
    period: ''
  });
  const [activities, setActivities] = useState<Array<{
    id: string;
    name: string;
    subactivities?: Array<{ 
      _id: string;
      name: string;
      frequency?: string;
      frequencyConfig?: any;
    }>;
  }>>([]);
  const [availablePeriods, setAvailablePeriods] = useState<Array<{
    period: string;
    quarter?: string;
    months: string[];
    startDate: string;
    endDate: string;
    displayName: string;
    financialYear: string;
  }>>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  
  // Import state
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Debounced search function for activity name
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setFilters(prev => ({
            ...prev,
            activityName: searchValue
          }));
          setCurrentPage(1);
        }, 500);
      };
    })(),
    []
  );

  // Debounced search function for client name
  const debouncedClientSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setFilters(prev => ({
            ...prev,
            clientName: searchValue
          }));
          setCurrentPage(1);
        }, 500);
      };
    })(),
    []
  );

  // Handle search input change for activity name
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value); // Update input immediately
    debouncedSearch(value); // Debounce the API call
  };

  // Handle client search input change
  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClientSearchInputValue(value); // Update input immediately
    debouncedClientSearch(value); // Debounce the API call
  };

  const fetchTimelines = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.activityName && { activityName: filters.activityName }),
        ...(filters.clientName && { client: filters.clientName }),
        ...(filters.status && { status: filters.status }),
        ...(filters.group && { group: filters.group }),
        ...(sortBy && { sortBy })
      });

      const response = await fetch(`${Base_url}timelines?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const data: ApiResponse = await response.json();
      setTimelines(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timelines');
      toast.error('Failed to fetch timelines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelines(currentPage, itemsPerPage);
  }, [currentPage, sortBy, filters]);

  // Fetch activities for export modal
  const fetchActivities = async () => {
    try {
      const response = await fetch(`${Base_url}activities?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.results);
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Fetch frequency periods when frequency changes
  const fetchFrequencyPeriods = async (frequency: string) => {
    if (!frequency) {
      setAvailablePeriods([]);
      return;
    }

    setIsLoadingPeriods(true);
    try {
      const response = await fetch(`${Base_url}timelines/frequency-periods?frequency=${frequency}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch frequency periods');
      }

      const data = await response.json();
      const raw = data.periods || [];
      setAvailablePeriods(
        frequency?.toLowerCase() === 'quarterly' ? normalizeQuarterlyPeriods(raw) : raw
      );
    } catch (err) {
      toast.error('Failed to fetch frequency periods');
      setAvailablePeriods([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTimelines(timelines.map(timeline => timeline.id));
    } else {
      setSelectedTimelines([]);
    }
  };

  const handleSelectTimeline = (timelineId: string) => {
    setSelectedTimelines(prev =>
      prev.includes(timelineId)
        ? prev.filter(id => id !== timelineId)
        : [...prev, timelineId]
    );
  };

  const handleDelete = async (timelineId: string) => {
    if (!confirm('Are you sure you want to delete this timeline?')) return;

    try {
      const response = await fetch(`${Base_url}timelines/${timelineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete timeline');
      }

      toast.success('Timeline deleted successfully');
      fetchTimelines(currentPage, itemsPerPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete timeline');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Are you sure you want to delete selected timelines?')) return;

    try {
      await Promise.all(
        selectedTimelines.map(timelineId =>
          fetch(`${Base_url}timelines/${timelineId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        )
      );

      toast.success('Selected timelines deleted successfully');
      setSelectedTimelines([]);
      fetchTimelines();
    } catch (err) {
      toast.error('Failed to delete some timelines');
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const performExport = async (exportType: 'timelines' | 'register' = 'timelines') => {
    try {
      let exportData;
      let fileName;

      if (exportType === 'register') {
        // Export compliance register (same structure as ComplianceRegister: timelines API + Reference Number, Completed At, Timeline ID)
        const queryParams = new URLSearchParams({
          limit: '1000',
          ...(exportFilters.activity && { activity: exportFilters.activity }),
          ...(exportFilters.subActivity && { subactivity: exportFilters.subActivity }),
          ...(exportFilters.frequency && { frequency: exportFilters.frequency }),
          ...(exportFilters.period && { period: exportFilters.period })
        });

        const response = await fetch(`${Base_url}timelines?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch timelines for register export');
        }

        const apiData: ApiResponse = await response.json();
        const timelinesList = apiData.results || [];

        exportData = timelinesList.map((timeline: Timeline) => {
          const { idValue } = getClientIdDisplay(timeline);
          return {
            "Timeline ID": timeline.id || timeline._id || "",
            "Client Name": timeline.client?.name || "",
            "Client ID (GST/TIN/PAN/CIN)": idValue,
            "Sub-Activity": timeline.subactivity?.name || "",
            "Frequency": timeline.subactivity?.frequency || timeline.frequency || "",
            "Period": timeline.period || "",
            "Status": timeline.status || "",
            "Reference Number": timeline.referenceNumber || "",
            "Completed At": timeline.completedAt ? new Date(timeline.completedAt).toISOString().split("T")[0] : ""
          };
        });

        fileName = `compliance_register_${new Date().toISOString().split("T")[0]}.xlsx`;
      } else {
        // Export timelines (existing logic)
        const queryParams = new URLSearchParams({
          limit: '1000',
          ...(exportFilters.activity && { activity: exportFilters.activity }),
          ...(exportFilters.subActivity && { subactivity: exportFilters.subActivity }),
          ...(exportFilters.frequency && { frequency: exportFilters.frequency }),
          ...(exportFilters.period && { period: exportFilters.period })
        });

        const response = await fetch(`${Base_url}timelines?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch timelines for export');
        }

        const apiData: ApiResponse = await response.json();
        
        // Get unique field names from all timelines for dynamic columns
        const allFieldNames = new Set<string>();
        apiData.results.forEach((timeline: Timeline) => {
          timeline.fields?.forEach(field => {
            allFieldNames.add(field.fileName);
          });
        });

        exportData = apiData.results.map((timeline: Timeline) => {
          const ids = getClientIdsForExport(timeline);
          const baseData = {
            "Timeline ID": timeline.id,
            "Name of Clients": timeline.client?.name || "",
            "GST State": ids.gstState,
            "GST Number": ids.gstNumber,
            "TIN": ids.tin,
            "PAN": ids.pan,
            "CIN": ids.cin,
            "Subactivity": timeline.subactivity?.name || "",
            "Frequency": timeline.subactivity?.frequency || timeline.frequency || "",
            "Period": timeline.period || "",
            "Status": timeline.status || "",
            "Completed At": timeline.completedAt ? new Date(timeline.completedAt).toLocaleDateString('en-GB').replace(/\//g, '-') : ""
          };

          // Add dynamic field columns
          const fieldData: any = {};
          allFieldNames.forEach(fieldName => {
            const field = timeline.fields?.find(f => f.fileName === fieldName);
            fieldData[fieldName] = field?.fieldValue || "";
          });

          return { ...baseData, ...fieldData };
        });

        fileName = `timelines_${new Date().toISOString().split("T")[0]}.xlsx`;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, exportType === 'register' ? "Compliance Register" : "Timelines");
      XLSX.writeFile(wb, fileName);
      
      toast.success(`${exportType === 'register' ? 'Compliance register' : 'Timelines'} exported successfully`);
      setShowExportModal(false);
      setExportFilters({ activity: '', subActivity: '', frequency: '', period: '' });
    } catch (error) {
      toast.error(`Failed to export ${exportType === 'register' ? 'compliance register' : 'timelines'}`);
    }
  };

  // Helper function to parse date in various formats (DD-MM-YYYY, DD/MM/YYYY, or Excel serial number)
  const parseDate = (dateValue: any): string | undefined => {
    if (dateValue === null || dateValue === undefined || dateValue === '') return undefined;
    
    try {
      // Handle Excel serial date numbers (e.g., 46008)
      if (typeof dateValue === 'number') {
        // Excel date serial number (days since 1900-01-01, with leap year bug)
        // JavaScript equivalent: subtract 25569 days and multiply by milliseconds per day
        const excelEpoch = new Date(1899, 11, 30); // December 30, 1899 (accounting for Excel's leap year bug)
        const dateObj = new Date(excelEpoch.getTime() + dateValue * 86400000);
        
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        const trimmedDate = dateValue.trim();
        if (trimmedDate === '') return undefined;
        
        // Handle DD-MM-YYYY or DD/MM/YYYY format
        const dateRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const match = trimmedDate.match(dateRegex);
        
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          
          // Create ISO date string (YYYY-MM-DD)
          const isoDate = `${year}-${month}-${day}`;
          
          // Validate the date
          const dateObj = new Date(isoDate);
          if (isNaN(dateObj.getTime())) {
            return undefined;
          }
          
          return dateObj.toISOString();
        }
        
        // Try parsing as ISO date or other standard formats
        const dateObj = new Date(trimmedDate);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    setImportProgress(0);

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

          // Transform data for bulk import fields API
          const timelineUpdates = jsonData.map(row => {
            const timelineId = row["Timeline ID"];
            if (!timelineId) {
              throw new Error('Timeline ID is required for all rows');
            }

            // Extract all field columns (excluding the fixed columns)
            const fixedColumns = ["Timeline ID", "Name of Clients", "Subactivity", "Frequency", "Period", "Status", "Completed At"];
            const fields: Array<{ fileName: string; fieldValue: string }> = [];
            
            Object.keys(row).forEach(key => {
              if (!fixedColumns.includes(key) && row[key] !== null && row[key] !== undefined) {
                // Convert value to string and check if it's not empty
                const fieldValue = String(row[key]).trim();
                if (fieldValue !== '') {
                  fields.push({
                    fileName: key,
                    fieldValue: fieldValue
                  });
                }
              }
            });

            // Prepare the update object with status and completedAt
            const updateData: any = {
              timelineId: timelineId,
              fields: fields  // Always include fields array (can be empty)
            };

            // Add status if present
            if (row["Status"]) {
              const statusValue = typeof row["Status"] === 'string' ? row["Status"].trim().toLowerCase() : String(row["Status"]).toLowerCase();
              if (statusValue && ['pending', 'completed', 'ongoing', 'delayed'].includes(statusValue)) {
                updateData.status = statusValue;
              }
            }

            // Add completedAt if present (can be Excel serial number or string)
            if (row["Completed At"] !== null && row["Completed At"] !== undefined && row["Completed At"] !== '') {
              const parsedDate = parseDate(row["Completed At"]);
              if (parsedDate) {
                updateData.completedAt = parsedDate;
              }
            }

            return updateData;
          });

          // Call the bulk import fields API
          const response = await fetch(`${Base_url}timelines/bulk-import-fields`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ timelineUpdates })
          });

          if (!response.ok) {
            throw new Error('Bulk import fields failed');
          }

          const result = await response.json();
          
          if (result.errors && result.errors.length > 0) {
            toast.error(`Import completed with ${result.errors.length} errors`);
          } else {
            toast.success(`Import completed successfully! ${timelineUpdates.length} timelines updated`);
          }

          // Refresh the timelines list
          fetchTimelines();
          
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to process file');
        } finally {
          setIsProcessingImport(false);
          setImportProgress(null);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Failed to read file');
      setIsProcessingImport(false);
      setImportProgress(null);
    }
  };

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "-";
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
      <Seo title="Timelines" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Timelines & Tasks</h1>
              <div className="box-tools flex items-center space-x-2">
                {activeTab === 'timelines' && selectedTimelines.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedTimelines.length})
                  </button>
                )}
                {activeTab === 'timelines' && (
                  <>
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
                  disabled={isProcessingImport}
                >
                  <i className={`${isProcessingImport ? 'ri-loader-4-line animate-spin' : 'ri-download-2-line'} me-2`}></i>
                  {isProcessingImport ? 'Processing...' : 'Import'}
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
                      href="/timelines/add"
                      className="ti-btn ti-btn-primary"
                    >
                      <i className="ri-add-line me-2"></i>
                      Add New Timeline
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="box !bg-transparent border-0 shadow-none mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-task-line me-2"></i>
                Task Management
              </button>
              <button
                onClick={() => setActiveTab('timelines')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'timelines'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-time-line me-2"></i>
                Timelines
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'register'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-file-list-3-line me-2"></i>
                Register
              </button>
            </div>
          </div>

          {/* Content Box */}
          {activeTab === 'tasks' ? (
            <TaskManagement />
          ) : activeTab === 'register' ? (
            <ComplianceRegister onExport={async (filters) => {
              // Open export modal with filters for register export
              setExportFilters(filters);
              setShowExportModal(true);
            }} />
          ) : (
            <div className="box">
              <div className="box-body">
                {/* Status Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Pending Card */}
                <div 
                  className="bg-warning/10 border border-warning/20 rounded-lg p-4 cursor-pointer hover:bg-warning/20 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'pending' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-warning">Pending</span>
                      <p className="text-2xl font-bold text-warning">
                        {timelines.filter(t => t?.status === 'pending').length}
                      </p>
                    </div>
                    <div className="bg-warning/20 p-3 rounded-full">
                      <i className="ri-time-line text-warning text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Ongoing Card */}
                <div 
                  className="bg-primary/10 border border-primary/20 rounded-lg p-4 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'ongoing' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-primary">Ongoing</span>
                      <p className="text-2xl font-bold text-primary">
                        {timelines.filter(t => t?.status === 'ongoing').length}
                      </p>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-full">
                      <i className="ri-loader-4-line text-primary text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Completed Card */}
                <div 
                  className="bg-success/10 border border-success/20 rounded-lg p-4 cursor-pointer hover:bg-success/20 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'completed' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-success">Completed</span>
                      <p className="text-2xl font-bold text-success">
                        {timelines.filter(t => t?.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-success/20 p-3 rounded-full">
                      <i className="ri-check-line text-success text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Delayed Card */}
                <div 
                  className="bg-danger/10 border border-danger/20 rounded-lg p-4 cursor-pointer hover:bg-danger/20 transition-colors"
                  onClick={() => setFilters({ ...filters, status: 'delayed' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-danger">Delayed</span>
                      <p className="text-2xl font-bold text-danger">
                        {timelines.filter(t => t?.status === 'delayed').length}
                      </p>
                    </div>
                    <div className="bg-danger/20 p-3 rounded-full">
                      <i className="ri-error-warning-line text-danger text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Sort */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                {/* Rows per page selector */}
                <div className="flex items-center w-full lg:w-auto">
                  <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newItemsPerPage = Number(e.target.value);
                      setItemsPerPage(newItemsPerPage);
                      setCurrentPage(1);
                      // Fetch data with new itemsPerPage
                      fetchTimelines(1, newItemsPerPage);
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
                  {/* Search bar for activity name */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full"
                      placeholder="Search by activity name..."
                      value={searchInputValue}
                      onChange={handleSearchChange}
                    />
                  </div>

                  {/* Search bar for client name */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <input
                      type="text"
                      className="form-control py-2 w-full"
                      placeholder="Search by client name..."
                      value={clientSearchInputValue}
                      onChange={handleClientSearchChange}
                    />
                  </div>

                  {/* Status filter */}
                  <div className="relative flex-grow sm:max-w-xs">
                    <select
                      className="form-select py-2 w-full"
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  {/* Sort dropdown */}
                  <select
                    className="form-select py-2 w-full sm:w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="activityName:asc">Activity Name (A-Z)</option>
                    <option value="activityName:desc">Activity Name (Z-A)</option>
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="endDate:asc">End Date (Earliest-Latest)</option>
                    <option value="endDate:desc">End Date (Latest-Earliest)</option>
                  </select>

                  {/* Reset button */}
                  <button
                    className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
                    onClick={() => {
                      setSearchInputValue("");
                      setClientSearchInputValue("");
                      setFilters({
                        activityName: "",
                        clientName: "",
                        status: "",
                        group: ""
                      });
                      setSortBy("activityName:asc");
                    }}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Reset
                  </button>
                </div>
              </div>

              {/* Search Results Indicator */}
              {(filters.activityName || filters.clientName || filters.status) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                      
                      {filters.activityName && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Activity: {filters.activityName}
                        </span>
                      )}
                      
                      {filters.clientName && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Client: {filters.clientName}
                        </span>
                      )}
                      
                      {filters.status && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSearchInputValue("");
                        setClientSearchInputValue("");
                        setFilters({
                          activityName: "",
                          clientName: "",
                          status: "",
                          group: ""
                        });
                        setCurrentPage(1);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <i className="ri-close-line me-1"></i>
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Timelines Table */}
              <div className="table-responsive">
                <table className="table table-bordered border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 border border-gray-300">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedTimelines.length === timelines.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 border border-gray-300">Activity</th>
                      <th className="px-4 py-3 border border-gray-300">Sub Activity</th>
                      <th className="px-4 py-3 border border-gray-300">Client Name</th>
                      <th className="px-4 py-3 border border-gray-300">Status & Dates</th>
                      <th className="px-4 py-3 border border-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 border border-gray-300 bg-white">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="text-center text-red-500 py-4 border border-gray-300 bg-white">
                          {error}
                        </td>
                      </tr>
                    ) : timelines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 border border-gray-300 bg-white">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                              <i className="ri-time-line text-4xl text-primary"></i>
                            </div>
                            <h3 className="text-xl font-medium mb-2">
                              {(filters.activityName || filters.clientName || filters.status) ? 'No Search Results Found' : 'No Timelines Found'}
                            </h3>
                            <p className="text-gray-500 text-center mb-6">
                              {(filters.activityName || filters.clientName || filters.status) 
                                ? `No timelines found matching your search criteria. Try adjusting your filters.`
                                : 'Start by adding your first timeline.'
                              }
                            </p>
                            {(filters.activityName || filters.clientName || filters.status) ? (
                              <button
                                onClick={() => {
                                  setSearchInputValue("");
                                  setClientSearchInputValue("");
                                  setFilters({
                                    activityName: "",
                                    clientName: "",
                                    status: "",
                                    group: ""
                                  });
                                  setCurrentPage(1);
                                }}
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-refresh-line me-2"></i>
                                Clear All Filters
                              </button>
                            ) : (
                              <Link
                                href="/timelines/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add First Timeline
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      timelines.map((timeline, index) => (
                        <tr key={timeline.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300">
                            <input
                              type="checkbox"
                              checked={selectedTimelines.includes(timeline.id)}
                              onChange={() => handleSelectTimeline(timeline.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td className="border border-gray-300">{timeline.activity?.name || "-"}</td>
                          <td className="border border-gray-300">{timeline.subactivity?.name || "-"}</td>
                          <td className="border border-gray-300">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{timeline.client?.name || "-"}</div>
                              {timeline.metadata?.gstState && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">GST State:</span> {timeline.metadata.gstState}
                                </div>
                              )}
                              {(() => {
                                const { idLabel, idValue } = getClientIdDisplay(timeline);
                                return idLabel && idValue ? (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">{idLabel}:</span> {idValue}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td className="border border-gray-300">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-600 min-w-[80px]">Status:</span>
                                <span className="text-xs ml-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    timeline.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    timeline.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    timeline.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                    timeline.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {timeline.status?.charAt(0).toUpperCase() + timeline.status?.slice(1) || "-"}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-600 min-w-[80px]">Period:</span>
                                <span className="text-xs text-gray-900 ml-2">
                                  {timeline.period || "-"}
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-600 min-w-[80px]">Due Date:</span>
                                <span className="text-xs text-gray-900 ml-2">
                                  {timeline.dueDate ? new Date(timeline.dueDate).toISOString().split('T')[0] : "-"}
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-600 min-w-[80px]">Created Date:</span>
                                <div className="text-xs text-gray-900 ml-2">
                                  {timeline.createdAt ? (
                                    <>
                                      <div>{new Date(timeline.createdAt).toISOString().split('T')[0]}</div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(timeline.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </>
                                  ) : "-"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300">
                            <div className="flex space-x-2">
                              <Link
                                href={`/timelines/edit/${timeline.id}`}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDelete(timeline.id)}
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
        )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {activeTab === 'register' ? 'Export Compliance Register' : 'Export Timelines'}
              </h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportFilters({ activity: '', subActivity: '', frequency: '', period: '' });
                  setAvailablePeriods([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === 'register' ? (
                <p className="text-sm text-gray-600">
                  Use the same filters as the register: Activity, Sub-Activity, Frequency, Period. Leave empty to export all.
                </p>
              ) : null}
              {(activeTab === 'register' || activeTab === 'timelines') ? (
                <>
                  {/* Activity Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity
                    </label>
                    <select
                      className="form-select w-full"
                      value={exportFilters.activity}
                      onChange={(e) => {
                        setExportFilters(prev => ({
                          ...prev,
                          activity: e.target.value,
                          subActivity: '', // Reset sub-activity when activity changes
                          frequency: '', // Reset frequency when activity changes
                          period: '' // Reset period when activity changes
                        }));
                        setAvailablePeriods([]); // Clear periods when activity changes
                      }}
                    >
                      <option value="">All Activities</option>
                      {activities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sub-Activity Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub-Activity
                    </label>
                    <select
                      className="form-select w-full"
                      value={exportFilters.subActivity}
                      onChange={(e) => {
                        const selectedSubActivityId = e.target.value;
                        const selectedActivity = activities.find(a => a.id === exportFilters.activity);
                        const selectedSubActivity = selectedActivity?.subactivities?.find(sa => sa._id === selectedSubActivityId);
                        
                        setExportFilters(prev => ({ 
                          ...prev, 
                          subActivity: selectedSubActivityId,
                          frequency: selectedSubActivity?.frequency || ''
                        }));
                        
                        // Fetch periods for the selected frequency
                        if (selectedSubActivity?.frequency) {
                          fetchFrequencyPeriods(selectedSubActivity.frequency);
                        } else {
                          setAvailablePeriods([]);
                        }
                      }}
                      disabled={!exportFilters.activity}
                    >
                      <option value="">All Sub-Activities</option>
                      {exportFilters.activity && activities.find(a => a.id === exportFilters.activity)?.subactivities?.map((subActivity) => (
                        <option key={subActivity._id} value={subActivity._id}>
                          {subActivity.name} ({subActivity.frequency || 'No frequency'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      className="form-select w-full"
                      value={exportFilters.frequency}
                      onChange={(e) => {
                        setExportFilters(prev => ({ ...prev, frequency: e.target.value }));
                        fetchFrequencyPeriods(e.target.value);
                      }}
                      disabled={!!exportFilters.subActivity} // Disabled when sub-activity is selected
                    >
                      <option value="">All Frequencies</option>
                      <option value="OneTime">One Time</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    {exportFilters.subActivity && (
                      <p className="text-xs text-gray-500 mt-1">
                        Frequency auto-selected from sub-activity
                      </p>
                    )}
                  </div>

                  {/* Period Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period
                    </label>
                    <select
                      className="form-select w-full"
                      value={exportFilters.period}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, period: e.target.value }))}
                      disabled={!exportFilters.frequency}
                    >
                      <option value="">All Periods</option>
                      {isLoadingPeriods ? (
                        <option value="" disabled>Loading periods...</option>
                      ) : availablePeriods.length > 0 ? (
                        availablePeriods.map((period) => (
                          <option key={period.period} value={period.period}>
                            {period.displayName}
                          </option>
                        ))
                      ) : exportFilters.frequency ? (
                        <option value="" disabled>No periods available for this frequency</option>
                      ) : (
                        <option value="" disabled>Select frequency first</option>
                      )}
                    </select>
                    {exportFilters.frequency && !isLoadingPeriods && availablePeriods.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        No periods found for {exportFilters.frequency} frequency
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportFilters({ activity: '', subActivity: '', frequency: '', period: '' });
                  setAvailablePeriods([]);
                }}
                className="ti-btn ti-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'register') {
                    performExport('register');
                  } else {
                    performExport('timelines');
                  }
                }}
                className="ti-btn ti-btn-primary"
              >
                <i className="ri-download-2-line me-2"></i>
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinesPage;