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
          {/* Page Header – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
            <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
                <h1 className="text-[0.875rem] font-bold text-gray-800">Add Business Type</h1>
              </div>
              <Link href="/settings/business-master" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
                <i className="ri-arrow-left-line text-xs" /> Back to Business Master
              </Link>
            </div>
          </div>

          {/* Content Box – timelines-style */}
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="max-w-2xl">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-[11px] font-bold text-[#495057] mb-1">
                      Business Type Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-[12px] rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
                      placeholder="Enter business type name"
                      required
                    />
                    <p className="text-[11px] text-[#495057] mt-1">
                      e.g. Private Limited, Partnership, Sole Proprietorship
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <Link href="/settings/business-master" className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? <i className="ri-loader-4-line animate-spin text-xs" /> : null}
                      {isSubmitting ? "Creating..." : "Create Business Type"}
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
