"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import { useRouter } from "next/navigation";

const AddBusinessMasterPage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Business type name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${Base_url}business-master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to create business type');
      }

      toast.success('Business type created successfully');
      router.push('/settings/business-master');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create business type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Business Type" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Business Type</h1>
              <div className="box-tools flex items-center space-x-2">
                <Link href="/settings/business-master" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i>
                  Back to Business Master
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="max-w-2xl">
                <div className="grid grid-cols-1 gap-6">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-control w-full"
                      placeholder="Enter business type name"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter a descriptive name for the business type (e.g., Private Limited, Partnership, Sole Proprietorship)
                    </p>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Link
                      href="/settings/business-master"
                      className="ti-btn ti-btn-secondary"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="ti-btn ti-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          Create Business Type
                        </>
                      )}
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

export default AddBusinessMasterPage;
