"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';
import { useSelectedBranchId, useBranchContext } from "@/shared/contextapi";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;
  fNo: string;
  pan: string;
  dob: string;
  branchId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const AddClientPage = () => {
  const selectedBranchId = useSelectedBranchId();
  const { branches, selectedBranch } = useBranchContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    email2: '',
    address: '',
    district: '',
    state: '',
    country: '',
    fNo: '',
    pan: '',
    dob: '',
    branchId: selectedBranchId || '',
    sortOrder: 1,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 1 : value
    }));
  };

  const validateForm = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Email2 validation (optional but if provided, should be valid)
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      toast.error('Please enter a valid secondary email address');
      return false;
    }

    // Phone validation (basic format)
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    // PAN validation (basic format - 10 characters)
    if (formData.pan && formData.pan.length !== 10) {
      toast.error('PAN should be 10 characters long');
      return false;
    }

    // Branch validation
    if (!formData.branchId) {
      toast.error('Please select a branch');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const response = await fetch(`${Base_url}clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create client');
      }

      const data: Client = await response.json();
      toast.success('Client created successfully');
      router.push('/clients');
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branchId: selectedBranchId || ''
    }));
  }, [selectedBranchId]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Client"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Client</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/clients" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Clients
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New Client</span>
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
                  {/* Client Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter client name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Client Phone */}
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="form-control"
                      placeholder="Enter client phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Client Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter client email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Client Email 2 */}
                  <div className="form-group">
                    <label htmlFor="email2" className="form-label">Secondary Email</label>
                    <input
                      type="email"
                      id="email2"
                      name="email2"
                      className="form-control"
                      placeholder="Enter secondary email (optional)"
                      value={formData.email2}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Client Address */}
                  <div className="form-group">
                    <label htmlFor="address" className="form-label">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      className="form-control"
                      placeholder="Enter client address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Client District */}
                  <div className="form-group">
                    <label htmlFor="district" className="form-label">District</label>
                    <input
                      type="text"
                      id="district"
                      name="district"
                      className="form-control"
                      placeholder="Enter district"
                      value={formData.district}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Client State */}
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      className="form-control"
                      placeholder="Enter state"
                      value={formData.state}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Client Country */}
                  <div className="form-group">
                    <label htmlFor="country" className="form-label">Country</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      className="form-control"
                      placeholder="Enter country"
                      value={formData.country}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* F No */}
                  <div className="form-group">
                    <label htmlFor="fNo" className="form-label">F No</label>
                    <input
                      type="text"
                      id="fNo"
                      name="fNo"
                      className="form-control"
                      placeholder="Enter F No (optional)"
                      value={formData.fNo}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* PAN */}
                  <div className="form-group">
                    <label htmlFor="pan" className="form-label">PAN</label>
                    <input
                      type="text"
                      id="pan"
                      name="pan"
                      className="form-control"
                      placeholder="Enter PAN (10 characters)"
                      value={formData.pan}
                      onChange={handleInputChange}
                      maxLength={10}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="form-group">
                    <label htmlFor="dob" className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      className="form-control"
                      value={formData.dob}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Branch */}
                  <div className="form-group">
                    <label htmlFor="branchId" className="form-label">Branch <span className="text-red-500">*</span></label>
                    <select
                      id="branchId"
                      name="branchId"
                      className="form-control"
                      value={formData.branchId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="form-group">
                    <label htmlFor="sortOrder" className="form-label">Sort Order <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      id="sortOrder"
                      name="sortOrder"
                      className="form-control"
                      placeholder="Enter sort order"
                      value={formData.sortOrder}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
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
                          Saving...
                        </>
                      ) : (
                        'Save Client'
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/clients')}
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

export default AddClientPage; 