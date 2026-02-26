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
    <div className="bg-sky-50 border border-sky-100 rounded p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-sky-700">Active filters:</span>
          {advancedFilters.clientName && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200">Client: {advancedFilters.clientName}</span>}
          {advancedFilters.minTasks && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200">Min tasks: {advancedFilters.minTasks}</span>}
          {advancedFilters.maxTasks && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200">Max tasks: {advancedFilters.maxTasks}</span>}
          {advancedFilters.minClients && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200">Min clients: {advancedFilters.minClients}</span>}
          {advancedFilters.maxClients && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200">Max clients: {advancedFilters.maxClients}</span>}
          {Object.entries(advancedFilters.taskStatus).map(([status, isActive]) => isActive && <span key={status} className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-800 border border-sky-200 capitalize">{status}</span>)}
        </div>
        <button type="button" className="text-[11px] font-bold text-sky-600 hover:text-sky-800" onClick={onClearAll}><i className="ri-close-line text-xs" /> Clear</button>
      </div>
    </div>
  );
};

export default ActiveFiltersSummary;
