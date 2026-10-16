"use client";

import React from "react";
import { useBranchContext } from "@/shared/contextapi";

interface BranchFilterSelectProps {
  value: string;
  onChange: (branchId: string) => void;
  id: string;
  /** Toolbar row uses a bare select. Filter grids use a labeled field. */
  inline?: boolean;
}

/**
 * Branch dropdown for users who can see every branch.
 * Hidden for branch-scoped roles.
 * @param {BranchFilterSelectProps} props
 * @returns {JSX.Element | null}
 */
const BranchFilterSelect = ({ value, onChange, id, inline = false }: BranchFilterSelectProps) => {
  const { branches, allBranchesAccess, userRole } = useBranchContext();
  const canFilterByBranch =
    allBranchesAccess || (userRole?.name || "").toLowerCase() === "superadmin";

  if (!canFilterByBranch) return null;

  const select = (
    <select
      id={id}
      aria-label="Filter by branch"
      className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[140px] w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All Branches</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );

  if (inline) return select;

  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-[#495057] mb-1">
        Branch
      </label>
      {select}
    </div>
  );
};

export default BranchFilterSelect;
