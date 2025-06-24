"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  assignedBranch?: {
    id: string;
    name: string;
  };
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

const EditUserPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    assignedBranch: '',
  });

  useEffect(() => {
    fetchUser();
    fetchRoles();
    fetchBranches();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${Base_url}users/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const userData: User = await response.json();
      setUser(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '', // Don't populate password for security
        role: userData.role?.id || '',
        assignedBranch: userData.assignedBranch?.id || '',
      });
    } catch (err) {
      console.error('Error fetching user:', err);
      toast.error('Failed to fetch user');
      router.push('/users');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${Base_url}roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Failed to fetch roles');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    // Name validation
    if (formData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Password validation (only if provided)
    if (formData.password && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password && (!formData.password.match(/\d/) || !formData.password.match(/[a-zA-Z]/))) {
      toast.error('Password must contain at least one letter and one number');
      return false;
    }

    // Role validation
    if (!formData.role) {
      toast.error('Please select a role');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const userData: any = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        role: formData.role,
        ...(formData.assignedBranch && { assignedBranch: formData.assignedBranch }),
      };

      // Only include password if it was changed
      if (formData.password) {
        userData.password = formData.password;
      }

      const response = await fetch(`${Base_url}users/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const data: User = await response.json();
      toast.success('User updated successfully');
      router.push('/users');
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
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

  if (!user) {
    return (
      <div className="main-content">
        <div className="text-center py-8 text-red-500">
          <i className="ri-error-warning-line text-3xl mb-2"></i>
          <p>User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit User"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit User</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <a href="/users" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Users
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Edit User</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter user name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* User Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter user email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* User Password */}
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        className="form-control pr-10"
                        placeholder="Leave blank to keep current password"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-line text-gray-400`}></i>
                      </button>
                    </div>
                    <small className="text-gray-500">
                      Leave blank to keep current password. If provided, must be at least 8 characters with at least one letter and one number
                    </small>
                  </div>

                  {/* User Role */}
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">Role <span className="text-red-500">*</span></label>
                    <select
                      id="role"
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Branch */}
                  <div className="form-group">
                    <label htmlFor="assignedBranch" className="form-label">Assigned Branch</label>
                    <select
                      id="assignedBranch"
                      name="assignedBranch"
                      className="form-select"
                      value={formData.assignedBranch}
                      onChange={handleInputChange}
                    >
                      <option value="">No branch assigned</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <small className="text-gray-500">
                      Optional: Assign user to a specific branch
                    </small>
                  </div>

                  {/* Email Verification Status */}
                  <div className="form-group">
                    <label className="form-label">Email Verification Status</label>
                    <div className="flex items-center">
                      <span className={`badge ${user.isEmailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {user.isEmailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <small className="text-gray-500">
                      This status is managed by the system
                    </small>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
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
                        'Update User'
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/users')}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
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

export default EditUserPage; 