"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';
import { normalizeQuarterlyPeriods, formatPeriodDisplay, mergeWithExtendedPeriods, normalizeMonthlyPeriodKey } from "../utils/quarterPeriods";
import { getClientIdType, type ClientIdType } from "../utils/timelineClientId";

/** Normalize period to a comparable key (yearly: 2025/2025-2026 → same; monthly: February-2026/2026-02 → same). */
function periodKey(period: string, frequency?: string): string {
  if (!period?.trim()) return '';
  const freq = frequency?.toLowerCase();
  if (freq === 'yearly') {
    return /^\d{4}$/.test(period.trim()) ? period.trim() : (period.trim().split('-')[0] || period.trim());
  }
  if (freq === 'monthly') {
    return normalizeMonthlyPeriodKey(period);
  }
  return period.trim();
}

/** True if entry period matches the selected filter period (yearly: 2025 and 2025-2026 match). */
function periodMatches(entryPeriod: string, selectedPeriod: string, frequency?: string): boolean {
  if (!selectedPeriod) return true;
  return periodKey(entryPeriod, frequency) === periodKey(selectedPeriod, frequency);
}

// Compliance task types
export type ComplianceTaskType = 
  | 'ITR' 
  | 'GSTR-1' 
  | 'GSTR-3B' 
  | 'TDS Returns' 
  | 'ROC Compliance' 
  | 'Audit & Other Statutory Tasks';

export type RegisterStatus = 'Pending' | 'In Progress' | 'Completed' | 'Filed' | 'Approved' | 'Not Applicable';

interface ComplianceRegisterEntry {
  _id?: string;
  id?: string;
  clientId: string;
  clientName: string;
  clientGstState?: string; // Client's GST state (from timeline metadata)
  /** Activity name (e.g. GSTR-1, TDS Returns, ITR) – used to pick which client ID to show */
  activityName?: string;
  /** GST number for the timeline's gstState (prior state); used when activity is GST */
  clientGstNumber?: string;
  /** TAN/TIN number; used when activity is TDS */
  clientTin?: string;
  /** PAN number; used when activity is ITR or ROC/Audit */
  clientPan?: string;
  /** CIN number; used when activity is ROC, Audit, or other */
  clientCin?: string;
  subActivity: string;
  frequency: string;
  period: string;
  status: string;
  referenceNumber?: string;
  completedAt?: string;
  timelineId?: string; // Link to timeline
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // For dynamic fields
}

interface ComplianceRegisterProps {
  onExport?: (filters: {
    activity: string;
    subActivity: string;
    frequency: string;
    period: string;
  }) => void;
}

const ComplianceRegister: React.FC<ComplianceRegisterProps> = ({ onExport }) => {
  const [registerData, setRegisterData] = useState<ComplianceRegisterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string; entryId?: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [filters, setFilters] = useState({
    activity: "",
    subActivity: "",
    frequency: "",
    period: "",
    quarter: "",   // Q1–Q4 when frequency is Quarterly
    year: "",      // e.g. "2025" for Quarterly/Monthly
    month: "",     // "01"–"12" when frequency is Monthly
    status: "",
    client: ""
  });
  const [clientSearchTerm, setClientSearchTerm] = useState("");
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
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [entriesToShow, setEntriesToShow] = useState<number | 'all'>(100);
  /** Sort order: '' = none, 'asc' = A→Z, 'desc' = Z→A (by client name) */
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');
  const [isImporting, setIsImporting] = useState(false);
  /** When true, table shows the "Mark NA" column with a button in every row */
  const [showMarkNaColumn, setShowMarkNaColumn] = useState(false);
  /** Modal: mark single timeline or all displayed as Not Applicable */
  const [naConfirmModal, setNaConfirmModal] = useState<{ type: 'single'; entry: ComplianceRegisterEntry } | { type: 'all'; count: number } | null>(null);
  const [isMarkingNa, setIsMarkingNa] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Column definitions; markNa column shown only when showMarkNaColumn is true
  const allColumns = useMemo(() => [
    { key: 'clientName', label: 'Client Name', width: 200, editable: false, type: 'text' },
    { key: 'subActivity', label: 'Sub-Activity', width: 200, editable: false, type: 'text' },
    { key: 'frequency', label: 'Period', width: 140, editable: false, type: 'text' },
    { key: 'status', label: 'Status', width: 130, editable: false, type: 'text' },
    { key: 'markNa', label: 'Mark NA', width: 120, editable: false, type: 'action' },
    { key: 'referenceNumber', label: 'Reference Number', width: 180, editable: true, type: 'text' },
    { key: 'completedAt', label: 'Completed At', width: 150, editable: true, type: 'date' },
  ], []);
  const columns = useMemo(
    () => showMarkNaColumn ? allColumns : allColumns.filter(c => c.key !== 'markNa'),
    [allColumns, showMarkNaColumn]
  );

  const taskTypes: ComplianceTaskType[] = [
    'ITR',
    'GSTR-1',
    'GSTR-3B',
    'TDS Returns',
    'ROC Compliance',
    'Audit & Other Statutory Tasks'
  ];

  const statusOptions: RegisterStatus[] = [
    'Pending',
    'In Progress',
    'Completed',
    'Filed',
    'Approved',
    'Not Applicable'
  ];

  /** Activity names allowed in the register filter; others are hidden from the dropdown. */
  const ALLOWED_ACTIVITY_NAMES = [
    'Income Tax',
    'Auditing',
    'TDS',
    'GST',
    'ROC - PVT. LTD.',
    'ROC - LLP',
  ];
  const visibleActivities = useMemo(
    () => activities.filter((a) => ALLOWED_ACTIVITY_NAMES.includes(a.name?.trim() || '')),
    [activities]
  );

  /** Year options for Quarter/Month filters (current ±3). */
  const filterYears = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(y - 3 + i));
  }, []);
  const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const MONTH_OPTIONS = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  // Fetch clients
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
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  // Fetch activities for filter dropdowns
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
      setActivities(data.results || []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

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
      const normalized = frequency?.toLowerCase() === 'quarterly' ? normalizeQuarterlyPeriods(raw) : raw;
      setAvailablePeriods(mergeWithExtendedPeriods(frequency, normalized));
    } catch (err) {
      toast.error('Failed to fetch frequency periods');
      setAvailablePeriods([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  // Fetch register data from timelines API
  const fetchRegisterData = async () => {
    // Don't auto-fetch on mount, wait for user to click submit
    // This function will be called when user clicks submit button
  };

  // Handle submit button click - fetch data from timelines API
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build period from current filters at submit time (quarter+year or month+year or single period)
      const freq = (filters.frequency || '').toLowerCase();
      const periodToSend =
        freq === 'quarterly' && filters.quarter && filters.year
          ? `Q${filters.quarter.replace(/^Q/i, '')}-${filters.year}`
          : freq === 'monthly' && filters.month && filters.year
            ? `${filters.year}-${filters.month}`
            : (filters.period || '');

      const queryParams = new URLSearchParams({
        limit: '1000',
        ...(filters.activity && { activity: filters.activity }),
        ...(filters.subActivity && { subactivity: filters.subActivity }),
        ...(filters.frequency && { frequency: filters.frequency }),
        ...(periodToSend && { period: periodToSend }),
        ...(filters.status && { status: filters.status }),
        ...(filters.client && { client: filters.client })
      });

      const response = await fetch(`${Base_url}timelines?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const data = await response.json();
      const timelines = data.results || [];

      const gstState = (t: any) => t.metadata?.gstState || t.client?.state || '';
      const gstNumberForState = (t: any) => {
        const state = gstState(t);
        const list = t.client?.gstNumbers || [];
        if (!state || !Array.isArray(list)) return list?.[0]?.gstNumber ?? '';
        const found = list.find((g: any) => (g.state || '').toLowerCase() === state.toLowerCase());
        return found?.gstNumber ?? list?.[0]?.gstNumber ?? '';
      };

      // Transform timeline data to ComplianceRegisterEntry (activity-based client IDs)
      const transformedData: ComplianceRegisterEntry[] = timelines.map((timeline: any) => ({
        _id: timeline._id,
        id: timeline.id,
        clientId: timeline.client?._id || timeline.client?.id || '',
        clientName: timeline.client?.name || '',
        clientGstState: gstState(timeline),
        activityName: timeline.activity?.name || '',
        clientGstNumber: gstNumberForState(timeline),
        clientTin: timeline.client?.tanNumber || '',
        clientPan: timeline.client?.pan || '',
        clientCin: timeline.client?.cinNumber || '',
        subActivity: timeline.subactivity?.name || '',
        frequency: timeline.subactivity?.frequency || timeline.frequency || '',
        period: timeline.period || '',
        status: timeline.status || 'pending',
        referenceNumber: timeline.referenceNumber || '',
        completedAt: timeline.completedAt ? new Date(timeline.completedAt).toISOString().split('T')[0] : '',
        timelineId: timeline.id || timeline._id,
        createdAt: timeline.createdAt,
        updatedAt: timeline.updatedAt
      }));

      setRegisterData(transformedData);
      toast.success(`Loaded ${transformedData.length} entries`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast.error('Failed to fetch data');
      setRegisterData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchActivities();
  }, []);

  /** Effective period for API and table filter: Quarter+Year → Q1-2025, Month+Year → 2025-01, else single period. */
  const effectivePeriod = useMemo(() => {
    const freq = (filters.frequency || '').toLowerCase();
    if (freq === 'quarterly' && filters.quarter && filters.year) {
      return `Q${filters.quarter.replace(/^Q/i, '')}-${filters.year}`;
    }
    if (freq === 'monthly' && filters.month && filters.year) {
      return `${filters.year}-${filters.month}`;
    }
    return filters.period || '';
  }, [filters.frequency, filters.period, filters.quarter, filters.year, filters.month]);

  // Period-filter first (so selected period shows only that period's entries)
  const periodFilteredData = useMemo(
    () =>
      effectivePeriod
        ? registerData.filter((e) => periodMatches(e.period || '', effectivePeriod, e.frequency))
        : registerData,
    [registerData, effectivePeriod]
  );

  // Alphabetical sort by client name (asc / desc)
  const sortedData = useMemo(() => {
    if (!sortOrder) return periodFilteredData;
    return [...periodFilteredData].sort((a, b) => {
      const A = (a.clientName || '').trim().toLowerCase();
      const B = (b.clientName || '').trim().toLowerCase();
      return sortOrder === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
    });
  }, [periodFilteredData, sortOrder]);

  const displayedData = useMemo(() => {
    if (entriesToShow === 'all') return sortedData;
    return sortedData.slice(0, entriesToShow);
  }, [sortedData, entriesToShow]);

  // Save cell value - accepts entry ID or row index (row index is into displayed/period-filtered list)
  const saveCell = async (entryIdOrIndex: string | number, colKey: string, value: string) => {
    const dataSource = typeof entryIdOrIndex === 'number' ? periodFilteredData : registerData;
    const entry = typeof entryIdOrIndex === 'string'
      ? registerData.find(e => e.timelineId === entryIdOrIndex || e._id === entryIdOrIndex || e.id === entryIdOrIndex)
      : dataSource[entryIdOrIndex];
    
    if (!entry || !entry.timelineId) return;

    const normalizedValue = colKey === 'referenceNumber' ? value.trim() : value;
    if ((entry[colKey] || '') === normalizedValue) {
      return; // No change, skip API call
    }

    // completedAt filled → status "completed"; cleared → status "pending"
    const updatedEntry = { ...entry, [colKey]: normalizedValue };
    if (colKey === 'completedAt') {
      updatedEntry.status = normalizedValue ? 'completed' : 'pending';
    }

    // Update the entry in registerData by finding its index
    const entryIndex = registerData.findIndex(
      e => (e.timelineId === entry.timelineId) || 
           (e._id && e._id === entry._id) || 
           (e.id && e.id === entry.id)
    );
    
    if (entryIndex === -1) return;
    
    const updatedData = [...registerData];
    updatedData[entryIndex] = updatedEntry;
    setRegisterData(updatedData);

    setIsSaving(true);
    try {
      const payload: any = {};

      if (colKey === 'completedAt') {
        payload.completedAt = normalizedValue ? new Date(normalizedValue).toISOString() : null;
        payload.status = normalizedValue ? 'completed' : 'pending';
      }

      if (colKey === 'referenceNumber') {
        payload.referenceNumber = normalizedValue || null;
      }

      if (Object.keys(payload).length === 0) {
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${Base_url}timelines/${entry.timelineId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update timeline');
      }

      if (colKey === 'completedAt') {
        toast.success('Completed date updated successfully');
      }

      if (colKey === 'referenceNumber') {
        toast.success('Reference number updated successfully');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
      // Revert on error - reload from API would be better, but for now just don't update
    } finally {
      setIsSaving(false);
    }
  };


  // Handle cell click - accepts entry and colKey
  const handleCellClick = (entry: ComplianceRegisterEntry, entryIndex: number, colKey: string) => {
    if (!entry) return;

    const value = entry[colKey] || "";
    const entryId = entry.timelineId || entry._id || entry.id || entryIndex.toString();
    setEditingCell({ row: entryIndex, col: colKey, entryId });
    setEditValue(String(value));
    setSelectedCell({ row: entryIndex, col: colKey });
  };

  // Handle cell edit
  const handleCellEdit = (value: string) => {
    setEditValue(value);
  };

  // Handle cell save
  const handleCellSave = () => {
    if (editingCell && editingCell.entryId) {
      saveCell(editingCell.entryId, editingCell.col, editValue);
      setEditingCell(null);
      setEditValue("");
    }
  };

  /** PATCH timeline status to "not applicable" and update local register data */
  const markTimelineNotApplicable = useCallback(async (timelineId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${Base_url}timelines/${timelineId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'not applicable' })
      });
      if (!response.ok) return false;
      const idx = registerData.findIndex(
        e => e.timelineId === timelineId || e._id === timelineId || e.id === timelineId
      );
      if (idx !== -1) {
        const next = [...registerData];
        next[idx] = { ...next[idx], status: 'not applicable' };
        setRegisterData(next);
      }
      return true;
    } catch {
      return false;
    }
  }, [registerData]);

  const confirmMarkNa = useCallback(async () => {
    if (!naConfirmModal || isMarkingNa) return;
    setIsMarkingNa(true);
    try {
      if (naConfirmModal.type === 'single') {
        if (!naConfirmModal.entry.timelineId) {
          toast.error('No timeline ID for this entry');
          setNaConfirmModal(null);
          return;
        }
        const ok = await markTimelineNotApplicable(naConfirmModal.entry.timelineId);
        if (ok) toast.success('Timeline marked as Not Applicable');
        else toast.error('Failed to update timeline');
      } else {
        const entries = displayedData.filter(e => e.timelineId && (e.status || '').toLowerCase() !== 'not applicable');
        let done = 0;
        for (const entry of entries) {
          if (entry.timelineId && (await markTimelineNotApplicable(entry.timelineId))) done++;
        }
        if (done > 0) {
          toast.success(`${done} timeline(s) marked as Not Applicable`);
          handleSubmit();
        }
        if (done < entries.length && entries.length > 0) toast.error(`Failed to update ${entries.length - done} timeline(s)`);
      }
      setNaConfirmModal(null);
    } finally {
      setIsMarkingNa(false);
    }
  }, [naConfirmModal, isMarkingNa, displayedData, markTimelineNotApplicable, handleSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const colIndex = columns.findIndex(c => c.key === col);

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (editingCell) {
          handleCellSave();
        } else {
          const entry = displayedData[row];
          if (entry) {
            handleCellClick(entry, row, col);
          }
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (editingCell) {
          handleCellSave();
        }
        if (e.shiftKey) {
          if (colIndex > 0) {
            setSelectedCell({ row, col: columns[colIndex - 1].key });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: columns[columns.length - 1].key });
          }
        } else {
          if (colIndex < columns.length - 1) {
            setSelectedCell({ row, col: columns[colIndex + 1].key });
          } else if (row < displayedData.length - 1) {
            setSelectedCell({ row: row + 1, col: columns[0].key });
          } else {
            addNewRow();
            setSelectedCell({ row: displayedData.length, col: columns[0].key });
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (row > 0) {
          setSelectedCell({ row: row - 1, col });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (row < displayedData.length - 1) {
          setSelectedCell({ row: row + 1, col });
        } else {
          addNewRow();
          setSelectedCell({ row: displayedData.length, col });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setSelectedCell({ row, col: columns[colIndex - 1].key });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < columns.length - 1) {
          setSelectedCell({ row, col: columns[colIndex + 1].key });
        }
        break;
      case 'Escape':
        setEditingCell(null);
        setEditValue("");
        break;
      case 'Delete':
      case 'Backspace':
        if (!editingCell) {
          e.preventDefault();
          const entry = displayedData[row];
          if (entry && entry.timelineId) {
            saveCell(entry.timelineId, col, "");
          }
        }
        break;
    }
  }, [selectedCell, editingCell, editValue, registerData, displayedData, columns]);

  // Add new row - disabled since we only load from timelines
  const addNewRow = () => {
    toast('Add new entries through the Timelines section', { icon: 'ℹ️' });
  };

  // Delete row - disabled since we only display timeline data
  const deleteRow = async (rowIndex: number) => {
    toast('Delete timelines through the Timelines section', { icon: 'ℹ️' });
  };

  // Export to Excel (includes activity-appropriate client ID: GST / TIN / PAN / PAN&CIN)
  const getClientIdDisplayValue = (entry: ComplianceRegisterEntry) => {
    const idType = getClientIdType(entry.activityName, entry.subActivity);
    if (idType === 'gst') {
      return entry.clientGstState ? `${entry.clientGstNumber || ''} (${entry.clientGstState})` : (entry.clientGstNumber || '');
    }
    if (idType === 'tds') return entry.clientTin || '';
    if (idType === 'itr') return entry.clientPan || '';
    if (idType === 'roc') return entry.clientCin || '';
    return [entry.clientPan, entry.clientCin].filter(Boolean).join(' / ') || '';
  };

  const handleExport = async () => {
    const exportData = sortedData.map(entry => ({
      'Timeline ID': entry.timelineId || '',
      'Client Name': entry.clientName || '',
      'Client ID (GST/TIN/PAN/CIN)': getClientIdDisplayValue(entry),
      'Sub-Activity': entry.subActivity || '',
      'Frequency': entry.frequency || '',
      'Period': entry.period || '',
      'Status': entry.status || '',
      'Reference Number': entry.referenceNumber || '',
      'Completed At': entry.completedAt || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const columnWidths = [
      { wch: 28 }, // Timeline ID
      { wch: 30 }, // Client Name
      { wch: 24 }, // Client ID (GST/TIN/PAN/CIN)
      { wch: 25 }, // Sub-Activity
      { wch: 15 }, // Frequency
      { wch: 20 }, // Period
      { wch: 15 }, // Status
      { wch: 20 }, // Reference Number
      { wch: 15 }  // Completed At
    ];
    ws["!cols"] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compliance Register");
    const fileName = `compliance_register_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Compliance register exported successfully");
  };

  /** Parse Excel and PATCH timelines with Reference Number and Completed At (match by Timeline ID). */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = ev.target?.result;
        if (!data || typeof data !== 'object' || !(data instanceof ArrayBuffer)) return;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

        const timelineIdKey = 'Timeline ID';
        const refKey = 'Reference Number';
        const completedKey = 'Completed At';
        const statusKey = 'Status';
        const allKeys = rows.length ? Object.keys(rows[0] || {}) : [];
        const normalizedKeys = allKeys.reduce((acc, k) => {
          acc[k.trim()] = k;
          return acc;
        }, {} as Record<string, string>);
        const getVal = (row: Record<string, string | number>, key: string) => {
          const raw = normalizedKeys[key] || key;
          const v = row[raw] ?? row[key];
          return v == null ? '' : String(v).trim();
        };

        const parseDate = (val: string): string | null => {
          if (!val) return null;
          const n = Number(val);
          if (!Number.isNaN(n) && n > 0) {
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + n * 86400000);
            if (!Number.isNaN(d.getTime())) return d.toISOString();
          }
          const d = new Date(val);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        };

        let updated = 0;
        let failed = 0;
        setIsImporting(true);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const timelineId = getVal(row, timelineIdKey);
          if (!timelineId) continue;

          const referenceNumber = getVal(row, refKey);
          const completedAtRaw = getVal(row, completedKey);
          const completedAtIso = parseDate(completedAtRaw);
          const statusVal = (getVal(row, statusKey) || '').toLowerCase();

          const isMarkNa = statusVal === 'not applicable';
          if (!referenceNumber && !completedAtIso && !isMarkNa) continue;

          const payload: { referenceNumber?: string | null; completedAt?: string | null; status?: string } = {};
          payload.referenceNumber = referenceNumber || null;
          if (completedAtIso) {
            payload.completedAt = completedAtIso;
            payload.status = 'completed';
          }
          if (isMarkNa) {
            payload.status = 'not applicable';
          }

          try {
            const response = await fetch(`${Base_url}timelines/${timelineId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(payload)
            });
            if (response.ok) updated++;
            else failed++;
          } catch {
            failed++;
          }
        }
        setIsImporting(false);
        if (updated > 0) {
          toast.success(`Import complete: ${updated} updated${failed ? `, ${failed} failed` : ''}`);
          handleSubmit();
        } else if (failed > 0) {
          toast.error(`Import failed for ${failed} row(s). Check Timeline ID and try again.`);
        } else if (rows.length > 0) {
          toast('No rows had Timeline ID plus Reference Number or Completed At.', { icon: 'ℹ️' });
        } else {
          toast.error('Excel file was empty or invalid.');
        }
      } catch (err) {
        setIsImporting(false);
        toast.error('Failed to parse Excel. Use the exported template.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Render cell content
  const renderCell = (entry: ComplianceRegisterEntry, colKey: string, rowIndex: number) => {
    const column = columns.find(c => c.key === colKey);
    if (!column) return null;

    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colKey;
    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colKey;
    const value = entry[colKey] || "";

    if (isEditing) {
      if (colKey === 'completedAt' && column.type === 'date') {
        return (
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleCellSave();
              }
            }}
            className="w-full h-full border border-gray-200 text-[11px] font-medium px-2 outline-none focus:ring-0 focus:border-purple-300"
            autoFocus
          />
        );
      }

      if (colKey === 'referenceNumber' && column.type === 'text') {
        return (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleCellSave();
              }
            }}
            className="w-full h-full border border-gray-200 text-[11px] font-medium px-2 outline-none focus:ring-0 focus:border-purple-300"
            autoFocus
          />
        );
      }
    }

    // Mark NA column – spec: 11px bold button, amber warning variant
    if (colKey === 'markNa') {
      const isNa = (entry.status || '').toLowerCase() === 'not applicable';
      return (
        <div className="h-full min-h-[40px] px-1 flex items-center">
          <button
            type="button"
            disabled={!entry.timelineId || isNa}
            onClick={(e) => {
              e.stopPropagation();
              if (entry.timelineId && !isNa) setNaConfirmModal({ type: 'single', entry });
            }}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
            title={isNa ? 'Already Not Applicable' : 'Mark this timeline as Not Applicable'}
          >
            Mark NA
          </button>
        </div>
      );
    }

    // Client Name column: show name + activity-appropriate client ID (GST no / TIN / PAN / PAN & CIN)
    if (colKey === 'clientName') {
      const name = entry.clientName || '';
      const idType = getClientIdType(entry.activityName, entry.subActivity);
      let idLabel = '';
      let idValue = '';
      if (idType === 'gst') {
        idLabel = entry.clientGstState ? `GST (${entry.clientGstState})` : 'GST No.';
        idValue = entry.clientGstNumber || '';
      } else if (idType === 'tds') {
        idLabel = 'TIN';
        idValue = entry.clientTin || '';
      } else if (idType === 'itr') {
        idLabel = 'PAN';
        idValue = entry.clientPan || '';
      } else if (idType === 'roc') {
        idLabel = 'CIN';
        idValue = entry.clientCin || '';
      } else {
        idLabel = 'PAN / CIN';
        idValue = [entry.clientPan, entry.clientCin].filter(Boolean).join(' / ') || '';
      }
      return (
        <div
          className={`h-full px-0 py-0 flex flex-col justify-center text-[12px] ${isSelected ? 'bg-purple-50' : ''}`}
        >
          {name ? (
            <>
              <div className="font-medium text-[#323251]">{name}</div>
              {(idLabel && idValue) && (
                <div className="text-[11px] text-[#495057] mt-0.5">
                  <span className="font-medium">{idLabel}:</span> {idValue}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    }

    // Period column: Q3 2026 only (no Frequency, no Jan–Mar). Optionally show completed date.
    if (colKey === 'frequency') {
      const frequency = entry.frequency || '';
      const rawPeriod = entry.period || '';
      const periodDisplay = formatPeriodDisplay(frequency, rawPeriod) || (frequency ? rawPeriod : '');
      const completedAt = entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : '';
      return (
        <div
          className={`h-full px-0 py-0 flex flex-col justify-center text-[12px] ${isSelected ? 'bg-purple-50' : ''}`}
        >
          {periodDisplay ? (
            <>
              <div className="font-medium text-[#323251]">{periodDisplay}</div>
              {completedAt && <div className="text-[11px] text-[#495057] mt-0.5">{completedAt}</div>}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    }

    return (
      <div
        className={`h-full px-0 py-0 flex items-center text-[12px] font-medium text-[#323251] ${isSelected ? 'bg-purple-50' : ''} ${column.editable ? 'cursor-cell' : ''}`}
        onClick={() => column.editable && handleCellClick(entry, rowIndex, colKey)}
      >
        {value || (column.editable ? <span className="text-gray-400">Click to edit</span> : <span className="text-gray-400">-</span>)}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded" onKeyDown={handleKeyDown} tabIndex={0} ref={gridRef}>
      <div className="p-[10px]">
        {/* Header – spec: title 14px bold, accent bar, buttons 11px bold */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
            <h2 className="text-[0.875rem] font-bold text-gray-800">Compliance Register</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
            >
              <i className={`ri-filter-${showFilters ? 'fill' : 'line'} text-xs`} />
              Filters
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
              title="Upload Excel with Timeline ID, Reference Number, Completed At"
            >
              {isImporting ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-upload-2-line text-xs" />}
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
              title="Export current register (apply filters and Submit first)"
            >
              <i className="ri-download-2-line text-xs" />
              Export
            </button>
          </div>
        </div>

        {/* Filters – spec: labels/inputs 11px, border gray-200 */}
        {showFilters && (
        <div className="bg-gray-50/50 border border-gray-200 p-[10px] rounded mb-4">
          <h3 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-3">Filter Options</h3>
          <div className={`grid grid-cols-1 gap-3 ${(filters.frequency || '').toLowerCase() === 'quarterly' || (filters.frequency || '').toLowerCase() === 'monthly' ? 'md:grid-cols-8' : 'md:grid-cols-7'}`}>
            {/* Activity Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Activity
              </label>
              <select
                className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                value={filters.activity}
                onChange={(e) => {
                  setFilters({
                    activity: e.target.value,
                    subActivity: '',
                    frequency: '',
                    period: '',
                    quarter: '',
                    year: '',
                    month: '',
                    status: filters.status,
                    client: filters.client
                  });
                  setAvailablePeriods([]);
                }}
              >
                <option value="">All Activities</option>
                {visibleActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Activity Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Sub-Activity
              </label>
              <select
                className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                value={filters.subActivity}
                onChange={(e) => {
                  const selectedSubActivityId = e.target.value;
                  const selectedActivity = activities.find(a => a.id === filters.activity);
                  const selectedSubActivity = selectedActivity?.subactivities?.find(sa => sa._id === selectedSubActivityId);
                  
                  setFilters({
                    ...filters,
                    subActivity: selectedSubActivityId,
                    frequency: selectedSubActivity?.frequency || '',
                    period: (selectedSubActivity?.frequency || '').toLowerCase() === 'quarterly' || (selectedSubActivity?.frequency || '').toLowerCase() === 'monthly' ? '' : filters.period,
                    quarter: (selectedSubActivity?.frequency || '').toLowerCase() === 'quarterly' ? filters.quarter : '',
                    year: (selectedSubActivity?.frequency || '').toLowerCase() === 'quarterly' || (selectedSubActivity?.frequency || '').toLowerCase() === 'monthly' ? filters.year : '',
                    month: (selectedSubActivity?.frequency || '').toLowerCase() === 'monthly' ? filters.month : '',
                  });
                  
                  // Fetch periods for the selected frequency
                  if (selectedSubActivity?.frequency) {
                    fetchFrequencyPeriods(selectedSubActivity.frequency);
                  } else {
                    setAvailablePeriods([]);
                  }
                }}
                disabled={!filters.activity}
              >
                <option value="">All Sub-Activities</option>
                {filters.activity && activities.find(a => a.id === filters.activity)?.subactivities?.map((subActivity) => (
                  <option key={subActivity._id} value={subActivity._id}>
                    {subActivity.name} ({subActivity.frequency || 'No frequency'})
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Frequency
              </label>
              <select
                className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 transition-all"
                value={filters.frequency}
                onChange={(e) => {
                  const freq = e.target.value;
                  setFilters({
                    ...filters,
                    frequency: freq,
                    period: freq && !/quarterly|monthly/i.test(freq) ? filters.period : '',
                    quarter: /quarterly/i.test(freq) ? filters.quarter : '',
                    year: /quarterly|monthly/i.test(freq) ? filters.year : '',
                    month: /monthly/i.test(freq) ? filters.month : '',
                  });
                  fetchFrequencyPeriods(freq);
                }}
                disabled={!!filters.subActivity}
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
              {filters.subActivity && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Frequency auto-selected from sub-activity
                </p>
              )}
            </div>

            {/* Period: single dropdown for Yearly etc.; Quarter + Year for Quarterly; Month + Year for Monthly */}
            {(filters.frequency || '').toLowerCase() === 'quarterly' ? (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Quarter</label>
                  <select
                    className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    value={filters.quarter}
                    onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
                  >
                    <option value="">All</option>
                    {QUARTER_OPTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Year</label>
                  <select
                    className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    <option value="">All</option>
                    {filterYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (filters.frequency || '').toLowerCase() === 'monthly' ? (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Month</label>
                  <select
                    className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  >
                    <option value="">All</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Year</label>
                  <select
                    className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    <option value="">All</option>
                    {filterYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Period</label>
                <select
                  className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                  value={filters.period}
                  onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                  disabled={!filters.frequency}
                >
                  <option value="">All Periods</option>
                  {isLoadingPeriods ? (
                    <option value="" disabled>Loading periods...</option>
                  ) : availablePeriods.length > 0 ? (
                    availablePeriods.map((period) => (
                      <option key={period.period} value={period.period}>
                        {period.displayName?.replace(/^Financial Year\s+/i, '') ?? period.period}
                      </option>
                    ))
                  ) : filters.frequency ? (
                    <option value="" disabled>No periods available for this frequency</option>
                  ) : (
                    <option value="" disabled>Select frequency first</option>
                  )}
                </select>
              </div>
            )}

            {/* Status Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Status
              </label>
              <select
                className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="ongoing">Ongoing</option>
                <option value="not applicable">Not Applicable</option>
              </select>
            </div>

            {/* Client Search */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Client
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-white border border-gray-200 pl-3 pr-8 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 font-medium transition-all"
                  placeholder="Search client..."
                  value={clientSearchTerm || (filters.client ? clients.find(c => c.id === filters.client)?.name || "" : "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClientSearchTerm(value);
                    if (!value) {
                      setFilters({ ...filters, client: "" });
                    }
                  }}
                  onFocus={() => {
                    if (filters.client) {
                      setClientSearchTerm("");
                    }
                  }}
                />
                {(clientSearchTerm || filters.client) && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchTerm("");
                      setFilters({ ...filters, client: "" });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                )}
                {clientSearchTerm && !filters.client && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {clients
                      .filter(client => 
                        client.name?.toLowerCase().includes(clientSearchTerm.toLowerCase())
                      )
                      .slice(0, 20)
                      .map(client => (
                        <div
                          key={client.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setFilters({ ...filters, client: client.id });
                            setClientSearchTerm("");
                          }}
                        >
                          {client.name}
                        </div>
                      ))}
                    {clients.filter(client => 
                      client.name?.toLowerCase().includes(clientSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No clients found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1 invisible">
                Submit
              </label>
              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-xs" />
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="ri-search-line text-xs" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Toggle: show Mark NA column | Mark all as NA – spec: buttons 11px bold, amber warning variant */}
        {(registerData.length > 0 || showFilters) && (
          <div className="mb-3 flex flex-wrap justify-end items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMarkNaColumn(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors border shadow-sm ${
                showMarkNaColumn
                  ? 'bg-amber-200 text-amber-800 border-amber-300 hover:bg-amber-300'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title={showMarkNaColumn ? 'Hide Mark NA column' : 'Show Mark NA column in every row'}
            >
              <i className={`text-xs ${showMarkNaColumn ? 'ri-eye-fill' : 'ri-eye-line'}`} /> Mark NA
            </button>
            {showMarkNaColumn && registerData.length > 0 && (
              <button
                type="button"
                disabled={displayedData.length === 0 || displayedData.every(e => (e.status || '').toLowerCase() === 'not applicable')}
                onClick={() => setNaConfirmModal({ type: 'all', count: displayedData.filter(e => (e.status || '').toLowerCase() !== 'not applicable').length })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 shadow-sm"
                title="Mark all visible rows as Not Applicable"
              >
                <i className="ri-checkbox-blank-line text-xs" /> Mark all as NA
              </button>
            )}
            {registerData.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-[#495057]">Sort by:</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                  style={{ width: '140px' }}
                  value={sortOrder}
                  onChange={(e) => setSortOrder((e.target.value || '') as 'asc' | 'desc' | '')}
                >
                  <option value="">None</option>
                  <option value="asc">A→Z (Ascending)</option>
                  <option value="desc">Z→A (Descending)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium text-[#495057]">Show:</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                  style={{ width: '120px' }}
                  value={entriesToShow}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEntriesToShow(value === 'all' ? 'all' : Number(value));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={1000}>1000</option>
                  <option value="all">Show All</option>
                </select>
              </div>
              <span className="text-[11px] font-medium text-[#495057] tracking-tight whitespace-nowrap">
                Showing {displayedData.length} of {periodFilteredData.length} entries
              </span>
            </div>
            )}
          </div>
        )}

        {/* Excel-like Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            <p className="mt-3 text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-20 text-[12px] font-medium">{error}</div>
        ) : (
          <div className="overflow-x-auto min-h-[300px] border border-gray-200 rounded" style={{ maxHeight: '600px' }}>
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  {columns.map((col, colIndex) => (
                    <th
                      key={col.key}
                      className={`text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 ${
                        colIndex === 0 ? 'pl-[10px] pr-1.5' : colIndex === columns.length - 1 ? 'pl-1.5 pr-[10px]' : 'px-1.5'
                      } py-3`}
                      style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registerData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-20">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <i className="ri-inbox-line text-xl text-gray-200" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</p>
                        <p className="text-[11px] text-gray-500">Select filters and click Submit to load data.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedData.map((entry, rowIndex) => (
                    <tr key={entry.id || entry._id || rowIndex} className="hover:bg-gray-50/50 transition-colors group">
                      {columns.map((col, colIndex) => (
                        <td
                          key={col.key}
                          className={`border border-gray-200 p-0 ${colIndex === 0 ? 'pl-[10px] pr-1.5' : colIndex === columns.length - 1 ? 'pl-1.5 pr-[10px]' : 'px-1.5'} py-2.5`}
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, minHeight: '40px' }}
                        >
                          {renderCell(entry, col.key, rowIndex)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirm Mark as Not Applicable modal – spec: overlay 50%, panel rounded-lg, 10px padding, 11px buttons */}
        {naConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => !isMarkingNa && setNaConfirmModal(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-800">Mark as Not Applicable</h3>
              </div>
              <div className="p-[10px] overflow-auto">
                <p className="text-[12px] text-[#495057]">
                  {naConfirmModal.type === 'single'
                    ? 'Mark this timeline as Not Applicable? This will update the timeline status.'
                    : `Mark ${naConfirmModal.count} timeline(s) as Not Applicable? This will update all selected timelines.`}
                </p>
              </div>
              <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
                <button
                  type="button"
                  disabled={isMarkingNa}
                  onClick={() => setNaConfirmModal(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isMarkingNa}
                  onClick={confirmMarkNa}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 shadow-sm transition-colors"
                >
                  {isMarkingNa ? <i className="ri-loader-4-line animate-spin text-xs" /> : null}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceRegister;
