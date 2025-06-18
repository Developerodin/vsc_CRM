"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';

interface Activity {
    id: string;
    name: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

interface Group {
    id: string;
    name: string;
    numberOfClients: number;
    clients: Client[];
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    branch: Branch;
    sortOrder: number;
    skills: Activity[];
    createdAt: string;
    updatedAt: string;
}

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
    createdAt: string;
    updatedAt: string;
}

interface Timeline {
  id: string;
  activityName: string;
  groupId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  frequency: string;
  frequencyCount: string;
  udin: string;
  turnover: string;
  teamMemberId: string;
  teamMemberName: string;
  dueDate: string;
}

const EditTimelinePage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(1);
  const [clientTotalResults, setClientTotalResults] = useState(0);
  
  // API data states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [formData, setFormData] = useState({
    activityName: '',
    groupId: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    frequency: '',
    frequencyCount: '',
    udin: '',
    turnover: '',
    teamMemberId: '',
    teamMemberName: '',
    dueDate: ''
  });

  // Fetch activities from API
  const fetchActivities = async () => {
    try {
      const response = await fetch(`${Base_url}activities?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.results);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to fetch activities');
    }
  };

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      const response = await fetch(`${Base_url}groups?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data.results);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to fetch groups');
    }
  };

  // Fetch team members from API
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${Base_url}team-members?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      setTeamMembers(data.results);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to fetch team members');
    }
  };

  // Fetch timeline data on component mount
  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setIsLoading(true);
        
        // Load all required data from APIs
        await Promise.all([
          fetchActivities(),
          fetchGroups(),
          fetchTeamMembers()
        ]);
        
        // Simulate API call to fetch timeline data (since timeline API is not ready)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dummy timeline data - in real app, this would come from API
        const timelineData: Timeline = {
          id: params.id,
          activityName: "Income Tax Filing",
          groupId: "1",
          clientId: "1",
          clientName: "Rajesh Kumar & Associates",
          clientEmail: "rajesh.kumar@rkassociates.com",
          frequency: "monthly",
          frequencyCount: "once",
          udin: "UDIN-2024-001234",
          turnover: "₹2.5 Crores",
          teamMemberId: "1",
          teamMemberName: "Priya Sharma",
          dueDate: "2024-12-31"
        };

        setFormData({
          activityName: timelineData.activityName,
          groupId: timelineData.groupId,
          clientId: timelineData.clientId,
          clientName: timelineData.clientName,
          clientEmail: timelineData.clientEmail,
          frequency: timelineData.frequency,
          frequencyCount: timelineData.frequencyCount,
          udin: timelineData.udin,
          turnover: timelineData.turnover,
          teamMemberId: timelineData.teamMemberId,
          teamMemberName: timelineData.teamMemberName,
          dueDate: timelineData.dueDate
        });
      } catch (error) {
        console.error('Error fetching timeline data:', error);
        toast.error('Failed to load timeline data');
        router.push('/timelines');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchTimelineData();
    }
  }, [params.id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill client details when client is selected
    if (name === 'clientId') {
      if (value) {
        const selectedClient = availableClients.find(client => client.id === value);
        if (selectedClient) {
          setFormData(prev => ({
            ...prev,
            clientName: selectedClient.name,
            clientEmail: selectedClient.email
          }));
        }
      } else {
        // Clear client details when no client is selected
        setFormData(prev => ({
          ...prev,
          clientName: '',
          clientEmail: ''
        }));
      }
    }

    // Auto-fill team member name when team member is selected
    if (name === 'teamMemberId') {
      if (value) {
        const selectedMember = teamMembers.find(member => member.id === value);
        if (selectedMember) {
          setFormData(prev => ({
            ...prev,
            teamMemberName: selectedMember.name
          }));
        }
      } else {
        // Clear team member name when no team member is selected
        setFormData(prev => ({
          ...prev,
          teamMemberName: ''
        }));
      }
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    setFormData(prev => ({
      ...prev,
      groupId,
      clientId: '',
      clientName: '',
      clientEmail: ''
    }));
  };

  const fetchAvailableClients = async (groupId: string) => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams({
        page: clientCurrentPage.toString(),
        limit: "10",
        ...(clientSearchQuery && { name: clientSearchQuery })
      });

      // First get the group details to get the clients
      const groupResponse = await fetch(`${Base_url}groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!groupResponse.ok) {
        throw new Error('Failed to fetch group details');
      }

      const groupData = await groupResponse.json();
      
      // If the group has clients array, use it directly
      if (Array.isArray(groupData.clients)) {
        setAvailableClients(groupData.clients);
        setClientTotalResults(groupData.clients.length);
        setClientTotalPages(Math.ceil(groupData.clients.length / 10));
      } else {
        // If no clients array, fetch clients for the group
        const clientsResponse = await fetch(`${Base_url}groups/${groupId}/clients?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!clientsResponse.ok) {
          throw new Error('Failed to fetch clients');
        }

        const clientsData = await clientsResponse.json();
        setAvailableClients(clientsData.results || []);
        setClientTotalResults(clientsData.totalResults || 0);
        setClientTotalPages(clientsData.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to fetch clients');
      setAvailableClients([]);
      setClientTotalResults(0);
      setClientTotalPages(1);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email
    }));
    setShowClientModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);

      // Simulate API call for timeline update (since timeline API is not ready)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Timeline updated successfully');
      router.push('/timelines');
    } catch (err) {
      console.error('Error updating timeline:', err);
      toast.error('Failed to update timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyOptions = () => {
    const options = [
      { value: 'daily', label: 'Daily' },
      { value: 'alternate-day', label: 'Alternate Day' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' }
    ];
    return options;
  };

  const getFrequencyCountOptions = () => {
    const options = [
      { value: 'once', label: 'Once' },
      { value: 'twice', label: 'Twice' }
    ];
    return options;
  };

  // Pagination helper function
  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 2);
        i <= Math.min(totalPages - 1, currentPage + 2);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Timeline"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Timeline</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/timelines" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Timelines
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Edit Timeline</span>
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
                  {/* Activity Name */}
                  <div className="form-group">
                    <label htmlFor="activityName" className="form-label">Activity Name <span className="text-red-500">*</span></label>
                    <select
                      id="activityName"
                      name="activityName"
                      className="form-select"
                      value={formData.activityName}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Activity</option>
                      {activities.map(activity => (
                        <option key={activity.id} value={activity.name}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Group Selection */}
                  <div className="form-group">
                    <label htmlFor="groupId" className="form-label">Group <span className="text-red-500">*</span></label>
                    <select
                      id="groupId"
                      name="groupId"
                      className="form-select"
                      value={formData.groupId}
                      onChange={handleGroupChange}
                      required
                    >
                      <option value="">Select Group</option>
                      <option value="none">None (Ungrouped Clients)</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.numberOfClients} clients)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client Selection */}
                  <div className="form-group">
                    <label htmlFor="clientId" className="form-label">Client <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`ti-btn ti-btn-primary ${
                          !formData.groupId ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (formData.groupId) {
                            fetchAvailableClients(formData.groupId);
                            setShowClientModal(true);
                          }
                        }}
                        disabled={!formData.groupId}
                      >
                        <i className="ri-search-line me-2"></i>
                        {formData.clientName ? `Selected: ${formData.clientName}` : "Select Client"}
                      </button>
                    </div>
                  </div>

                  {/* Client Name (Read-only) */}
                  <div className="form-group">
                    <label htmlFor="clientName" className="form-label">Client Name</label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      className="form-control bg-gray-50"
                      value={formData.clientName}
                      readOnly
                    />
                  </div>

                  {/* Client Email (Read-only) */}
                  <div className="form-group">
                    <label htmlFor="clientEmail" className="form-label">Client Email</label>
                    <input
                      type="email"
                      id="clientEmail"
                      name="clientEmail"
                      className="form-control bg-gray-50"
                      value={formData.clientEmail}
                      readOnly
                    />
                  </div>

                  {/* Frequency */}
                  <div className="form-group">
                    <label htmlFor="frequency" className="form-label">Frequency <span className="text-red-500">*</span></label>
                    <select
                      id="frequency"
                      name="frequency"
                      className="form-select"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Frequency</option>
                      {getFrequencyOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Count */}
                  <div className="form-group">
                    <label htmlFor="frequencyCount" className="form-label">Frequency Count <span className="text-red-500">*</span></label>
                    <select
                      id="frequencyCount"
                      name="frequencyCount"
                      className="form-select"
                      value={formData.frequencyCount}
                      onChange={handleInputChange}
                      disabled={!formData.frequency}
                      required
                    >
                      <option value="">Select Count</option>
                      {formData.frequency && getFrequencyCountOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* UDIN */}
                  <div className="form-group">
                    <label htmlFor="udin" className="form-label">UDIN</label>
                    <input
                      type="text"
                      id="udin"
                      name="udin"
                      className="form-control"
                      placeholder="Enter UDIN (e.g., UDIN-2024-001234)"
                      value={formData.udin}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Turnover */}
                  <div className="form-group">
                    <label htmlFor="turnover" className="form-label">Turnover</label>
                    <input
                      type="text"
                      id="turnover"
                      name="turnover"
                      className="form-control"
                      placeholder="Enter turnover (e.g., ₹2.5 Crores)"
                      value={formData.turnover}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Assigned Member */}
                  <div className="form-group">
                    <label htmlFor="teamMemberId" className="form-label">Assigned Member <span className="text-red-500">*</span></label>
                    <select
                      id="teamMemberId"
                      name="teamMemberId"
                      className="form-select"
                      value={formData.teamMemberId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Assigned Member</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Member Name (Read-only) */}
                  <div className="form-group">
                    <label htmlFor="teamMemberName" className="form-label">Assigned Member Name</label>
                    <input
                      type="text"
                      id="teamMemberName"
                      name="teamMemberName"
                      className="form-control bg-gray-50"
                      value={formData.teamMemberName}
                      readOnly
                    />
                  </div>

                  {/* Due Date */}
                  <div className="form-group md:col-span-2">
                    <label htmlFor="dueDate" className="form-label">Due Date</label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      className="form-control"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                    />
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        'Update Timeline'
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/timelines')}
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

      {/* Client Selection Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-xl font-semibold">
                  Select Client
                </h3>
                <button
                  onClick={() => {
                    setShowClientModal(false);
                    setAvailableClients([]);
                    setClientSearchQuery("");
                    setClientCurrentPage(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      className="form-control py-3 pr-10"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                    />
                    <button className="absolute end-0 top-0 px-4 h-full">
                      <i className="ri-search-line text-lg"></i>
                    </button>
                  </div>
                </div>

                {isLoadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th scope="col" className="text-start">Name</th>
                          <th scope="col" className="text-start">Email</th>
                          <th scope="col" className="text-start">Phone</th>
                          <th scope="col" className="text-start">City</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(availableClients) && availableClients.length > 0 ? (
                          availableClients.map((client) => (
                            <tr key={client.id} className="border-b border-gray-200">
                              <td>{client.name}</td>
                              <td>{client.email}</td>
                              <td>{client.phone}</td>
                              <td>{client.city}</td>
                              <td>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => handleSelectClient(client)}
                                >
                                  <i className="ri-check-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8">
                              No clients found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Client Pagination */}
                {!isLoadingClients && clientTotalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {clientTotalResults === 0 ? 0 : (clientCurrentPage - 1) * 10 + 1} to{" "}
                      {Math.min(clientCurrentPage * 10, clientTotalResults)} of {clientTotalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${clientCurrentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setClientCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={clientCurrentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {getPagination(clientCurrentPage, clientTotalPages).map((page, idx) =>
                          page === "..." ? (
                            <li key={"ellipsis-" + idx} className="page-item">
                              <span className="px-3">...</span>
                            </li>
                          ) : (
                            <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  clientCurrentPage === page
                                    ? "bg-primary text-white hover:bg-primary-dark"
                                    : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                }`}
                                onClick={() => setClientCurrentPage(Number(page))}
                              >
                                {page}
                              </button>
                            </li>
                          )
                        )}
                        <li className={`page-item ${clientCurrentPage === clientTotalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setClientCurrentPage((prev) => Math.min(prev + 1, clientTotalPages))}
                            disabled={clientCurrentPage === clientTotalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTimelinePage;
