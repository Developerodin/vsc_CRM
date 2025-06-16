"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
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

const EditBranchPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Branch>({
    id: "",
    name: "",
    branchHead: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    sortOrder: 1
  });

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await fetch(`${Base_url}branches/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch branch');
        }

        const data = await response.json();
        setFormData(data);
      } catch (err) {
        toast.error('Failed to fetch branch details');
        router.push('/branches');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranch();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${Base_url}branches/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          branchHead: formData.branchHead,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pinCode: formData.pinCode,
          sortOrder: formData.sortOrder
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update branch');
      }

      toast.success('Branch updated successfully');
      router.push('/branches');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Branch" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Branch</h1>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Branch Name */}
                  <div>
                    <label className="form-label">Branch Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter branch name"
                      required
                    />
                  </div>

                  {/* Branch Head */}
                  <div>
                    <label className="form-label">Branch Head <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="branchHead"
                      value={formData.branchHead}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter branch head name"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="form-label">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="form-label">Phone <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="form-label">Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter address"
                      required
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="form-label">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter city"
                      required
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="form-label">State <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter state"
                      required
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="form-label">Country <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter country"
                      required
                    />
                  </div>

                  {/* Pin Code */}
                  <div>
                    <label className="form-label">Pin Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter pin code"
                      required
                    />
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="form-label">Sort Order</label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter sort order"
                      min="1"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={() => router.push('/branches')}
                  >
                    Cancel
                  </button>
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
                      'Update Branch'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBranchPage; 