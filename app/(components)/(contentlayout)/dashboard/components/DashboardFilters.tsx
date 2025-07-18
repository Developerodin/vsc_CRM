"use client"
import React from 'react';

interface DashboardFiltersProps {
  startDate: string;
  endDate: string;
  selectedFrequency: string;
  selectedStatus: string;
  selectedBranch: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onStatusChange: (status: string) => void;
  onBranchChange: (branchId: string) => void;
  branches: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  startDate,
  endDate,
  selectedFrequency,
  selectedStatus,
  selectedBranch,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
  onStatusChange,
  onBranchChange,
  branches,
  isLoading = false
}) => {
  const frequencies = [
    { value: '', label: 'All Frequencies' },
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' }
  ];

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'delayed', label: 'Delayed' }
  ];

  return (
    <div className="box mb-6">
      <div className="box-header">
        <div className="box-title">
          <i className="ti ti-filter text-primary me-2"></i>
          Dashboard Filters
        </div>
      </div>
      <div className="box-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="form-input w-full rounded-md border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="form-input w-full rounded-md border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
          </div>

          {/* Frequency Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
              Frequency
            </label>
            <select
              value={selectedFrequency}
              onChange={(e) => onFrequencyChange(e.target.value)}
              className="form-select w-full rounded-md border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            >
              {frequencies.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="form-select w-full rounded-md border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="form-select w-full rounded-md border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters; 