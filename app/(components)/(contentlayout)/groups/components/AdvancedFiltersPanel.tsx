import React from 'react';
import { AdvancedFilters, TaskStatus } from '../hooks/useGroupFilters';

interface AdvancedFiltersPanelProps {
  showAdvancedFilters: boolean;
  advancedFilters: AdvancedFilters;
  onUpdateFilter: (key: keyof AdvancedFilters, value: string | TaskStatus) => void;
  onUpdateTaskStatusFilter?: (status: keyof TaskStatus, value: boolean) => void; // Made optional
  onClearFilters: () => void;
}

const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({
  showAdvancedFilters,
  advancedFilters,
  onUpdateFilter,
  onUpdateTaskStatusFilter,
  onClearFilters
}) => {
  if (!showAdvancedFilters) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[#495057] mb-1">Client name</label>
          <input type="text" className="w-full bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400" placeholder="Search by client name..." value={advancedFilters.clientName} onChange={(e) => onUpdateFilter('clientName', e.target.value)} />
        </div>

        {/* Task Count Range - Commented out */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Count Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              className="form-control w-full"
              placeholder="Min"
              value={advancedFilters.minTasks}
              onChange={(e) => onUpdateFilter('minTasks', e.target.value)}
            />
            <input
              type="number"
              className="form-control w-full"
              placeholder="Max"
              value={advancedFilters.maxTasks}
              onChange={(e) => onUpdateFilter('maxTasks', e.target.value)}
            />
          </div>
        </div> */}

        {/* Client Count Range - Commented out */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Count Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              className="form-control w-full"
              placeholder="Min"
              value={advancedFilters.minClients}
              onChange={(e) => onUpdateFilter('minClients', e.target.value)}
            />
            <input
              type="number"
              className="form-control w-full"
              placeholder="Max"
              value={advancedFilters.maxClients}
              onChange={(e) => onUpdateFilter('maxClients', e.target.value)}
            />
          </div>
        </div> */}

        {/* Task Status Filters - Commented out */}
        {/* <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Status
          </label>
          <div className="flex flex-wrap gap-3">
            {Object.entries(advancedFilters.taskStatus).map(([status, isActive]) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox mr-2"
                  checked={isActive}
                  onChange={(e) => onUpdateTaskStatusFilter(status as keyof TaskStatus, e.target.checked)}
                />
                <span className="text-sm text-gray-700 capitalize">{status}</span>
              </label>
            ))}
          </div>
        </div> */}
      </div>

      <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200" onClick={onClearFilters}>
          <i className="ri-refresh-line text-xs" /> Clear filters
        </button>
      </div>
    </div>
  );
};

export default AdvancedFiltersPanel;
