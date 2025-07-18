"use client"
import React from 'react';

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
  const frequencies = [
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' }
  ];

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
                  <th className="h-4 bg-gray-300 rounded w-20"></th>
                  <th className="h-4 bg-gray-300 rounded w-32"></th>
                  <th className="h-4 bg-gray-300 rounded w-24"></th>
                  <th className="h-4 bg-gray-300 rounded w-32"></th>
                  <th className="h-4 bg-gray-300 rounded w-24"></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="h-4 bg-gray-300 rounded w-16"></td>
                    <td className="h-4 bg-gray-300 rounded w-24"></td>
                    <td className="h-4 bg-gray-300 rounded w-20"></td>
                    <td className="h-4 bg-gray-300 rounded w-28"></td>
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-warning/10 text-warning border-warning/20', icon: 'ti ti-clock' },
      ongoing: { color: 'bg-primary/10 text-primary border-primary/20', icon: 'ti ti-loader' },
      completed: { color: 'bg-success/10 text-success border-success/20', icon: 'ti ti-check' },
      delayed: { color: 'bg-danger/10 text-danger border-danger/20', icon: 'ti ti-alert-triangle' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <i className={`${config.icon} me-1`}></i>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Period</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Status</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Activity</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Client</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Assigned</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Completed</th>
                <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((period, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="text-[0.875rem] font-medium text-defaulttextcolor dark:text-defaulttextcolor/70">
                    {period.period}
                  </td>
                  <td>
                    {getStatusBadge(period.status)}
                  </td>
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
                  <td className="text-[0.875rem] text-defaulttextcolor dark:text-defaulttextcolor/70">
                    <div className="max-w-[120px] truncate" title={period.assignedMember}>
                      {period.assignedMember}
                    </div>
                  </td>
                  <td className="text-[0.875rem] text-[#8c9097] dark:text-white/50">
                    {formatDate(period.completedAt)}
                  </td>
                  <td className="text-[0.875rem] text-[#8c9097] dark:text-white/50">
                    <div className="max-w-[200px] truncate" title={period.notes}>
                      {period.notes || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimelinePeriodTable; 