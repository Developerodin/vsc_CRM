"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useBranchContext } from "@/shared/contextapi";

interface Branch {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

interface TeamMemberData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  branch: string;
  sortOrder: number;
  skills: string[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { branches } = useBranchContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState<TeamMemberData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    branch: '',
    sortOrder: 1,
    skills: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team member data
        const teamMemberResponse = await axios.get(
          `${Base_url}team-members/${params.id}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const teamMemberData = teamMemberResponse.data;

        // Fetch activities
        const activitiesResponse = await axios.get(`${Base_url}activities`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setActivities(activitiesResponse.data.results || []);

        // Set form data
        setFormData({
          name: teamMemberData.name || '',
          email: teamMemberData.email || '',
          phone: teamMemberData.phone || '',
          address: teamMemberData.address || '',
          city: teamMemberData.city || '',
          state: teamMemberData.state || '',
          country: teamMemberData.country || '',
          pinCode: teamMemberData.pinCode || '',
          branch: teamMemberData.branch.id,
          sortOrder: teamMemberData.sortOrder || 1,
          skills: teamMemberData.skills.map((skill: Activity) => skill.id),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSkillChange = (skillId: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId],
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!/^\+?[\d\s-]{10,}$/.test(formData.phone.replace(/\D/g, ""))) {
      toast.error("Please enter a valid 10-digit phone number");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("Address is required");
      return false;
    }
    if (!formData.city.trim()) {
      toast.error("City is required");
      return false;
    }
    if (!formData.state.trim()) {
      toast.error("State is required");
      return false;
    }
    if (!formData.country.trim()) {
      toast.error("Country is required");
      return false;
    }
    if (!formData.pinCode.trim()) {
      toast.error("Pin code is required");
      return false;
    }
    if (!/^\d{6}$/.test(formData.pinCode)) {
      toast.error("Please enter a valid 6-digit pin code");
      return false;
    }
    if (!formData.branch) {
      toast.error("Please select a branch");
      return false;
    }
    if (formData.skills.length === 0) {
      toast.error("Please select at least one skill");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading("Updating team member...");

    try {
      const requestBody = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pinCode: formData.pinCode,
        branch: formData.branch,
        sortOrder: parseInt(formData.sortOrder.toString()),
        skills: formData.skills,
      };

      await axios.patch(
        `${Base_url}team-members/${params.id}`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      toast.success("Team member updated successfully", { id: loadingToast });
      router.push("/teams");
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update team member",
        { id: loadingToast }
      );
    } finally {
      setIsSubmitting(false);
    }
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
      <Seo title="Edit Team Member" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Team Member</h1>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
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
                  value={formData.pinCode}
                  onChange={handleInputChange}
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
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
                <label htmlFor="sortOrder" className="form-label">Sort Order</label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  className="form-control"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="form-group">
              <label className="form-label">Skills *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`skill-${activity.id}`}
                      className="form-checkbox h-5 w-5 text-primary"
                      checked={formData.skills.includes(activity.id)}
                      onChange={() => handleSkillChange(activity.id)}
                    />
                    <label
                      htmlFor={`skill-${activity.id}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {activity.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push("/teams")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ti-btn ti-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  "Update Team Member"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
