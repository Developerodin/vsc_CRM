"use client";
import React, { useState, useEffect } from 'react';

interface StateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (state: string) => void;
  title?: string;
}

const StateSelectionModal: React.FC<StateSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = "Select State"
}) => {
  const [stateSearch, setStateSearch] = useState("");
  const [statePage, setStatePage] = useState(1);

  // Indian states data
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  // Filtered states based on search
  const filteredStates = indianStates.filter(state =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // Pagination for states
  const statesPerPage = 10;
  const totalStatePages = Math.ceil(filteredStates.length / statesPerPage);
  const startIndex = (statePage - 1) * statesPerPage;
  const endIndex = startIndex + statesPerPage;
  const currentStates = filteredStates.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setStatePage(1);
  }, [stateSearch]);

  const handleStateSelect = (state: string) => {
    onSelect(state);
    onClose();
  };

  const handlePageChange = (newPage: number) => {
    setStatePage(newPage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <div className="flex items-center">
              <i className="ri-search-line text-gray-400 text-xl mr-3"></i>
              <input
                type="text"
                placeholder="Search states..."
                className="form-control w-full py-3 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {currentStates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="ri-map-pin-line text-4xl mb-4 opacity-50"></i>
              <p className="text-lg font-medium">No states found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentStates.map((state) => (
                <button
                  key={state}
                  onClick={() => handleStateSelect(state)}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded border border-gray-200 hover:border-primary transition-colors text-left"
                >
                  {state}
                </button>
              ))}
            </div>
          )}
        </div>

        {totalStatePages > 1 && (
          <div className="p-4 border-t flex justify-center items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(statePage - 1, 1))}
              disabled={statePage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {statePage} of {totalStatePages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(statePage + 1, totalStatePages))}
              disabled={statePage === totalStatePages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="ti-btn ti-btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StateSelectionModal;
