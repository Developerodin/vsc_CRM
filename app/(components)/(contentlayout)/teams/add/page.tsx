"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useSelectedBranchId, useBranchContext } from "@/shared/contextapi";

interface Activity {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

const AddTeamPage = () => {
  const router = useRouter();
  const selectedBranchId = useSelectedBranchId();
  const { branches, selectedBranch } = useBranchContext();
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    branch: selectedBranchId || "",
    sortOrder: 1,
  });

  // Fetch activities on component mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const activitiesResponse = await fetch(`${Base_url}activities`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!activitiesResponse.ok) throw new Error('Failed to fetch activities');
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.results || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        toast.error('Failed to fetch activities');
      }
    };

    fetchActivities();
  }, []);

  // Update form data when selected branch changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branch: selectedBranchId || ''
    }));
  }, [selectedBranchId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSkillChange = (activityId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        return [...prev, activityId];
      }
    });
  };

  const validateForm = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Phone validation (basic format)
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    // Pin code validation (6 digits)
    const pinCodeRegex = /^\d{6}$/;
    if (!pinCodeRegex.test(formData.pinCode)) {
      toast.error('Please enter a valid 6-digit pin code');
      return false;
    }

    // Branch validation
    if (!formData.branch) {
      toast.error('Please select a branch');
      return false;
    }

    // Check if skills are selected
    if (selectedSkills.length === 0) {
      toast.error('Please select at least one skill');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const teamMemberData = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder.toString()),
        skills: selectedSkills
      };

      const response = await fetch(`${Base_url}team-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(teamMemberData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team member');
      }

      toast.success("Team member created successfully");
      router.push("/teams");
    } catch (err) {
      console.error("Error creating team member:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create team member");
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
                    <label htmlFor="name" className="form-label">Name *</label>
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

                  {/* Team Member Email */}
                  <div className="form-group">
                    <label htmlFor="email" className="form-label"> Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter team member email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Phone */}
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label"> Phone *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="form-control"
                      placeholder="Enter team member phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Team Member Address */}
                  <div className="form-group">
                    <label htmlFor="address" className="form-label"> Address *</label>
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
                      placeholder="Enter 6-digit pin code"
                      value={formData.pinCode}
                      onChange={handleInputChange}
                      required
                      pattern="\d{6}"
                      maxLength={6}
                    />
                  </div>

                  {/* Branch */}
                  <div className="form-group">
                    <label htmlFor="branch" className="form-label">Branch *</label>
                    <select
                      id="branch"
                      name="branch"
                      className="form-control"
                      value={formData.branch}
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

                  {/* Skills */}
                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label">Skills *</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`skill-${activity.id}`}
                            checked={selectedSkills.includes(activity.id)}
                            onChange={() => handleSkillChange(activity.id)}
                            className="form-checkbox h-4 w-4 text-primary"
                          />
                          <label htmlFor={`skill-${activity.id}`} className="ml-2 text-sm text-gray-700">
                            {activity.name}
                          </label>
                        </div>
                      ))}
                    </div>
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
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                          Saving...
                        </>
                      ) : (
                        "Save Team Member"
                      )}
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
