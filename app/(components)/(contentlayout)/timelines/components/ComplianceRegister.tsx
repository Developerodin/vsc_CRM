"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';
import { normalizeQuarterlyPeriods, formatPeriodDisplay, mergeWithExtendedPeriods } from "../utils/quarterPeriods";
import { getClientIdType, type ClientIdType } from "../utils/timelineClientId";

// Compliance task types
export type ComplianceTaskType = 
  | 'ITR' 
  | 'GSTR-1' 
  | 'GSTR-3B' 
  | 'TDS Returns' 
  | 'ROC Compliance' 
  | 'Audit & Other Statutory Tasks';

export type RegisterStatus = 'Pending' | 'In Progress' | 'Completed' | 'Filed' | 'Approved';

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
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Column definitions
  const columns = useMemo(() => [
    { key: 'clientName', label: 'Client Name', width: 200, editable: false, type: 'text' },
    { key: 'subActivity', label: 'Sub-Activity', width: 200, editable: false, type: 'text' },
    { key: 'frequency', label: 'Period', width: 140, editable: false, type: 'text' },
    { key: 'status', label: 'Status', width: 130, editable: false, type: 'text' },
    { key: 'referenceNumber', label: 'Reference Number', width: 180, editable: true, type: 'text' },
    { key: 'completedAt', label: 'Completed At', width: 150, editable: true, type: 'date' },
  ], []);

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
    'Approved'
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
      const queryParams = new URLSearchParams({
        limit: '1000',
        ...(filters.activity && { activity: filters.activity }),
        ...(filters.subActivity && { subactivity: filters.subActivity }),
        ...(filters.frequency && { frequency: filters.frequency }),
        ...(filters.period && { period: filters.period }),
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

  // Save cell value - accepts entry ID or actual index
  const saveCell = async (entryIdOrIndex: string | number, colKey: string, value: string) => {
    // Find entry by ID or index
    const entry = typeof entryIdOrIndex === 'string' 
      ? registerData.find(e => e.timelineId === entryIdOrIndex || e._id === entryIdOrIndex || e.id === entryIdOrIndex)
      : registerData[entryIdOrIndex];
    
    if (!entry || !entry.timelineId) return;

    const normalizedValue = colKey === 'referenceNumber' ? value.trim() : value;
    if ((entry[colKey] || '') === normalizedValue) {
      return; // No change, skip API call
    }

    // If completedAt is being filled, also update status to "completed"
    const updatedEntry = { ...entry, [colKey]: normalizedValue };
    if (colKey === 'completedAt' && normalizedValue) {
      updatedEntry.status = 'completed';
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
        // If date is filled, also set status to "completed"
        if (normalizedValue) {
          payload.status = 'completed';
        }
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
          const entry = registerData[row];
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
          // Move to previous cell
          if (colIndex > 0) {
            setSelectedCell({ row, col: columns[colIndex - 1].key });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: columns[columns.length - 1].key });
          }
        } else {
          // Move to next cell
          if (colIndex < columns.length - 1) {
            setSelectedCell({ row, col: columns[colIndex + 1].key });
          } else if (row < registerData.length - 1) {
            setSelectedCell({ row: row + 1, col: columns[0].key });
          } else {
            // Add new row at the end
            addNewRow();
            setSelectedCell({ row: registerData.length, col: columns[0].key });
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
        if (row < registerData.length - 1) {
          setSelectedCell({ row: row + 1, col });
        } else {
          addNewRow();
          setSelectedCell({ row: registerData.length, col });
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
          const entry = registerData[row];
          if (entry && entry.timelineId) {
            saveCell(entry.timelineId, col, "");
          }
        }
        break;
    }
  }, [selectedCell, editingCell, editValue, registerData, columns]);

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
    return [entry.clientPan, entry.clientCin].filter(Boolean).join(' / ') || '';
  };

  const handleExport = async () => {
    const exportData = registerData.map(entry => ({
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
          if (!referenceNumber && !completedAtIso) continue;

          const payload: { referenceNumber?: string | null; completedAt?: string | null; status?: string } = {};
          payload.referenceNumber = referenceNumber || null;
          if (completedAtIso) {
            payload.completedAt = completedAtIso;
            payload.status = 'completed';
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

  // Calculate displayed data based on entries to show
  const displayedData = useMemo(() => {
    if (entriesToShow === 'all') {
      return registerData;
    }
    return registerData.slice(0, entriesToShow);
  }, [registerData, entriesToShow]);

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
            className="w-full h-full border-2 border-primary outline-none px-2"
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
            className="w-full h-full border-2 border-primary outline-none px-2"
            autoFocus
          />
        );
      }
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
      } else {
        idLabel = 'PAN / CIN';
        idValue = [entry.clientPan, entry.clientCin].filter(Boolean).join(' / ') || '';
      }
      return (
        <div
          className={`h-full px-2 py-1 flex flex-col justify-center ${isSelected ? 'bg-blue-100' : ''}`}
        >
          {name ? (
            <>
              <div className="font-medium text-gray-900">{name}</div>
              {(idLabel && idValue) && (
                <div className="text-xs text-gray-600 mt-0.5">
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
          className={`h-full px-2 py-1 flex flex-col justify-center ${isSelected ? 'bg-blue-100' : ''}`}
        >
          {periodDisplay ? (
            <>
              <div className="font-medium">{periodDisplay}</div>
              {completedAt && <div className="text-xs text-gray-600 mt-0.5">{completedAt}</div>}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    }

    return (
      <div
        className={`h-full px-2 py-1 flex items-center ${isSelected ? 'bg-blue-100' : ''} ${column.editable ? 'cursor-cell' : ''}`}
        onClick={() => column.editable && handleCellClick(entry, rowIndex, colKey)}
      >
        {value || (column.editable ? <span className="text-gray-400">Click to edit</span> : <span className="text-gray-400">-</span>)}
      </div>
    );
  };

  return (
    <div className="box" onKeyDown={handleKeyDown} tabIndex={0} ref={gridRef}>
      <div className="box-body">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Compliance Register</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ti-btn ti-btn-primary"
            >
              <i className={`ri-filter-${showFilters ? 'fill' : 'line'} me-2`}></i>
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
              className="ti-btn ti-btn-secondary"
              title="Upload Excel with Timeline ID, Reference Number, Completed At"
            >
              {isImporting ? <i className="ri-loader-4-line animate-spin me-2"></i> : <i className="ri-upload-2-line me-2"></i>}
              Import
            </button>
            <button
              onClick={handleExport}
              className="ti-btn ti-btn-success"
              title="Export current register (apply filters and Submit first)"
            >
              <i className="ri-download-2-line me-2"></i>
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {/* Activity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity
              </label>
              <select
                className="form-select w-full"
                value={filters.activity}
                onChange={(e) => {
                  setFilters({
                    activity: e.target.value,
                    subActivity: '',
                    frequency: '',
                    period: '',
                    status: filters.status,
                    client: filters.client
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

            {/* Sub-Activity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Activity
              </label>
              <select
                className="form-select w-full"
                value={filters.subActivity}
                onChange={(e) => {
                  const selectedSubActivityId = e.target.value;
                  const selectedActivity = activities.find(a => a.id === filters.activity);
                  const selectedSubActivity = selectedActivity?.subactivities?.find(sa => sa._id === selectedSubActivityId);
                  
                  setFilters({
                    ...filters,
                    subActivity: selectedSubActivityId,
                    frequency: selectedSubActivity?.frequency || ''
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                className="form-select w-full"
                value={filters.frequency}
                onChange={(e) => {
                  setFilters({ ...filters, frequency: e.target.value });
                  fetchFrequencyPeriods(e.target.value);
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
                <p className="text-xs text-gray-500 mt-1">
                  Frequency auto-selected from sub-activity
                </p>
              )}
            </div>

            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period
              </label>
              <select
                className="form-select w-full"
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
                      {period.displayName}
                    </option>
                  ))
                ) : filters.frequency ? (
                  <option value="" disabled>No periods available for this frequency</option>
                ) : (
                  <option value="" disabled>Select frequency first</option>
                )}
              </select>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="form-select w-full"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>

            {/* Client Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="form-input w-full pr-8"
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
              <label className="block text-sm font-medium text-gray-700 mb-1 invisible">
                Submit
              </label>
              <button
                onClick={handleSubmit}
                className="ti-btn ti-btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-2"></i>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="ri-search-line me-2"></i>
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Entries Selection */}
        {registerData.length > 0 && (
          <div className="mb-3 flex justify-end">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                className="form-select"
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
              <span className="text-sm text-gray-600 whitespace-nowrap">
                Showing {displayedData.length} of {registerData.length} entries
              </span>
            </div>
          </div>
        )}

        {/* Excel-like Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <div className="overflow-auto border border-gray-300" style={{ maxHeight: '600px' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="border border-gray-300 px-2 py-2 text-left font-semibold"
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
                    <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                      {isLoading ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        "No entries found. Select filters and click Submit to load data."
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedData.map((entry, rowIndex) => (
                    <tr key={entry.id || entry._id || rowIndex} className="hover:bg-gray-50">
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className="border border-gray-300 p-0"
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, height: '40px' }}
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

      </div>
    </div>
  );
};

export default ComplianceRegister;
