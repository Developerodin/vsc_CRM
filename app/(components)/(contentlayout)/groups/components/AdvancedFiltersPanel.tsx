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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Client Name Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name
          </label>
          <input
            type="text"
            className="form-control w-full"
            placeholder="Search by client name..."
            value={advancedFilters.clientName}
            onChange={(e) => onUpdateFilter('clientName', e.target.value)}
          />
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

      {/* Filter Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
        <button
          className="ti-btn ti-btn-secondary"
          onClick={onClearFilters}
        >
          <i className="ri-refresh-line me-2"></i>
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default AdvancedFiltersPanel;
