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
      <div className="box h-full animate-pulse">
        <div className="box-header">
          <div className="h-6 bg-gray-300 rounded w-40"></div>
        </div>
        <div className="box-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="h-4 bg-gray-300 rounded w-32"></th>
                  <th className="h-4 bg-gray-300 rounded w-24"></th>
                  <th className="h-4 bg-gray-300 rounded w-20"></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="h-4 bg-gray-300 rounded w-24"></td>
                    <td className="h-4 bg-gray-300 rounded w-20"></td>
                    <td className="h-4 bg-gray-300 rounded w-16"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="box h-full">
        <div className="box-header">
          <div className="box-title">
            <i className="ti ti-calendar text-primary me-2"></i>
            Timeline Periods ({frequency})
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8c9097] dark:text-white/50">Frequency:</label>
            <select
              value={frequency}
              onChange={(e) => onFrequencyChange(e.target.value)}
              className="form-select text-sm border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-2 py-1 rounded focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            >
              {frequencies.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="box-body">
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <i className="ti ti-calendar text-4xl mb-4"></i>
              <p>No timeline periods data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box h-full">
      <div className="box-header">
        <div className="box-title">
          <i className="ti ti-calendar text-primary me-2"></i>
          Timeline Periods ({defaultFrequency})
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#8c9097] dark:text-white/50">Frequency:</label>
          <select
            value={defaultFrequency}
            onChange={(e) => {
              onFrequencyChange(e.target.value);
              setCurrentPage(1); // Reset to first page when frequency changes
            }}
            className="form-select text-sm border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-2 py-1 rounded focus:border-primary focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          >
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="box-body">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Activity</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Client</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Period</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((period, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="text-[0.875rem] text-defaulttextcolor dark:text-defaulttextcolor/70">
                    <div className="max-w-[200px] truncate" title={period.activity}>
                      {period.activity}
                    </div>
                  </td>
                  <td className="text-[0.875rem] text-defaulttextcolor dark:text-defaulttextcolor/70">
                    <div className="max-w-[150px] truncate" title={period.client}>
                      {period.client}
                    </div>
                  </td>
                  <td className="text-[0.875rem] font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
                    {period.period}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
            </div>
            <div className="flex items-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {getPaginationButtons().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(page as number)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        page === currentPage
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
              
              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePeriodTable; 