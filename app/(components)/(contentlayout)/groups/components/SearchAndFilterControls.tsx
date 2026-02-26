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
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
        <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <input type="text" className="bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 w-full sm:max-w-[160px]" placeholder="Name..." value={filters.name} onChange={(e) => onFilterChange(e.target.value)} />
        <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded ${hasActiveAdvancedFilters ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"}`} onClick={onToggleAdvancedFilters}>
          <i className="ri-filter-3-line text-xs" /> Filters {hasActiveAdvancedFilters ? "(on)" : ""}
        </button>
        <select className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
          <option value="name:asc">Name (A-Z)</option>
          <option value="name:desc">Name (Z-A)</option>
          <option value="createdAt:desc">Newest First</option>
          <option value="createdAt:asc">Oldest First</option>
          <option value="sortOrder:asc">Sort Order (Low-High)</option>
          <option value="sortOrder:desc">Sort Order (High-Low)</option>
        </select>
        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100" onClick={onReset}>
          <i className="ri-refresh-line text-xs" /> Reset
        </button>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
