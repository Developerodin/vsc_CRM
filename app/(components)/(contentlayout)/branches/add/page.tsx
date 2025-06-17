"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';

interface Branch {
  id: string;
  name: string;
  branchHead: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  sortOrder: number;
}

const AddBranchPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    branchHead: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    sortOrder: '1',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);

      const branchData = {
        name: formData.name,
        branchHead: formData.branchHead || undefined,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pinCode: formData.pinCode,
        sortOrder: parseInt(formData.sortOrder)
      };

      const response = await fetch(`${Base_url}branches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(branchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create branch');
      }

      toast.success('Branch created successfully');
      router.push('/branches');
    } catch (err) {
      console.error('Error creating branch:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Branch"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Branch</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/branches" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Branches
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New Branch</span>
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

                  {/* Branch Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Branch Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter branch name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Branch Head */}
                  <div className="form-group">
                    <label htmlFor="branchHead" className="form-label">Branch Head</label>
                    <input
                      type="text"
                      id="branchHead"
                      name="branchHead"
                      className="form-control"
                      placeholder="Enter branch head name"
                      value={formData.branchHead}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="form-control"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="form-group">
                    <label htmlFor="address" className="form-label">Address *</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      className="form-control"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* City */}
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">City *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      className="form-control"
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* State */}
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State *</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      className="form-control"
                      placeholder="Enter state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Country */}
                  <div className="form-group">
                    <label htmlFor="country" className="form-label">Country *</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      className="form-control"
                      placeholder="Enter country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Pin Code */}
                  <div className="form-group">
                    <label htmlFor="pinCode" className="form-label">Pin Code *</label>
                    <input
                      type="text"
                      id="pinCode"
                      name="pinCode"
                      className="form-control"
                      placeholder="Enter pin code"
                      value={formData.pinCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Sort Order */}
                  <div className="form-group">
                    <label htmlFor="sortOrder" className="form-label">Sort Order *</label>
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
                  <div className='self-end justify-self-end'>
                    <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                      <button
                        type="submit"
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save Branch'}
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-secondary"
                        onClick={() => router.push('/branches')}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
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

export default AddBranchPage; 