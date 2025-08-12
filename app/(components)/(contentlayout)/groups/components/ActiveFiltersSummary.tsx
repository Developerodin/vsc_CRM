import React from 'react';
import { AdvancedFilters } from '../hooks/useGroupFilters';

interface ActiveFiltersSummaryProps {
  advancedFilters: AdvancedFilters;
  onClearAll: () => void;
}

const ActiveFiltersSummary: React.FC<ActiveFiltersSummaryProps> = ({
  advancedFilters,
  onClearAll
}) => {
  const hasActiveFilters = (
    advancedFilters.clientName ||
    advancedFilters.minTasks ||
    advancedFilters.maxTasks ||
    advancedFilters.minClients ||
    advancedFilters.maxClients ||
    Object.values(advancedFilters.taskStatus).some(Boolean)
  );

  if (!hasActiveFilters) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="ri-filter-3-line text-blue-600"></i>
          <span className="text-sm font-medium text-blue-800">Active Filters:</span>
          <div className="flex flex-wrap gap-2">
            {advancedFilters.clientName && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Client: {advancedFilters.clientName}
              </span>
            )}
            {advancedFilters.minTasks && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Min Tasks: {advancedFilters.minTasks}
              </span>
            )}
            {advancedFilters.maxTasks && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Max Tasks: {advancedFilters.maxTasks}
              </span>
            )}
            {advancedFilters.minClients && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Min Clients: {advancedFilters.minClients}
              </span>
            )}
            {advancedFilters.maxClients && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Max Clients: {advancedFilters.maxClients}
              </span>
            )}
            {Object.entries(advancedFilters.taskStatus).map(([status, isActive]) => 
              isActive && (
                <span key={status} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                  {status}
                </span>
              )
            )}
          </div>
        </div>
        <button
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={onClearAll}
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default ActiveFiltersSummary;
