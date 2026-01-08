"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Base_url } from '@/app/api/config/BaseUrl';

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
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [filters, setFilters] = useState({
    activity: "",
    subActivity: "",
    frequency: "",
    period: ""
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
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Column definitions
  const columns = useMemo(() => [
    { key: 'clientName', label: 'Client Name', width: 200, editable: false, type: 'text' },
    { key: 'subActivity', label: 'Sub-Activity', width: 200, editable: false, type: 'text' },
    { key: 'frequency', label: 'Frequency', width: 150, editable: false, type: 'text' },
    { key: 'period', label: 'Period', width: 150, editable: false, type: 'text' },
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
      setAvailablePeriods(data.periods || []);
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
        ...(filters.period && { period: filters.period })
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

      // Transform timeline data to ComplianceRegisterEntry format
      const transformedData: ComplianceRegisterEntry[] = timelines.map((timeline: any) => ({
        _id: timeline._id,
        id: timeline.id,
        clientId: timeline.client?._id || timeline.client?.id || '',
        clientName: timeline.client?.name || '',
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

  // Save cell value
  const saveCell = async (rowIndex: number, colKey: string, value: string) => {
    const entry = registerData[rowIndex];
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

    const updatedData = [...registerData];
    updatedData[rowIndex] = updatedEntry;
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
      // Revert on error
      setRegisterData(registerData);
    } finally {
      setIsSaving(false);
    }
  };


  // Handle cell click
  const handleCellClick = (rowIndex: number, colKey: string) => {
    const entry = registerData[rowIndex];
    if (!entry) return;

    const value = entry[colKey] || "";
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(String(value));
    setSelectedCell({ row: rowIndex, col: colKey });
  };

  // Handle cell edit
  const handleCellEdit = (value: string) => {
    setEditValue(value);
  };

  // Handle cell save
  const handleCellSave = () => {
    if (editingCell) {
      saveCell(editingCell.row, editingCell.col, editValue);
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
          handleCellClick(row, col);
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
          if (entry) {
            saveCell(row, col, "");
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

  // Export to Excel
  const handleExport = async () => {
    const exportData = registerData.map(entry => ({
      'Client Name': entry.clientName || '',
      'Sub-Activity': entry.subActivity || '',
      'Frequency': entry.frequency || '',
      'Period': entry.period || '',
      'Status': entry.status || '',
      'Reference Number': entry.referenceNumber || '',
      'Completed At': entry.completedAt || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Calculate column widths
    const columnWidths = [
      { wch: 30 }, // Client Name
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

    return (
      <div
        className={`h-full px-2 py-1 flex items-center ${isSelected ? 'bg-blue-100' : ''} ${column.editable ? 'cursor-cell' : ''}`}
        onClick={() => column.editable && handleCellClick(rowIndex, colKey)}
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
              onClick={handleExport}
              className="ti-btn ti-btn-success"
            >
              <i className="ri-download-2-line me-2"></i>
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                    period: ''
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
                  registerData.map((entry, rowIndex) => (
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
