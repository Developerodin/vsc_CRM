"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';
import { useSelectedBranchId, useBranchContext } from "@/shared/contextapi";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;
  fNo: string;
  pan: string;
  dob: string;
  branch: string;
  sortOrder: number;
  businessType: string;
  gstNumber: string;
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  activities: ActivityMapping[];
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  name: string;
  description?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ActivityMapping {
  activity: string;
  assignedTeamMember: string;
  assignedDate: string;
  notes: string;
}

const AddClientPage = () => {
  const selectedBranchId = useSelectedBranchId();
  const { branches, selectedBranch } = useBranchContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'activity'>('general');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number>(-1);
  const [selectedTeamMemberIndex, setSelectedTeamMemberIndex] = useState<number>(-1);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState("");
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    email2: '',
    address: '',
    district: '',
    state: '',
    country: '',
    fNo: '',
    pan: '',
    dob: '',
    branch: selectedBranchId || '',
    sortOrder: 1,
    businessType: '',
    gstNumber: '',
    tanNumber: '',
    cinNumber: '',
    udyamNumber: '',
    iecCode: '',
    entityType: '',
  });

  const [activityMappings, setActivityMappings] = useState<ActivityMapping[]>([
    {
      activity: '',
      assignedTeamMember: '',
      assignedDate: '',
      notes: ''
    }
  ]);

  // Fetch activities and team members
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoadingActivities(true);
        const response = await fetch(`${Base_url}activities?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setActivities(data.results || []);
          setFilteredActivities(data.results || []);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    const fetchTeamMembers = async () => {
      try {
        setIsLoadingTeamMembers(true);
        const response = await fetch(`${Base_url}team-members?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data.results || []);
          setFilteredTeamMembers(data.results || []);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setIsLoadingTeamMembers(false);
      }
    };

    fetchActivities();
    fetchTeamMembers();
  }, []);

  // Filter activities and team members based on search
  useEffect(() => {
    const filtered = activities.filter(activity =>
      activity.name.toLowerCase().includes(activitySearchQuery.toLowerCase())
    );
    setFilteredActivities(filtered);
  }, [activities, activitySearchQuery]);

  useEffect(() => {
    const filtered = teamMembers.filter(member =>
      member.name.toLowerCase().includes(teamMemberSearchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(teamMemberSearchQuery.toLowerCase())
    );
    setFilteredTeamMembers(filtered);
  }, [teamMembers, teamMemberSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 1 : value
    }));
  };

  const handleActivityMappingChange = (index: number, field: keyof ActivityMapping, value: string) => {
    const updatedMappings = [...activityMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      [field]: value
    };
    setActivityMappings(updatedMappings);
  };

  const addActivityMapping = () => {
    setActivityMappings([
      ...activityMappings,
      {
        activity: '',
        assignedTeamMember: '',
        assignedDate: '',
        notes: ''
      }
    ]);
  };

  const removeActivityMapping = (index: number) => {
    const updatedMappings = activityMappings.filter((_, i) => i !== index);
    setActivityMappings(updatedMappings);
  };

  const openActivityModal = (index: number) => {
    setSelectedActivityIndex(index);
    setActivitySearchQuery("");
    setShowActivityModal(true);
  };

  const openTeamMemberModal = (index: number) => {
    setSelectedTeamMemberIndex(index);
    setTeamMemberSearchQuery("");
    setShowTeamMemberModal(true);
  };

  const selectActivity = (activity: Activity) => {
    if (selectedActivityIndex >= 0) {
      const updatedMappings = [...activityMappings];
      updatedMappings[selectedActivityIndex] = {
        ...updatedMappings[selectedActivityIndex],
        activity: activity.id
      };
      setActivityMappings(updatedMappings);
    }
    setShowActivityModal(false);
    setSelectedActivityIndex(-1);
  };

  const selectTeamMember = (member: TeamMember) => {
    if (selectedTeamMemberIndex >= 0) {
      const updatedMappings = [...activityMappings];
      updatedMappings[selectedTeamMemberIndex] = {
        ...updatedMappings[selectedTeamMemberIndex],
        assignedTeamMember: member.id
      };
      setActivityMappings(updatedMappings);
    }
    setShowTeamMemberModal(false);
    setSelectedTeamMemberIndex(-1);
  };

  const validateForm = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Email2 validation (optional but if provided, should be valid)
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      toast.error('Please enter a valid secondary email address');
      return false;
    }

    // Phone validation (basic format)
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    // PAN validation (basic format - 10 characters)
    if (formData.pan && formData.pan.length !== 10) {
      toast.error('PAN should be 10 characters long');
      return false;
    }

    // Branch validation
    if (!formData.branch) {
      toast.error('Please select a branch');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'general') {
      if (!validateForm()) return;
      setActiveTab('activity');
      return;
    }
    
    // Only submit when on activity tab
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const clientData = {
        ...formData,
        activities: activityMappings.filter(mapping => mapping.activity && mapping.assignedTeamMember)
      };

      const response = await fetch(`${Base_url}clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create client');
      }

      const data: Client = await response.json();
      toast.success('Client created successfully');
      router.push('/clients');
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branch: selectedBranchId || ''
    }));
  }, [selectedBranchId]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Client"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Client</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/clients" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Clients
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New Client</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 border-b border-gray-200">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'general'
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('general')}
                >
                  General Info
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'activity'
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('activity')}
                >
                  Activity Mapping
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    </div>

                    {/* Client Name */}
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder="Enter client name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Client Phone */}
                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="form-control"
                        placeholder="Enter client phone number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Client Email */}
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control"
                        placeholder="Enter client email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Client Email 2 */}
                    <div className="form-group">
                      <label htmlFor="email2" className="form-label">Secondary Email</label>
                      <input
                        type="email"
                        id="email2"
                        name="email2"
                        className="form-control"
                        placeholder="Enter secondary email (optional)"
                        value={formData.email2}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Date of Birth */}
                    <div className="form-group">
                      <label htmlFor="dob" className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        id="dob"
                        name="dob"
                        className="form-control"
                        value={formData.dob}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Branch */}
                    <div className="form-group">
                      <label htmlFor="branch" className="form-label">Branch <span className="text-red-500">*</span></label>
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

                    {/* Address Information */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                    </div>

                    {/* Client Address */}
                    <div className="form-group md:col-span-2">
                      <label htmlFor="address" className="form-label">Address</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        className="form-control"
                        placeholder="Enter client address"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Client District */}
                    <div className="form-group">
                      <label htmlFor="district" className="form-label">District</label>
                      <input
                        type="text"
                        id="district"
                        name="district"
                        className="form-control"
                        placeholder="Enter district"
                        value={formData.district}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Client State */}
                    <div className="form-group">
                      <label htmlFor="state" className="form-label">State</label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        className="form-control"
                        placeholder="Enter state"
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Client Country */}
                    <div className="form-group">
                      <label htmlFor="country" className="form-label">Country</label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        className="form-control"
                        placeholder="Enter country"
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Business Information */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                    </div>

                    {/* Business Type */}
                    <div className="form-group">
                      <label htmlFor="businessType" className="form-label">Business Type</label>
                      <select
                        id="businessType"
                        name="businessType"
                        className="form-control"
                        value={formData.businessType}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Business Type</option>
                        <option value="Aviation">Aviation</option>
                        <option value="Banking">Banking</option>
                        <option value="Chemicals, Petrochemicals">Chemicals, Petrochemicals</option>
                        <option value="Coal">Coal</option>
                        <option value="Construction">Construction</option>
                        <option value="Consultancy Services">Consultancy Services</option>
                        <option value="Co-operatives">Co-operatives</option>
                        <option value="Education">Education</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Mining">Mining</option>
                        <option value="Non Banking Financial Companies">Non Banking Financial Companies</option>
                        <option value="Non Government Organisation">Non Government Organisation</option>
                        <option value="Oil & Gas">Oil & Gas</option>
                        <option value="Power">Power</option>
                        <option value="Shipping">Shipping</option>
                        <option value="Steel">Steel</option>
                        <option value="Tele-Communication">Tele-Communication</option>
                        <option value="Tourism">Tourism</option>
                        <option value="Trading">Trading</option>
                        <option value="Transport other than Shipping & Aviation">Transport other than Shipping & Aviation</option>
                      </select>
                    </div>

                    {/* Entity Type */}
                    <div className="form-group">
                      <label htmlFor="entityType" className="form-label">Entity Type</label>
                      <select
                        id="entityType"
                        name="entityType"
                        className="form-control"
                        value={formData.entityType}
                        onChange={handleInputChange}
                      >
                        <option value="">Select entity type</option>
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="LLP">LLP</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="HUF">HUF</option>
                        <option value="Trust">Trust</option>
                        <option value="Society">Society</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* F No */}
                    <div className="form-group">
                      <label htmlFor="fNo" className="form-label">F No</label>
                      <input
                        type="text"
                        id="fNo"
                        name="fNo"
                        className="form-control"
                        placeholder="Enter F No (optional)"
                        value={formData.fNo}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* PAN */}
                    <div className="form-group">
                      <label htmlFor="pan" className="form-label">PAN</label>
                      <input
                        type="text"
                        id="pan"
                        name="pan"
                        className="form-control"
                        placeholder="Enter PAN (10 characters)"
                        value={formData.pan}
                        onChange={handleInputChange}
                        maxLength={10}
                      />
                    </div>

                    {/* GST Number */}
                    <div className="form-group">
                      <label htmlFor="gstNumber" className="form-label">GST Number</label>
                      <input
                        type="text"
                        id="gstNumber"
                        name="gstNumber"
                        className="form-control"
                        placeholder="Enter GST Number"
                        value={formData.gstNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* TAN Number */}
                    <div className="form-group">
                      <label htmlFor="tanNumber" className="form-label">TAN Number</label>
                      <input
                        type="text"
                        id="tanNumber"
                        name="tanNumber"
                        className="form-control"
                        placeholder="Enter TAN Number"
                        value={formData.tanNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* CIN Number */}
                    <div className="form-group">
                      <label htmlFor="cinNumber" className="form-label">CIN Number</label>
                      <input
                        type="text"
                        id="cinNumber"
                        name="cinNumber"
                        className="form-control"
                        placeholder="Enter CIN Number"
                        value={formData.cinNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Udyam Number */}
                    <div className="form-group">
                      <label htmlFor="udyamNumber" className="form-label">Udyam Number</label>
                      <input
                        type="text"
                        id="udyamNumber"
                        name="udyamNumber"
                        className="form-control"
                        placeholder="Enter Udyam Number"
                        value={formData.udyamNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* IEC Code */}
                    <div className="form-group">
                      <label htmlFor="iecCode" className="form-label">IEC Code</label>
                      <input
                        type="text"
                        id="iecCode"
                        name="iecCode"
                        className="form-control"
                        placeholder="Enter IEC Code (10 digits)"
                        value={formData.iecCode}
                        onChange={handleInputChange}
                        maxLength={10}
                      />
                    </div>

                    {/* Sort Order */}
                    <div className="form-group">
                      <label htmlFor="sortOrder" className="form-label">Sort Order <span className="text-red-500">*</span></label>
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
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={addActivityMapping}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line mr-2"></i>
                        Add Activity
                      </button>
                    </div>

                    <div className="space-y-4">
                      {activityMappings.map((mapping, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            {activityMappings.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeActivityMapping(index)}
                                className="ti-btn ti-btn-danger ti-btn-sm"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Activity */}
                                                            <div className="form-group">
                                                            <label className="form-label">Activity<span className="text-red-500">*</span></label>
                                  <div className="relative">
                                <button
                                  type="button"
                                  className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50`}
                                  onClick={() => openActivityModal(index)}
                                >
                                  <span className="truncate">
                                    {activities.find(a => a.id === mapping.activity)?.name || "Select Activity"}
                                  </span>
                                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                                </button>
                              </div>
                            </div>

                            {/* Team Member */}
                            <div className="form-group">
                              <label className="form-label">Team Member <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <button
                                  type="button"
                                  className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50`}
                                  onClick={() => openTeamMemberModal(index)}
                                >
                                  <span className="truncate">
                                    {teamMembers.find(m => m.id === mapping.assignedTeamMember)?.name || "Select Team Member"}
                                  </span>
                                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                                </button>
                              </div>
                            </div>

                            {/* Notes */}
                            <div className="form-group">
                              <label className="form-label">Notes</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Enter notes (optional)"
                                value={mapping.notes}
                                onChange={(e) => handleActivityMappingChange(index, 'notes', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : activeTab === 'general' ? (
                      'Next'
                    ) : (
                      'Save Client'
                    )}
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={() => router.push('/clients')}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Selection Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Activity</h2>
              <button
                onClick={() => setShowActivityModal(false)}
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
                      placeholder="Search activities..."
                      className="form-control py-4 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                      value={activitySearchQuery}
                      onChange={(e) => setActivitySearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingActivities ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity Name
                        </th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th> */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {activity.name}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap">
                            {activity.description || '-'}
                          </td> */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => selectActivity(activity)}
                              className="ti-btn ti-btn-primary"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Member Selection Modal */}
      {showTeamMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Team Member</h2>
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
                      placeholder="Search team members..."
                      className="form-control py-4 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                      value={teamMemberSearchQuery}
                      onChange={(e) => setTeamMemberSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
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
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTeamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => selectTeamMember(member)}
                              className="ti-btn ti-btn-primary"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddClientPage; 