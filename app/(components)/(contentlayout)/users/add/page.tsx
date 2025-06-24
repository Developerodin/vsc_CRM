"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
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

const AddUserPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    assignedBranch: '',
  });

  useEffect(() => {
    fetchRoles();
    fetchBranches();
  }, []);

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
        // Set first role as default if available
        if (data.results && data.results.length > 0) {
          setFormData(prev => ({ ...prev, role: data.results[0].id }));
        }
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

    // Password validation
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    if (!formData.password.match(/\d/) || !formData.password.match(/[a-zA-Z]/)) {
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

      const userData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        ...(formData.assignedBranch && { assignedBranch: formData.assignedBranch }),
      };

      const response = await fetch(`${Base_url}users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const data: User = await response.json();
      toast.success('User created successfully');
      router.push('/users');
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add User"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New User</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/users" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Users
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New User</span>
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
                    <label htmlFor="password" className="form-label">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        className="form-control pr-10"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
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
                      Password must be at least 8 characters with at least one letter and one number
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
                          Creating...
                        </>
                      ) : (
                        'Create User'
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

export default AddUserPage; 