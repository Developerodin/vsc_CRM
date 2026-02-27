"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';
import TaskManagement from './components/TaskManagement';
import ComplianceRegister from './components/ComplianceRegister';
import { normalizeQuarterlyPeriods, formatPeriodDisplay } from './utils/quarterPeriods';
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

  // Timelines filters – align with Compliance Register (Activity, Sub-Activity, Frequency, Period, Status, Client)
  const [timelineFilters, setTimelineFilters] = useState({
    activity: "",
    subActivity: "",
    frequency: "",
    period: "",
    status: "",
    client: ""
  });
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showTimelineFilters, setShowTimelineFilters] = useState(true);
  
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

  // Fetch timelines list (uses timelineFilters)
  const fetchTimelines = async (page = 1, limit = itemsPerPage) => {
    setIsLoading(true);
    setError(null);
    try {
      // Build period directly from Period dropdown (for simplicity we don't split quarter/month here)
      const periodToSend = timelineFilters.period || "";

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(timelineFilters.activity && { activity: timelineFilters.activity }),
        ...(timelineFilters.subActivity && { subactivity: timelineFilters.subActivity }),
        ...(timelineFilters.frequency && { frequency: timelineFilters.frequency }),
        ...(periodToSend && { period: periodToSend }),
        ...(timelineFilters.status && { status: timelineFilters.status }),
        ...(timelineFilters.client && { client: timelineFilters.client }),
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
  }, [currentPage, sortBy, itemsPerPage, timelineFilters]);

  // When filters change, reset to first page
  useEffect(() => {
    setCurrentPage(1);
  }, [timelineFilters]);

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

  // Fetch clients for Client filter
  const fetchClients = async () => {
    try {
      const response = await fetch(`${Base_url}clients?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data.results || []);
      }
    } catch {
      // Silent fail – filters still work without client list
    }
  };

  useEffect(() => {
    fetchClients();
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
          {/* Page Header – spec: accent bar, 14px bold title, buttons 11px bold */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Timelines & Tasks</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {activeTab === 'timelines' && selectedTimelines.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line text-xs" />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
                      disabled={isProcessingImport}
                    >
                      <i className={`text-xs ${isProcessingImport ? 'ri-loader-4-line animate-spin' : 'ri-download-2-line'}`} />
                      {isProcessingImport ? 'Processing...' : 'Import'}
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
                      href="/timelines/add"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                    >
                      <i className="ri-add-line text-xs" />
                      Add New Timeline
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation – spec: 11px, purple active */}
          <div className="bg-white shadow-sm border border-gray-100 rounded mb-6 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {[
                { id: 'tasks', label: 'Task Management', icon: 'ri-task-line' },
                { id: 'timelines', label: 'Timelines', icon: 'ri-time-line' },
                { id: 'register', label: 'Register', icon: 'ri-file-list-3-line' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-[#495057] hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className={`${tab.icon} text-xs`} />
                  {tab.label}
                </button>
              ))}
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
            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
              <div className="p-[10px]">
                {/* Status Summary Cards – spec: small text, consistent borders */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                  className="bg-amber-50 border border-amber-200 rounded p-4 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setTimelineFilters(prev => ({ ...prev, status: 'pending' }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-700">Pending</span>
                      <p className="text-lg font-bold text-[#323251] mt-0.5">{timelines.filter(t => t?.status === 'pending').length}</p>
                    </div>
                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                      <i className="ri-time-line text-amber-700 text-sm" />
                    </div>
                  </div>
                </div>
                <div
                  className="bg-purple-50 border border-purple-200 rounded p-4 cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => setTimelineFilters(prev => ({ ...prev, status: 'ongoing' }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-purple-700">Ongoing</span>
                      <p className="text-lg font-bold text-[#323251] mt-0.5">{timelines.filter(t => t?.status === 'ongoing').length}</p>
                    </div>
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="ri-loader-4-line text-purple-600 text-sm" />
                    </div>
                  </div>
                </div>
                <div
                  className="bg-emerald-50 border border-emerald-200 rounded p-4 cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={() => setTimelineFilters(prev => ({ ...prev, status: 'completed' }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700">Completed</span>
                      <p className="text-lg font-bold text-[#323251] mt-0.5">{timelines.filter(t => t?.status === 'completed').length}</p>
                    </div>
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-emerald-600 text-sm" />
                    </div>
                  </div>
                </div>
                <div
                  className="bg-red-50 border border-red-100 rounded p-4 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => setTimelineFilters(prev => ({ ...prev, status: 'delayed' }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-red-600">Delayed</span>
                      <p className="text-lg font-bold text-[#323251] mt-0.5">{timelines.filter(t => t?.status === 'delayed').length}</p>
                    </div>
                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                      <i className="ri-error-warning-line text-red-600 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters – align with Compliance Register (Activity, Sub-Activity, Frequency, Period, Status, Client) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider">Filter Options</h3>
                  <button
                    type="button"
                    onClick={() => setTimelineFilters({ activity: "", subActivity: "", frequency: "", period: "", status: "", client: "" })}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  >
                    <i className="ri-refresh-line text-xs" /> Reset
                  </button>
                </div>

                <div className="bg-gray-50/50 border border-gray-200 p-[10px] rounded">
                  <button
                    type="button"
                    onClick={() => setShowTimelineFilters(prev => !prev)}
                    className="mb-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-100"
                  >
                    <i className={`text-xs ${showTimelineFilters ? 'ri-filter-fill' : 'ri-filter-line'}`} />
                    {showTimelineFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>

                  {showTimelineFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      {/* Activity */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Activity</label>
                        <select
                          className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                          value={timelineFilters.activity}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTimelineFilters({
                              activity: value,
                              subActivity: "",
                              frequency: "",
                              period: "",
                              status: timelineFilters.status,
                              client: timelineFilters.client
                            });
                            setAvailablePeriods([]);
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

                      {/* Sub-Activity */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Sub-Activity</label>
                        <select
                          className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                          value={timelineFilters.subActivity}
                          onChange={(e) => {
                            const selectedSubActivityId = e.target.value;
                            const selectedActivity = activities.find(a => a.id === timelineFilters.activity);
                            const selectedSubActivity = selectedActivity?.subactivities?.find(sa => sa._id === selectedSubActivityId);

                            setTimelineFilters(prev => ({
                              ...prev,
                              subActivity: selectedSubActivityId,
                              frequency: selectedSubActivity?.frequency || "",
                              period: ""
                            }));

                            if (selectedSubActivity?.frequency) {
                              fetchFrequencyPeriods(selectedSubActivity.frequency);
                            } else {
                              setAvailablePeriods([]);
                            }
                          }}
                          disabled={!timelineFilters.activity}
                        >
                          <option value="">All Sub-Activities</option>
                          {timelineFilters.activity && activities.find(a => a.id === timelineFilters.activity)?.subactivities?.map((subActivity) => (
                            <option key={subActivity._id} value={subActivity._id}>
                              {subActivity.name} ({subActivity.frequency || 'No frequency'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Frequency</label>
                        <select
                          className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                          value={timelineFilters.frequency}
                          onChange={(e) => {
                            const freq = e.target.value;
                            setTimelineFilters(prev => ({
                              ...prev,
                              frequency: freq,
                              period: ""
                            }));
                            fetchFrequencyPeriods(freq);
                          }}
                          disabled={!!timelineFilters.subActivity}
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
                        {timelineFilters.subActivity && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Frequency auto-selected from sub-activity
                          </p>
                        )}
                      </div>

                      {/* Period */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Period</label>
                        <select
                          className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                          value={timelineFilters.period}
                          onChange={(e) => setTimelineFilters(prev => ({ ...prev, period: e.target.value }))}
                          disabled={!timelineFilters.frequency}
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
                          ) : timelineFilters.frequency ? (
                            <option value="" disabled>No periods available for this frequency</option>
                          ) : (
                            <option value="" disabled>Select frequency first</option>
                          )}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Status</label>
                        <select
                          className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                          value={timelineFilters.status}
                          onChange={(e) => setTimelineFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="delayed">Delayed</option>
                          <option value="ongoing">Ongoing</option>
                        </select>
                      </div>

                      {/* Client */}
                      <div className="relative">
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Client</label>
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full bg-white border border-gray-200 pl-3 pr-8 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium transition-all"
                            placeholder="Search client..."
                            value={clientSearchTerm || (timelineFilters.client ? clients.find(c => c.id === timelineFilters.client)?.name || "" : "")}
                            onChange={(e) => {
                              const value = e.target.value;
                              setClientSearchTerm(value);
                              if (!value) {
                                setTimelineFilters(prev => ({ ...prev, client: "" }));
                              }
                            }}
                            onFocus={() => {
                              if (timelineFilters.client) {
                                setClientSearchTerm("");
                              }
                            }}
                          />
                          {(clientSearchTerm || timelineFilters.client) && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientSearchTerm("");
                                setTimelineFilters(prev => ({ ...prev, client: "" }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}
                          {clientSearchTerm && !timelineFilters.client && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                              {clients
                                .filter(client =>
                                  client.name?.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                )
                                .slice(0, 20)
                                .map(client => (
                                  <div
                                    key={client.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-[11px]"
                                    onClick={() => {
                                      setTimelineFilters(prev => ({ ...prev, client: client.id }));
                                      setClientSearchTerm("");
                                    }}
                                  >
                                    {client.name}
                                  </div>
                                ))}
                              {clients.filter(client =>
                                client.name?.toLowerCase().includes(clientSearchTerm.toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-gray-500 text-[11px]">
                                  No clients found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rows per page & Sort */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <div className="flex items-center w-full lg:w-auto gap-2">
                  <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    value={itemsPerPage}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setItemsPerPage(value);
                      setCurrentPage(1);
                      fetchTimelines(1, value);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Sort by:</label>
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 w-full sm:w-auto"
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
                </div>
              </div>

              {/* Timelines Table – spec: gray-50/30 header, 11px uppercase th, 12px td, gray-200 borders */}
              <div className="overflow-x-auto min-h-[300px] border border-gray-200 rounded">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedTimelines.length === timelines.length && timelines.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Activity</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Sub Activity</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Client Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status & Dates</th>
                      <th className="px-1.5 pr-[10px] py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
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
                    ) : timelines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 border border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <i className="ri-time-line text-xl text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</p>
                            <p className="text-[11px] text-gray-500 mb-4">Start by adding your first timeline.</p>
                            <Link href="/timelines/add" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700">
                              <i className="ri-add-line text-xs" /> Add First Timeline
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      timelines.map((timeline) => (
                        <tr key={timeline.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                            <input type="checkbox" checked={selectedTimelines.includes(timeline.id)} onChange={() => handleSelectTimeline(timeline.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{timeline.activity?.name || "-"}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{timeline.subactivity?.name || "-"}</td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="space-y-0.5 text-[12px]">
                              <div className="font-medium text-[#323251]">{timeline.client?.name || "-"}</div>
                              {timeline.metadata?.gstState && (
                                <div className="text-[11px] text-[#495057]">GST State: {timeline.metadata.gstState}</div>
                              )}
                              {(() => {
                                const { idLabel, idValue } = getClientIdDisplay(timeline);
                                return idLabel && idValue ? <div className="text-[11px] text-[#495057]">{idLabel}: {idValue}</div> : null;
                              })()}
                            </div>
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="space-y-1 text-[12px]">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#495057]">Status:</span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                  timeline.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  timeline.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  timeline.status === 'ongoing' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                  timeline.status === 'delayed' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-600 border border-gray-200'
                                }`}>
                                  {timeline.status?.charAt(0).toUpperCase() + timeline.status?.slice(1) || "-"}
                                </span>
                              </div>
                              {(() => {
                                const rawPeriod = (timeline as any).period ?? timeline.period ?? "";
                                if (!rawPeriod) return null;
                                const freq = timeline.subactivity?.frequency || (timeline as any).frequency || timeline.frequency || "";
                                const display = formatPeriodDisplay(freq, rawPeriod) || rawPeriod;
                                if (!display) return null;
                                return (
                                  <div className="text-[11px] text-[#495057]">
                                    <span className="font-medium text-[#323251]">Period:</span> {display}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="pl-1.5 pr-[10px] py-2.5 border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Link href={`/timelines/edit/${timeline.id}`} className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" title="Edit">
                                <i className="ri-pencil-line text-sm" />
                              </Link>
                              <button type="button" onClick={() => handleDelete(timeline.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" title="Delete">
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

              {/* Pagination – spec: 11px bold, purple active, 10px ellipsis */}
              {!isLoading && !error && timelines.length > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-4 p-[10px] pt-4 border-t border-gray-100">
                  <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                  </div>
                  <nav className="flex flex-wrap items-center gap-1">
                    <button
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    {getPagination(currentPage, totalPages).map((page, idx) =>
                      page === "..." ? (
                        <span key={"ellipsis-" + idx} className="px-2 text-[10px] text-gray-300">...</span>
                      ) : (
                        <button
                          key={page}
                          className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${
                            currentPage === page ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
                          }`}
                          onClick={() => setCurrentPage(Number(page))}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Export Modal – spec: 10px padding, 14px title, 11px controls */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">
                {activeTab === 'register' ? 'Export Compliance Register' : 'Export Timelines'}
              </h3>
              <button type="button" onClick={() => { setShowExportModal(false); setExportFilters({ activity: '', subActivity: '', frequency: '', period: '' }); setAvailablePeriods([]); }} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-[10px] overflow-auto space-y-4">
              {activeTab === 'register' && (
                <p className="text-[12px] text-[#495057]">Use the same filters as the register. Leave empty to export all.</p>
              )}
              {(activeTab === 'register' || activeTab === 'timelines') && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Activity</label>
                    <select
                      className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
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

                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Sub-Activity</label>
                    <select
                      className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
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

                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Frequency</label>
                    <select
                      className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
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
                      <p className="text-[10px] text-gray-500 mt-1">Frequency auto-selected from sub-activity</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Period</label>
                    <select
                      className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
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
                      <p className="text-[10px] text-red-500 mt-1">No periods found for this frequency</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setShowExportModal(false); setExportFilters({ activity: '', subActivity: '', frequency: '', period: '' }); setAvailablePeriods([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { activeTab === 'register' ? performExport('register') : performExport('timelines'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
              >
                <i className="ri-download-2-line text-xs" /> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinesPage;