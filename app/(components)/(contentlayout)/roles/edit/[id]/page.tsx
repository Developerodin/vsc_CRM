"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import RoleFormView from "../../components/RoleFormView";
import type { ApiPermissionsResponse, Branch, Permission } from "../../types";
import { buildRoleRequestBody } from "../../utils/buildRolePayload";
import { flattenPermissions } from "../../utils/permissions";

interface Role {
  id: string;
  name: string;
  description?: string;
  navigationPermissions?: Record<string, unknown>;
  apiPermissions?: Record<string, boolean>;
  branchAccess?: Array<string | { id: string }>;
  allBranchesAccess?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts stored role permissions into flat checkbox keys.
 */
function roleToSelectedPermissionKeys(roleData: Role): string[] {
  const flat: string[] = [];

  if (roleData.navigationPermissions) {
    Object.entries(roleData.navigationPermissions).forEach(([key, value]) => {
      if (typeof value === "boolean" && value) {
        flat.push(key);
      } else if (typeof value === "object" && value !== null) {
        Object.entries(value as Record<string, boolean>).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue) flat.push(`${key}.${nestedKey}`);
        });
      }
    });
  }

  if (roleData.apiPermissions) {
    Object.entries(roleData.apiPermissions).forEach(([key, value]) => {
      if (value) flat.push(key);
    });
  }

  return flat;
}

const EditRolePage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    allBranchesAccess: false,
  });

  useEffect(() => {
    fetchRole();
    fetchPermissions();
    fetchBranches();
  }, [params.id]);

  const fetchRole = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${Base_url}roles/${params.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) throw new Error("Failed to fetch role");

      const roleData: Role = await response.json();
      setRole(roleData);
      setFormData({
        name: roleData.name,
        description: roleData.description || "",
        isActive: roleData.isActive,
        allBranchesAccess: roleData.allBranchesAccess || false,
      });
      setSelectedPermissions(roleToSelectedPermissionKeys(roleData));
      setSelectedBranches(
        roleData.branchAccess?.map((b) => (typeof b === "string" ? b : b.id)) || []
      );
    } catch {
      toast.error("Failed to fetch role");
      router.push("/roles");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${Base_url}roles/available-permissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        const data: ApiPermissionsResponse = await response.json();
        setPermissions(flattenPermissions(data));
      } else {
        toast.error("Failed to fetch permissions");
      }
    } catch {
      toast.error("Failed to fetch permissions");
      setPermissions([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${Base_url}branches`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.results || data);
      }
    } catch {
      toast.error("Failed to fetch branches");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionKey) ? prev.filter((k) => k !== permissionKey) : [...prev, permissionKey]
    );
  };

  const handleSelectPermissionKeys = (keys: string[], select: boolean) => {
    setSelectedPermissions((prev) => {
      if (select) return Array.from(new Set([...prev, ...keys]));
      return prev.filter((k) => !keys.includes(k));
    });
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const handleAllBranchesToggle = () => {
    setFormData((prev) => {
      const next = !prev.allBranchesAccess;
      if (next) setSelectedBranches([]);
      return { ...prev, allBranchesAccess: next };
    });
  };

  const handleSelectAllBranches = () => {
    setSelectedBranches((prev) =>
      prev.length === branches.length ? [] : branches.map((b) => b.id)
    );
  };

  const validateForm = () => {
    if (formData.name.trim().length < 2) {
      toast.error("Role name must be at least 2 characters");
      return false;
    }
    if (formData.name.trim().length > 50) {
      toast.error("Role name must be less than 50 characters");
      return false;
    }
    if (formData.description.length > 500) {
      toast.error("Description must be less than 500 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const roleData = buildRoleRequestBody(formData, permissions, selectedPermissions, selectedBranches);

      const response = await fetch(`${Base_url}roles/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update role");
      }

      toast.success("Role updated successfully");
      router.push("/roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="main-content flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" role="status" aria-label="Loading role" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="main-content text-center py-16">
        <i className="ri-error-warning-line text-3xl text-red-500 mb-2" aria-hidden />
        <p className="text-[11px] font-bold text-gray-700">Role not found</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Seo title="Edit Role" />
      <RoleFormView
        mode="edit"
        formData={formData}
        permissions={permissions}
        selectedPermissions={selectedPermissions}
        branches={branches}
        selectedBranches={selectedBranches}
        isLoading={isLoading}
        roleMeta={{ createdAt: role.createdAt, updatedAt: role.updatedAt }}
        onInputChange={handleInputChange}
        onPermissionToggle={handlePermissionToggle}
        onSelectPermissionKeys={handleSelectPermissionKeys}
        onBranchToggle={handleBranchToggle}
        onAllBranchesToggle={handleAllBranchesToggle}
        onSelectAllBranches={handleSelectAllBranches}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/roles")}
      />
    </>
  );
};

export default EditRolePage;
