"use client";

import React from "react";
import Link from "next/link";
import type { Branch, Permission, RoleFormData, RoleMeta } from "../types";
import { getApiGroupLabel, groupApiPermissions, groupNavigationPermissions } from "../utils/permissions";

interface RoleFormViewProps {
  mode: "add" | "edit";
  formData: RoleFormData;
  permissions: Permission[];
  selectedPermissions: string[];
  branches: Branch[];
  selectedBranches: string[];
  isLoading: boolean;
  roleMeta?: RoleMeta;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPermissionToggle: (key: string) => void;
  onSelectPermissionKeys: (keys: string[], select: boolean) => void;
  onBranchToggle: (branchId: string) => void;
  onAllBranchesToggle: () => void;
  onSelectAllBranches: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

interface PermissionCheckboxProps {
  permission: Permission;
  checked: boolean;
  onToggle: () => void;
}

/**
 * Single permission row styled as a selectable card.
 */
function PermissionCheckbox({ permission, checked, onToggle }: PermissionCheckboxProps) {
  return (
    <label
      className={`flex items-start gap-2.5 p-2.5 rounded border cursor-pointer transition-colors ${
        checked
          ? "border-purple-300 bg-purple-50"
          : "border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50/40"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0"
        aria-label={permission.title}
      />
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-gray-800 leading-tight">{permission.title}</span>
        {permission.description && (
          <span className="block text-[10px] text-gray-500 mt-0.5 leading-snug">{permission.description}</span>
        )}
      </span>
    </label>
  );
}

interface PermissionSectionProps {
  title: string;
  description?: string;
  permissions: Permission[];
  selectedPermissions: string[];
  onToggle: (key: string) => void;
  onSelectAll: (keys: string[], select: boolean) => void;
}

/**
 * Collapsible-style section with select-all for a permission group.
 */
function PermissionSection({
  title,
  description,
  permissions,
  selectedPermissions,
  onToggle,
  onSelectAll,
}: PermissionSectionProps) {
  const keys = permissions.map((p) => p.key);
  const selectedCount = keys.filter((k) => selectedPermissions.includes(k)).length;
  const allSelected = keys.length > 0 && selectedCount === keys.length;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50/50">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-gray-100">
        <div>
          <h4 className="text-[11px] font-bold text-gray-800">{title}</h4>
          {description && <p className="text-[10px] text-gray-500">{description}</p>}
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">
            {selectedCount} of {keys.length} selected
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectAll(keys, !allSelected)}
          className="shrink-0 text-[10px] font-bold text-purple-600 hover:text-purple-800 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
        {permissions.map((permission) => (
          <PermissionCheckbox
            key={permission.key}
            permission={permission}
            checked={selectedPermissions.includes(permission.key)}
            onToggle={() => onToggle(permission.key)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Shared layout for role add/edit forms — matches roles list styling.
 */
export default function RoleFormView({
  mode,
  formData,
  permissions,
  selectedPermissions,
  branches,
  selectedBranches,
  isLoading,
  roleMeta,
  onInputChange,
  onPermissionToggle,
  onSelectPermissionKeys,
  onBranchToggle,
  onAllBranchesToggle,
  onSelectAllBranches,
  onSubmit,
  onCancel,
}: RoleFormViewProps) {
  const title = mode === "add" ? "Add New Role" : "Edit Role";
  const submitLabel = mode === "add" ? "Create Role" : "Update Role";
  const loadingLabel = mode === "add" ? "Creating..." : "Updating...";

  const { main: navMain, settings: navSettings } = groupNavigationPermissions(permissions);
  const apiGroups = groupApiPermissions(permissions);
  const navSelected = [...navMain, ...navSettings].filter((p) => selectedPermissions.includes(p.key)).length;
  const navTotal = navMain.length + navSettings.length;
  const apiSelected = permissions.filter((p) => p.category === "api" && selectedPermissions.includes(p.key)).length;
  const apiTotal = permissions.filter((p) => p.category === "api").length;

  return (
    <div className="main-content">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <div className="bg-white shadow-sm border border-gray-100 rounded mb-4">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">{title}</h1>
              </div>
              <Link
                href="/roles"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
              >
                <i className="ri-arrow-left-line text-xs" aria-hidden />
                Back to Roles
              </Link>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Basic info */}
            <section className="bg-white shadow-sm border border-gray-100 rounded p-4" aria-labelledby="role-basic-heading">
              <h2 id="role-basic-heading" className="text-[11px] font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="ri-information-line text-purple-600" aria-hidden />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-[11px] font-bold text-gray-700 mb-1">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full text-[11px] border border-gray-200 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                    placeholder="e.g. Branch Manager"
                    value={formData.name}
                    onChange={onInputChange}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="flex flex-col gap-3 md:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={onInputChange}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] font-medium text-gray-700">Active role</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="allBranchesAccess"
                      name="allBranchesAccess"
                      checked={formData.allBranchesAccess}
                      onChange={onAllBranchesToggle}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] font-medium text-gray-700">Access all branches</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-[11px] font-bold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="w-full text-[11px] border border-gray-200 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none resize-y"
                    placeholder="Optional description for this role"
                    value={formData.description}
                    onChange={onInputChange}
                    rows={2}
                    maxLength={500}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{formData.description.length}/500</p>
                </div>
              </div>

              {roleMeta && (
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <span className="text-gray-500 block">Created</span>
                    <span className="font-bold text-gray-800">{new Date(roleMeta.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Updated</span>
                    <span className="font-bold text-gray-800">{new Date(roleMeta.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Permissions</span>
                    <span className="font-bold text-purple-600">{selectedPermissions.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Branches</span>
                    <span className="font-bold text-gray-800">
                      {formData.allBranchesAccess ? "All" : selectedBranches.length}
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* Page access */}
            <section className="bg-white shadow-sm border border-gray-100 rounded p-4" aria-labelledby="role-nav-heading">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 id="role-nav-heading" className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                  <i className="ri-layout-grid-line text-purple-600" aria-hidden />
                  Page Access
                  <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                    {navSelected}/{navTotal}
                  </span>
                </h2>
              </div>

              {permissions.length === 0 ? (
                <p className="text-[11px] text-gray-500 py-6 text-center">No permissions loaded</p>
              ) : (
                <div className="space-y-3">
                  <PermissionSection
                    title="Main pages"
                    description="Dashboard, clients, teams, and other top-level menu items"
                    permissions={navMain}
                    selectedPermissions={selectedPermissions}
                    onToggle={onPermissionToggle}
                    onSelectAll={onSelectPermissionKeys}
                  />
                  <PermissionSection
                    title="Settings"
                    description="Activities, masters, branches, users, and roles under Settings"
                    permissions={navSettings}
                    selectedPermissions={selectedPermissions}
                    onToggle={onPermissionToggle}
                    onSelectAll={onSelectPermissionKeys}
                  />
                </div>
              )}
            </section>

            {/* API permissions */}
            <section className="bg-white shadow-sm border border-gray-100 rounded p-4" aria-labelledby="role-api-heading">
              <h2 id="role-api-heading" className="text-[11px] font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="ri-shield-keyhole-line text-purple-600" aria-hidden />
                API Permissions
                <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                  {apiSelected}/{apiTotal}
                </span>
              </h2>

              {Object.keys(apiGroups).length === 0 ? (
                <p className="text-[11px] text-gray-500 py-4 text-center">No API permissions</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Object.entries(apiGroups).map(([groupKey, groupPerms]) => (
                    <PermissionSection
                      key={groupKey}
                      title={getApiGroupLabel(groupKey)}
                      permissions={groupPerms}
                      selectedPermissions={selectedPermissions}
                      onToggle={onPermissionToggle}
                      onSelectAll={onSelectPermissionKeys}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Branch access */}
            <section className="bg-white shadow-sm border border-gray-100 rounded p-4" aria-labelledby="role-branch-heading">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 id="role-branch-heading" className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                  <i className="ri-building-line text-purple-600" aria-hidden />
                  Branch Access
                </h2>
                {!formData.allBranchesAccess && branches.length > 0 && (
                  <button
                    type="button"
                    onClick={onSelectAllBranches}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 px-2 py-1 rounded bg-purple-50"
                  >
                    {selectedBranches.length === branches.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {formData.allBranchesAccess ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <i className="ri-checkbox-circle-fill text-emerald-600 text-xl" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800">All branches enabled</p>
                    <p className="text-[10px] text-emerald-700">This role can access every branch</p>
                  </div>
                </div>
              ) : branches.length === 0 ? (
                <p className="text-[11px] text-gray-500 py-4 text-center">No branches available</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                  {branches.map((branch) => (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-[11px] font-medium ${
                        selectedBranches.includes(branch.id)
                          ? "border-purple-300 bg-purple-50 text-purple-900"
                          : "border-gray-100 hover:border-purple-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(branch.id)}
                        onChange={() => onBranchToggle(branch.id)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        aria-label={`Branch ${branch.name}`}
                      />
                      <span className="truncate">{branch.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 pb-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                    {loadingLabel}
                  </>
                ) : (
                  <>
                    <i className="ri-save-line text-xs" aria-hidden />
                    {submitLabel}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
