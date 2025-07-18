"use client"
import React from 'react';

interface CompletionRatesData {
  totalPeriods: number;
  completedPeriods: number;
  delayedPeriods: number;
  ongoingPeriods: number;
  pendingPeriods: number;
  completionRate: number;
  onTimeRate: number;
}

interface CompletionRatesCardProps {
  data: CompletionRatesData | null;
  isLoading: boolean;
}

const CompletionRatesCard: React.FC<CompletionRatesCardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="box h-full animate-pulse">
        <div className="box-header">
          <div className="h-6 bg-gray-300 rounded w-32"></div>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-300 rounded w-16 mb-2 mx-auto"></div>
                <div className="h-4 bg-gray-300 rounded w-20 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="box h-full">
        <div className="box-header">
          <div className="box-title">
            <i className="ti ti-target text-primary me-2"></i>
            Completion Rates
          </div>
        </div>
        <div className="box-body">
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            <div className="text-center">
              <i className="ti ti-target text-4xl mb-4"></i>
              <p>No completion rates data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-warning';
    return 'text-danger';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 90) return 'ti ti-trending-up';
    if (rate >= 75) return 'ti ti-minus';
    return 'ti ti-trending-down';
  };

  return (
    <div className="box h-full">
      <div className="box-header">
        <div className="box-title">
          <i className="ti ti-target text-primary me-2"></i>
          Completion Rates
        </div>
      </div>
      <div className="box-body">
        <div className="grid grid-cols-2 gap-6">
          {/* Completion Rate */}
          <div className="text-center p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
            <div className="flex items-center justify-center mb-2">
              <i className={`ti ti-check-circle text-2xl ${getStatusColor(data.completionRate)} me-2`}></i>
              <span className={`text-2xl font-bold ${getStatusColor(data.completionRate)}`}>
                {data.completionRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-defaulttextcolor dark:text-defaulttextcolor/70 mb-1">Completion Rate</p>
            <p className="text-xs text-[#8c9097] dark:text-white/50">
              {data.completedPeriods} of {data.totalPeriods} completed
            </p>
          </div>

          {/* On-Time Rate */}
          <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center mb-2">
              <i className={`ti ti-clock text-2xl ${getStatusColor(data.onTimeRate)} me-2`}></i>
              <span className={`text-2xl font-bold ${getStatusColor(data.onTimeRate)}`}>
                {data.onTimeRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-defaulttextcolor dark:text-defaulttextcolor/70 mb-1">On-Time Rate</p>
            <p className="text-xs text-[#8c9097] dark:text-white/50">
              {data.totalPeriods - data.delayedPeriods} on time
            </p>
          </div>

          {/* Status Breakdown */}
          <div className="col-span-2">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className="ti ti-clock text-warning text-lg"></i>
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70">
                  {data.pendingPeriods}
                </p>
                <p className="text-xs text-[#8c9097] dark:text-white/50">Pending</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className="ti ti-loader text-primary text-lg"></i>
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70">
                  {data.ongoingPeriods}
                </p>
                <p className="text-xs text-[#8c9097] dark:text-white/50">Ongoing</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className="ti ti-check text-success text-lg"></i>
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70">
                  {data.completedPeriods}
                </p>
                <p className="text-xs text-[#8c9097] dark:text-white/50">Completed</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className="ti ti-alert-triangle text-danger text-lg"></i>
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70">
                  {data.delayedPeriods}
                </p>
                <p className="text-xs text-[#8c9097] dark:text-white/50">Delayed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-defaulttextcolor dark:text-defaulttextcolor/70">Overall Progress</span>
            <span className="text-[#8c9097] dark:text-white/50">{data.completionRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-success to-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${data.completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionRatesCard; 