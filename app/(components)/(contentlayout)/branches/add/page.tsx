"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  branchHead: string;
  contact: string;
  address: string;
  createdDate: string;
  sortOrder: number;
}

const AddBranchPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    branchHead: '',
    contact: '',
    address: '',
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

    //   // Prepare branch data
    //   const branchData = {
    //     name: formData.name,
    //     parent: formData.parent || undefined,
    //     description: formData.description || undefined,
    //     sortOrder: parseInt(formData.sortOrder),
    //     status: formData.status,
    //     image: imageUrl || undefined
    //   };

    //   // Create branch
    //   const response = await fetch(`${API_BASE_URL}/branchs`, {
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
    //   router.push('/branchs');
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
                    <label htmlFor="branch-head" className="form-label">Branch Head *</label>
                    <input
                      type="text"
                      id="branch-head"
                      name="branchHead"
                      className="form-control"
                      placeholder="Enter branch head"
                      value={formData.branchHead}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Branch Contact */}
                  <div className="form-group">
                    <label htmlFor="contact" className="form-label">Branch Contact *</label>
                    <input
                      type="text"
                      id="contact"
                      name="contact"
                      className="form-control"
                      placeholder="Enter contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Branch Address */}
                  <div className="form-group">
                    <label htmlFor="address" className="form-label">Branch Address *</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      className="form-control"
                      placeholder="Enter branch address"
                      value={formData.address}
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