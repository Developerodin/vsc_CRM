"use client"
import React, { useState } from 'react';

interface TimelinePeriod {
  period: string;
  status: string;
  completedAt: string | null;
  notes: string;
  timelineId: string;
  activity: string;
  client: string;
  assignedMember: string;
  branch: string;
}

interface TimelinePeriodTableProps {
  data: TimelinePeriod[];
  isLoading: boolean;
  frequency: string;
  onFrequencyChange: (frequency: string) => void;
}

const TimelinePeriodTable: React.FC<TimelinePeriodTableProps> = ({ 
  data, 
  isLoading, 
  frequency, 
  onFrequencyChange 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  
  const frequencies = [
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' }
  ];

  // Set default frequency to Monthly if not provided
  const defaultFrequency = frequency || 'Monthly';

  // Calculate pagination
  const totalPages = Math.ceil(data.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate pagination buttons
  const getPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Show limited pages with ellipsis
      if (currentPage <= 3) {
        // Near start
        for (let i = 1; i <= 4; i++) {
          buttons.push(i);
        }
        buttons.push('...');
        buttons.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end
        buttons.push(1);
        buttons.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          buttons.push(i);
        }
      } else {
        // In middle
        buttons.push(1);
        buttons.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          buttons.push(i);
        }
        buttons.push('...');
        buttons.push(totalPages);
      }
    }
    
    return buttons;
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full animate-pulse">
        <div className="p-[10px] flex items-center justify-between border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-40" />
        </div>
        <div className="p-[10px]">
          <div className="h-[200px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
          <h2 className="text-[0.875rem] font-bold text-gray-800">Timeline Periods ({frequency})</h2>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-[#495057]">Frequency:</label>
            <select value={frequency} onChange={(e) => onFrequencyChange(e.target.value)} className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" disabled={isLoading}>
              {frequencies.map((freq) => <option key={freq.value} value={freq.value}>{freq.label}</option>)}
            </select>
          </div>
        </div>
        <div className="p-[10px]">
          <div className="flex items-center justify-center h-[200px] text-[#495057]">
            <div className="text-center">
              <i className="ri-calendar-line text-3xl text-gray-200 mb-3 block" />
              <p className="text-[12px] font-medium">No timeline periods data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
        <h2 className="text-[0.875rem] font-bold text-gray-800">Timeline Periods ({defaultFrequency})</h2>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-[#495057]">Frequency:</label>
          <select
            value={defaultFrequency}
            onChange={(e) => { onFrequencyChange(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
            disabled={isLoading}
          >
            {frequencies.map((freq) => <option key={freq.value} value={freq.value}>{freq.label}</option>)}
          </select>
        </div>
      </div>
      <div className="p-[10px]">
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Activity</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Client</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Period</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((period, index) => (
                <tr key={index} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 text-[12px] text-[#323251] border border-gray-200">
                    <div className="max-w-[200px] truncate" title={period.activity}>{period.activity}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#495057] border border-gray-200">
                    <div className="max-w-[150px] truncate" title={period.client}>{period.client}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200">{period.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-between items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="text-[11px] font-medium text-[#495057]">
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
            </div>
            <nav className="flex flex-wrap items-center gap-1">
              <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
              {getPaginationButtons().map((page, idx) =>
                page === '...' ? (
                  <span key={`e-${idx}`} className="px-2 text-[10px] text-gray-300">...</span>
                ) : (
                  <button key={page} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`} onClick={() => handlePageChange(page as number)}>{page}</button>
                )
              )}
              <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePeriodTable; 