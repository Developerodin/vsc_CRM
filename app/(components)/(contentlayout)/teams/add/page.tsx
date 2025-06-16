"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/shared/data/utilities/api";

const AddTeamPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    branch: "",
    sortOrder: "1",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      // Prepare team member data
      const teamMemberData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        branch: formData.branch,
        sortOrder: parseInt(formData.sortOrder),
      };

      // Create team member
      const response = await axios.post(
        `${API_BASE_URL}/team-members`,
        teamMemberData
      );

      toast.success("Team member created successfully");
      router.push("/teams");
    } catch (err) {
      console.error("Error creating team member:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create team member"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Team Member" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">
                Add New Team Member
              </h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/teams"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Teams
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">
                        Add New Team Member
                      </span>
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
                    <label htmlFor="name" className="form-label">
                      Team Member Name *
                    </label>
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
                    <label htmlFor="phone-number" className="form-label">
                      Team Member Phone Number *
                    </label>
                    <input
                      type="text"
                      id="phone-number"
                      name="phone"
                      className="form-control"
                      placeholder="Enter team member phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Team Member email *
                    </label>
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
                    <label htmlFor="address" className="form-label">
                      Team Member Address *
                    </label>
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
                    <label htmlFor="branch" className="form-label">
                      Team Member Branch *
                    </label>
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
                    <label htmlFor="sortOrder" className="form-label">
                      Sort Order *
                    </label>
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
                      {isLoading ? "Saving..." : "Save Team Member"}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push("/teams")}
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
