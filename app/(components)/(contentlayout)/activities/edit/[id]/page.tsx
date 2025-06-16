"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';

interface Activity {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const EditActivityPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Activity>({
    id: "",
    name: "",
    sortOrder: 1,
    createdAt: "",
    updatedAt: ""
  });

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch(`${Base_url}activities/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }

        const data = await response.json();
        setFormData(data);
      } catch (err) {
        toast.error('Failed to fetch activity details');
        router.push('/activities');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${Base_url}activities/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          sortOrder: formData.sortOrder
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update activity');
      }

      toast.success('Activity updated successfully');
      router.push('/activities');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update activity');
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
      <Seo title="Edit Activity" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Activity</h1>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Activity Name */}
                  <div>
                    <label className="form-label">Activity Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter activity name"
                      required
                    />
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="form-label">Sort Order <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter sort order"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={() => router.push('/activities')}
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
                      'Update Activity'
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

export default EditActivityPage; 