"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  navigationPermissions?: Record<string, any>;
  apiPermissions?: Record<string, any>;
  branchAccess?: Array<string | { id: string; name: string; [key: string]: any }>;
  allBranchesAccess?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

interface Permission {
  key: string;
  title: string;
  description?: string;
  category: string;
  path?: string;
  group?: string;
  children?: Record<string, Permission>;
}

interface ApiPermissionsResponse {
  navigationPermissions: Record<string, Permission>;
  apiPermissions: Record<string, Permission>;
}

interface Branch {
  id: string;
  name: string;
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
    name: '',
    description: '',
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch role');
      }

      const roleData: Role = await response.json();
      setRole(roleData);
      setFormData({
        name: roleData.name,
        description: roleData.description || '',
        isActive: roleData.isActive,
        allBranchesAccess: roleData.allBranchesAccess || false,
      });

      // Convert structured permissions back to flat permission keys
      const flatPermissions: string[] = [];
      
      // Process navigation permissions
      if (roleData.navigationPermissions) {
        Object.entries(roleData.navigationPermissions).forEach(([key, value]) => {
          if (typeof value === 'boolean' && value === true) {
            flatPermissions.push(key);
          } else if (typeof value === 'object' && value !== null) {
            // Handle nested permissions like settings
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (nestedValue === true) {
                flatPermissions.push(`${key}.${nestedKey}`);
              }
            });
          }
        });
      }

      // Process API permissions
      if (roleData.apiPermissions) {
        Object.entries(roleData.apiPermissions).forEach(([key, value]) => {
          if (value === true) {
            flatPermissions.push(key);
          }
        });
      }

      setSelectedPermissions(flatPermissions);
      
      // Extract branch IDs from branch objects
      const branchIds = roleData.branchAccess?.map(branch => 
        typeof branch === 'string' ? branch : (branch as any).id
      ) || [];
      setSelectedBranches(branchIds);
    } catch (err) {
      console.error('Error fetching role:', err);
      toast.error('Failed to fetch role');
      router.push('/roles');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${Base_url}roles/available-permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data: ApiPermissionsResponse = await response.json();
        
        // Convert the nested structure to a flat array
        const flatPermissions: Permission[] = [];
        
        // Process navigation permissions
        Object.values(data.navigationPermissions).forEach(permission => {
          flatPermissions.push(permission);
          
          // Add children if they exist
          if (permission.children) {
            Object.values(permission.children).forEach(child => {
              flatPermissions.push(child);
            });
          }
        });
        
        // Process API permissions
        Object.values(data.apiPermissions).forEach(permission => {
          flatPermissions.push(permission);
        });
        
        setPermissions(flatPermissions);
      } else {
        console.error('Failed to fetch permissions:', response.status);
        toast.error('Failed to fetch permissions');
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      toast.error('Failed to fetch permissions');
      setPermissions([]); // Ensure it's always an array
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${Base_url}branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      toast.error('Failed to fetch branches');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionKey)
        ? prev.filter(key => key !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSelectAllPermissions = (category: string) => {
    const categoryPermissions = permissions
      .filter(p => p.category === category)
      .map(p => p.key);
    
    const allSelected = categoryPermissions.every(key => selectedPermissions.includes(key));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(key => !categoryPermissions.includes(key)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...categoryPermissions])));
    }
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleAllBranchesToggle = () => {
    setFormData(prev => ({
      ...prev,
      allBranchesAccess: !prev.allBranchesAccess
    }));
    // Clear selected branches when all branches access is enabled
    if (!formData.allBranchesAccess) {
      setSelectedBranches([]);
    }
  };

  const handleSelectAllBranches = () => {
    if (selectedBranches.length === branches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map(branch => branch.id));
    }
  };

  const validateForm = () => {
    // Name validation
    if (formData.name.trim().length < 2) {
      toast.error('Role name must be at least 2 characters long');
      return false;
    }

    if (formData.name.trim().length > 50) {
      toast.error('Role name must be less than 50 characters');
      return false;
    }

    // Description validation
    if (formData.description && formData.description.length > 500) {
      toast.error('Description must be less than 500 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Convert selected permissions to the role schema structure
      const navigationPermissions: Record<string, any> = {
        dashboard: false,
        clients: false,
        groups: false,
        teams: false,
        timelines: false,
        analytics: false,
        settings: {
          activities: false,
          branches: false,
          users: false,
          roles: false,
        },
      };

      const apiPermissions: Record<string, any> = {
        getUsers: false,
        manageUsers: false,
        getTeamMembers: false,
        manageTeamMembers: false,
        getActivities: false,
        manageActivities: false,
        getBranches: false,
        manageBranches: false,
        getClients: false,
        manageClients: false,
        getGroups: false,
        manageGroups: false,
        getRoles: false,
        manageRoles: false,
      };

      // Set selected permissions to true
      selectedPermissions.forEach(permissionKey => {
        if (permissionKey.includes('.')) {
          // Handle nested permissions like 'settings.activities'
          const [parent, child] = permissionKey.split('.');
          if (navigationPermissions[parent] && typeof navigationPermissions[parent] === 'object') {
            navigationPermissions[parent][child] = true;
          }
        } else if (navigationPermissions.hasOwnProperty(permissionKey)) {
          // Only set top-level permissions, not nested ones
          if (typeof navigationPermissions[permissionKey] === 'boolean') {
            navigationPermissions[permissionKey] = true;
          }
        } else if (apiPermissions.hasOwnProperty(permissionKey)) {
          apiPermissions[permissionKey] = true;
        }
      });

      const roleData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        navigationPermissions,
        apiPermissions,
        branchAccess: formData.allBranchesAccess ? [] : selectedBranches,
        allBranchesAccess: formData.allBranchesAccess,
      };

      // Debug: Log the structure to verify it's correct
      console.log('Role data being sent:', JSON.stringify(roleData, null, 2));

      const response = await fetch(`${Base_url}roles/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(roleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role');
      }

      const data: Role = await response.json();
      toast.success('Role updated successfully');
      router.push('/roles');
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="main-content">
        <div className="text-center py-8 text-red-500">
          <i className="ri-error-warning-line text-3xl mb-2"></i>
          <p>Role not found</p>
        </div>
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = (permissions || []).reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Role"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Role</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <a href="/roles" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Roles
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Edit Role</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    
                    {/* Role Name */}
                    <div className="form-group mb-4">
                      <label htmlFor="name" className="form-label">Role Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder="Enter role name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        maxLength={50}
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group mb-4">
                      <label htmlFor="description" className="form-label">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        className="form-control"
                        placeholder="Enter role description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        maxLength={500}
                      />
                      <small className="text-gray-500">
                        {formData.description.length}/500 characters
                      </small>
                    </div>

                    {/* Active Status */}
                    <div className="form-group mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          className="form-checkbox mr-2"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                        />
                        <label htmlFor="isActive" className="form-label mb-0">
                          Active Role
                        </label>
                      </div>
                      <small className="text-gray-500">
                        Inactive roles cannot be assigned to users
                      </small>
                    </div>

                    {/* All Branches Access */}
                    <div className="form-group mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allBranchesAccess"
                          name="allBranchesAccess"
                          className="form-checkbox mr-2"
                          checked={formData.allBranchesAccess}
                          onChange={handleAllBranchesToggle}
                        />
                        <label htmlFor="allBranchesAccess" className="form-label mb-0">
                          Access All Branches
                        </label>
                      </div>
                      <small className="text-gray-500">
                        When enabled, this role can access all branches regardless of individual branch selection
                      </small>
                    </div>

                    {/* Role Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Role Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{new Date(role.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Updated:</span>
                          <span>{new Date(role.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Permissions:</span>
                          <span className="font-medium">{selectedPermissions.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Branch Access:</span>
                          <span className="font-medium">
                            {formData.allBranchesAccess ? 'All Branches' : `${selectedBranches.length} branches`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          'Update Role'
                        )}
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-secondary"
                        onClick={() => router.push('/roles')}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Permissions</h3>
                    
                    {permissions && permissions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <i className="ri-shield-line text-3xl mb-2"></i>
                        <p>No permissions available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                          <div key={category} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900 capitalize">
                                {category.replace(/_/g, ' ')}
                              </h4>
                              <button
                                type="button"
                                className="text-sm text-primary hover:text-primary-dark"
                                onClick={() => handleSelectAllPermissions(category)}
                              >
                                {categoryPermissions.every(p => selectedPermissions.includes(p.key))
                                  ? 'Deselect All'
                                  : 'Select All'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {categoryPermissions.map((permission) => (
                                <div key={permission.key} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`permission-${permission.key}`}
                                    className="form-checkbox mr-2"
                                    checked={selectedPermissions.includes(permission.key)}
                                    onChange={() => handlePermissionToggle(permission.key)}
                                  />
                                  <label
                                    htmlFor={`permission-${permission.key}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    <div className="font-medium">{permission.title}</div>
                                    {permission.description && (
                                      <div className="text-gray-500 text-xs">
                                        {permission.description}
                                      </div>
                                    )}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedPermissions.length > 0 && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                        <div className="text-sm font-medium text-primary mb-2">
                          Selected Permissions ({selectedPermissions.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedPermissions.slice(0, 5).map(permissionKey => {
                            const permission = permissions?.find(p => p.key === permissionKey);
                            return permission ? (
                              <span key={permissionKey} className="badge bg-primary/20 text-primary text-xs">
                                {permission.title}
                              </span>
                            ) : null;
                          })}
                          {selectedPermissions.length > 5 && (
                            <span className="badge bg-gray-100 text-gray-600 text-xs">
                              +{selectedPermissions.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch Access */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Branch Access</h3>
                    
                    {!formData.allBranchesAccess && (
                      <>
                        {branches && branches.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <i className="ri-building-line text-3xl mb-2"></i>
                            <p>No branches available</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Select Branches</h4>
                              <button
                                type="button"
                                className="text-sm text-primary hover:text-primary-dark"
                                onClick={handleSelectAllBranches}
                              >
                                {selectedBranches.length === branches.length ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {branches.map((branch) => (
                                <div key={branch.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`branch-${branch.id}`}
                                    className="form-checkbox mr-2"
                                    checked={selectedBranches.includes(branch.id)}
                                    onChange={() => handleBranchToggle(branch.id)}
                                  />
                                  <label
                                    htmlFor={`branch-${branch.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    <div className="font-medium">{branch.name}</div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedBranches.length > 0 && (
                          <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                            <div className="text-sm font-medium text-secondary mb-2">
                              Selected Branches ({selectedBranches.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedBranches.slice(0, 3).map(branchId => {
                                const branch = branches.find(b => b.id === branchId);
                                return branch ? (
                                  <span key={branchId} className="badge bg-secondary/20 text-secondary text-xs">
                                    {branch.name}
                                  </span>
                                ) : null;
                              })}
                              {selectedBranches.length > 3 && (
                                <span className="badge bg-gray-100 text-gray-600 text-xs">
                                  +{selectedBranches.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {formData.allBranchesAccess && (
                      <div className="text-center py-8 text-green-600">
                        <i className="ri-check-line text-3xl mb-2"></i>
                        <p className="font-medium">Access to All Branches</p>
                        <p className="text-sm text-gray-500">This role can access all current and future branches</p>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRolePage; 