"use client";

import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import RoleFormView from "../components/RoleFormView";
import type { ApiPermissionsResponse, Branch, Permission } from "../types";
import { buildRoleRequestBody } from "../utils/buildRolePayload";
import { flattenPermissions } from "../utils/permissions";

const AddRolePage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    allBranchesAccess: false,
  });

  useEffect(() => {
    fetchPermissions();
    fetchBranches();
  }, []);

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

      const response = await fetch(`${Base_url}roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create role");
      }

      toast.success("Role created successfully");
      router.push("/roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <Seo title="Add Role" />
      <RoleFormView
        mode="add"
        formData={formData}
        permissions={permissions}
        selectedPermissions={selectedPermissions}
        branches={branches}
        selectedBranches={selectedBranches}
        isLoading={isLoading}
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

export default AddRolePage;
