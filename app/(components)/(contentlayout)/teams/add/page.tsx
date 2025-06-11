"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

interface TeamMember {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  branch: string;
  createdDate: string;
  sortOrder: number;
}

const AddTeamPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    address: '',
    branch: '',
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
    
    // try {
    //   setIsLoading(true);

    //   // First, if there's an image, upload it
    //   let imageUrl = null;
    //   if (selectedImage) {
    //     const formData = new FormData();
    //     formData.append('image', selectedImage);

    //     const imageResponse = await fetch(`${API_BASE_URL}/upload`, {
    //       method: 'POST',
    //       body: formData,
    //     });

    //     if (!imageResponse.ok) {
    //       throw new Error('Failed to upload image');
    //     }

    //     const imageData = await imageResponse.json();
    //     imageUrl = imageData.url; // Assuming the API returns the image URL
    //   }

    //   // Prepare client data
    //   const clientData = {
    //     name: formData.name,
    //     parent: formData.parent || undefined,
    //     description: formData.description || undefined,
    //     sortOrder: parseInt(formData.sortOrder),
    //     status: formData.status,
    //     image: imageUrl || undefined
    //   };

    //   // Create client
    //   const response = await fetch(`${API_BASE_URL}/clients`, {
    //     method: 'POST',
    //     headers: {
    //       'Accept': 'application/json',
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(clientData),
    //   });

    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.message || 'Failed to create client');
    //   }

    //   toast.success('Client created successfully');
    //   router.push('/clients');
    // } catch (err) {
        //   console.error('Error creating client:', err);
        //   toast.error(err instanceof Error ? err.message : 'Failed to create client');
        // } finally {
            //   setIsLoading(false);
            // }
    router.push('/dashboards/crm');
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Team Member"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Team Member</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/teams" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Teams
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New Team Member</span>
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

                  {/* Team Member Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Team Member Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter team member name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Phone Number */}
                  <div className="form-group">
                    <label htmlFor="phone-number" className="form-label">Team Member Phone Number *</label>
                    <input
                      type="text"
                      id="phone-number"
                      name="phoneNumber"
                      className="form-control"
                      placeholder="Enter team member phone number"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Team Member email *</label>
                    <input
                      type="text"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter team member email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Address */}
                  <div className="form-group">
                    <label htmlFor="address" className="form-label">Team Member Address *</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      className="form-control"
                      placeholder="Enter team member address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Branch */}
                  <div className="form-group">
                    <label htmlFor="branch" className="form-label">Team Member Branch *</label>
                    <input
                      type="text"
                      id="branch"
                      name="branch"
                      className="form-control"
                      placeholder="Enter team member group"
                      value={formData.branch}
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
                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Team Member'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/teams')}
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

export default AddTeamPage; 