"use client";
import { useEffect, useState, useCallback } from "react";
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

interface TeamMemberForSelection {
  id: string;
  name: string;
  email: string;
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
  accessibleTeamMembers: string[];
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
    accessibleTeamMembers: [],
  });

  // Team member selection modal state
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState("");
  const [teamMemberCurrentPage, setTeamMemberCurrentPage] = useState(1);
  const [teamMemberTotalPages, setTeamMemberTotalPages] = useState(1);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberForSelection[]>([]);
  const [selectedAccessibleTeamMembers, setSelectedAccessibleTeamMembers] = useState<TeamMemberForSelection[]>([]);

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

        // Handle accessibleTeamMembers - could be populated objects or just IDs
        let accessibleTeamMemberIds: string[] = [];
        let accessibleTeamMemberObjects: TeamMemberForSelection[] = [];
        
        if (teamMemberData.accessibleTeamMembers && teamMemberData.accessibleTeamMembers.length > 0) {
          accessibleTeamMemberIds = teamMemberData.accessibleTeamMembers.map((tm: any) => {
            // If it's a populated object, use the id property
            if (typeof tm === 'object' && tm !== null && tm.id) {
              accessibleTeamMemberObjects.push({
                id: tm.id,
                name: tm.name || '',
                email: tm.email || ''
              });
              return tm.id;
            }
            // If it's just an ID string
            if (typeof tm === 'string') {
              accessibleTeamMemberObjects.push({
                id: tm,
                name: '',
                email: ''
              });
              return tm;
            }
            return '';
          }).filter((id: string) => id !== '');
        }

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
          accessibleTeamMembers: accessibleTeamMemberIds,
        });

        // Set selected accessible team members
        setSelectedAccessibleTeamMembers(accessibleTeamMemberObjects);
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

  // Team member selection handlers
  const fetchTeamMembersModal = async (page: number = 1, searchQueryParam?: string) => {
    try {
      setIsLoadingTeamMembers(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy: "name:asc",
        ...((searchQueryParam || teamMemberSearchQuery) && { search: searchQueryParam || teamMemberSearchQuery })
      });

      const response = await fetch(`${Base_url}team-members?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      const fetchedMembers = data.results || [];
      setAllTeamMembers(fetchedMembers);
      
      // Update selected accessible team members with full details if we only had IDs
      setSelectedAccessibleTeamMembers(prev => {
        return prev.map(selected => {
          const fullDetails = fetchedMembers.find((tm: TeamMemberForSelection) => tm.id === selected.id);
          if (fullDetails) {
            return {
              id: fullDetails.id,
              name: fullDetails.name,
              email: fullDetails.email
            };
          }
          return selected;
        });
      });
      
      const totalResults = data.totalResults || 0;
      const limit = 10;
      setTeamMemberTotalPages(Math.max(1, Math.ceil(totalResults / limit)));
      setTeamMemberCurrentPage(page);
    } catch (err) {
      console.error('Error fetching team members:', err);
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const handleTeamMemberSelect = (teamMember: TeamMemberForSelection) => {
    setSelectedAccessibleTeamMembers(prev => {
      const isSelected = prev.some(tm => tm.id === teamMember.id);
      if (isSelected) {
        return prev.filter(tm => tm.id !== teamMember.id);
      } else {
        return [...prev, teamMember];
      }
    });
  };

  const handleTeamMemberModalSubmit = () => {
    setFormData(prev => ({
      ...prev,
      accessibleTeamMembers: selectedAccessibleTeamMembers.map(tm => tm.id)
    }));
    setShowTeamMemberModal(false);
  };

  const handleTeamMemberSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setTeamMemberSearchQuery(query);
    if (showTeamMemberModal) {
      debouncedTeamMemberSearch(query);
    }
  };

  const handleTeamMemberSearchClick = () => {
    if (showTeamMemberModal) {
      setTeamMemberCurrentPage(1);
      fetchTeamMembersModal(1, teamMemberSearchQuery);
    }
  };

  const handleTeamMemberPageChange = (newPage: number) => {
    setTeamMemberCurrentPage(newPage);
    fetchTeamMembersModal(newPage, teamMemberSearchQuery);
  };

  // Debounced search function for team members
  const debouncedTeamMemberSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchQuery: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setTeamMemberCurrentPage(1);
          fetchTeamMembersModal(1, searchQuery);
        }, 500);
      };
    })(),
    []
  );

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
        accessibleTeamMembers: formData.accessibleTeamMembers,
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

            {/* Accessible Team Members */}
            <div className="form-group">
              <label className="form-label">Accessible Team Members</label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={() => {
                    setShowTeamMemberModal(true);
                    setTeamMemberSearchQuery("");
                    setTeamMemberCurrentPage(1);
                    fetchTeamMembersModal(1);
                  }}
                >
                  Select Team Members ({selectedAccessibleTeamMembers.length} selected)
                </button>
                {selectedAccessibleTeamMembers.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedAccessibleTeamMembers.length} team member{selectedAccessibleTeamMembers.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              {selectedAccessibleTeamMembers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAccessibleTeamMembers.map(teamMember => (
                    <span key={teamMember.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      {teamMember.name || teamMember.email}
                      <button
                        type="button"
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setSelectedAccessibleTeamMembers(prev => prev.filter(tm => tm.id !== teamMember.id));
                          setFormData(prev => ({
                            ...prev,
                            accessibleTeamMembers: prev.accessibleTeamMembers.filter(id => id !== teamMember.id)
                          }));
                        }}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
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

      {/* Team Member Selection Modal */}
      {showTeamMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Accessible Team Members</h2>
              <button
                onClick={() => setShowTeamMemberModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <div className="flex items-center">
                    <i className="ri-search-line text-gray-400 text-xl mr-3"></i>
                    <input
                      type="text"
                      placeholder="Search team members by name or email..."
                      className="form-control py-4 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                      value={teamMemberSearchQuery}
                      onChange={handleTeamMemberSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTeamMemberSearchClick();
                        }
                      }}
                    />
                  </div>
                  <button 
                    className="absolute end-0 top-0 px-6 h-full bg-primary text-white hover:bg-primary-dark rounded-r-md"
                    onClick={handleTeamMemberSearchClick}
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
                {teamMemberSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setTeamMemberSearchQuery("");
                      fetchTeamMembersModal(1, "");
                    }}
                    className="ti-btn ti-btn-secondary"
                  >
                    <i className="ri-close-line me-2"></i>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingTeamMembers ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allTeamMembers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <i className="ri-search-line text-2xl text-gray-400"></i>
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {teamMemberSearchQuery ? 'No Team Members Found' : 'No Team Members Available'}
                              </h3>
                              <p className="text-gray-500 text-center mb-4">
                                {teamMemberSearchQuery 
                                  ? `No team members found matching "${teamMemberSearchQuery}". Try adjusting your search terms.`
                                  : 'No team members available at the moment.'
                                }
                              </p>
                              {teamMemberSearchQuery && (
                                <button
                                  onClick={() => {
                                    setTeamMemberSearchQuery("");
                                    fetchTeamMembersModal(1, "");
                                  }}
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-refresh-line me-2"></i>
                                  Clear Search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        allTeamMembers
                          .filter(tm => tm.id !== params.id) // Exclude current team member
                          .map((teamMember) => (
                            <tr key={teamMember.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  className="form-checkbox h-5 w-5 text-primary"
                                  checked={selectedAccessibleTeamMembers.some(tm => tm.id === teamMember.id)}
                                  onChange={() => handleTeamMemberSelect(teamMember)}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{teamMember.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{teamMember.email}</div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTeamMemberPageChange(Math.max(teamMemberCurrentPage - 1, 1))}
                  disabled={teamMemberCurrentPage === 1}
                  className="ti-btn ti-btn-secondary"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {teamMemberTotalPages > 0 ? (
                    `Page ${teamMemberCurrentPage} of ${teamMemberTotalPages}`
                  ) : (
                    "No pages"
                  )}
                </span>
                <button
                  onClick={() => handleTeamMemberPageChange(Math.min(teamMemberCurrentPage + 1, teamMemberTotalPages))}
                  disabled={teamMemberCurrentPage === teamMemberTotalPages || teamMemberTotalPages === 0}
                  className="ti-btn ti-btn-secondary"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowTeamMemberModal(false)}
                  className="ti-btn ti-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTeamMemberModalSubmit}
                  className="ti-btn ti-btn-primary"
                >
                  Select ({selectedAccessibleTeamMembers.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
