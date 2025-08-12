import React from 'react';

interface SearchAndFilterControlsProps {
  filters: { name: string };
  sortBy: string;
  itemsPerPage: number;
  showAdvancedFilters: boolean;
  hasActiveAdvancedFilters: boolean;
  onFilterChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onItemsPerPageChange: (value: number) => void;
  onToggleAdvancedFilters: () => void;
  onReset: () => void;
}

const SearchAndFilterControls: React.FC<SearchAndFilterControlsProps> = ({
  filters,
  sortBy,
  itemsPerPage,
  showAdvancedFilters,
  hasActiveAdvancedFilters,
  onFilterChange,
  onSortChange,
  onItemsPerPageChange,
  onToggleAdvancedFilters,
  onReset
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
      {/* Rows per page selector */}
      <div className="flex items-center w-full lg:w-auto">
        <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
        <select
          className="form-select w-auto text-sm"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
        {/* Search bar */}
        <div className="relative flex-grow sm:max-w-xs">
          <input
            type="text"
            className="form-control py-2 w-full"
            placeholder="Search by name..."
            value={filters.name}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>

        {/* Filter button */}
        <button
          className={`ti-btn py-2 w-full sm:w-auto ${
            hasActiveAdvancedFilters ? 'ti-btn-primary' : 'ti-btn-secondary'
          }`}
          onClick={onToggleAdvancedFilters}
        >
          <i className="ri-filter-3-line me-2"></i>
          Filters {hasActiveAdvancedFilters && `(${Object.values(filters).filter(v => v !== '').length + (hasActiveAdvancedFilters ? 1 : 0)})`}
        </button>

        {/* Sort dropdown */}
        <select
          className="form-select py-2 w-full sm:w-auto"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="name:asc">Name (A-Z)</option>
          <option value="name:desc">Name (Z-A)</option>
          <option value="createdAt:desc">Newest First</option>
          <option value="createdAt:asc">Oldest First</option>
          <option value="sortOrder:asc">Sort Order (Low-High)</option>
          <option value="sortOrder:desc">Sort Order (High-Low)</option>
        </select>

        {/* Reset button */}
        <button
          className="ti-btn ti-btn-secondary py-2 w-full sm:w-auto"
          onClick={onReset}
        >
          <i className="ri-refresh-line me-2"></i>
          Reset
        </button>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
