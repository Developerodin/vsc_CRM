"use client"
import React, { useState, useEffect, useCallback } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';
import { useSelectedBranchId, useBranchContext } from "@/shared/contextapi";

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
    branchId: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

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
  branchId: string;
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

const AddTimelinePage = () => {
  const router = useRouter();
  const selectedBranchId = useSelectedBranchId();
  const { branches, selectedBranch } = useBranchContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(1);
  const [clientTotalResults, setClientTotalResults] = useState(0);
  
  // Frequency configuration modal state
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  
  // API data states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [formData, setFormData] = useState({
    activityId: '',
    groupId: 'none',
    clientId: [] as string[],
    clientName: [] as string[],
    clientEmail: [] as string[],
    branchId: selectedBranchId || '',
    frequency: '',
    frequencyConfig: {
      hourlyInterval: 1,
      dailyTime: '',
      weeklyDays: [] as string[],
      weeklyTime: '',
      monthlyDay: 1,
      monthlyTime: '',
      quarterlyMonths: [] as string[],
      quarterlyDay: 1,
      quarterlyTime: '',
      yearlyMonth: [] as string[],
      yearlyDate: 1,
      yearlyTime: ''
    },
    status: 'pending' as 'pending' | 'completed' | 'ongoing' | 'delayed',
    udin: '',
    turnover: '',
    teamMemberId: '',
    teamMemberName: '',
    startDate: '',
    endDate: ''
  });

  // State for managing selected clients in modal
  const [selectedClientsInModal, setSelectedClientsInModal] = useState<Client[]>([]);

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

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchActivities(),
          fetchGroups(),
          fetchTeamMembers()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Update form data when selected branch changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branchId: selectedBranchId || ''
    }));
  }, [selectedBranchId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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
      clientId: [],
      clientName: [],
      clientEmail: []
    }));
  };

  const fetchAvailableClients = async (groupId: string, searchQuery?: string, page?: number) => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams({
        page: (page || clientCurrentPage).toString(),
        limit: "10",
        ...(searchQuery && { name: searchQuery })
      });

      let clientsData;
      
      if (groupId === 'none') {
        // Fetch all clients when no group is selected
        const clientsResponse = await fetch(`${Base_url}clients?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!clientsResponse.ok) {
          throw new Error('Failed to fetch clients');
        }

        clientsData = await clientsResponse.json();
      } else {
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
        
        // If the group has clients array, filter it by search query if provided
        if (Array.isArray(groupData.clients)) {
          let filteredClients = groupData.clients;
          
          // Apply search filter if searchQuery is provided
          if (searchQuery) {
            filteredClients = groupData.clients.filter((client: Client) =>
              client.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          // Apply pagination manually since we're working with a local array
          const requestedPage = page || 1;
          const startIndex = (requestedPage - 1) * 10;
          const endIndex = startIndex + 10;
          const paginatedClients = filteredClients.slice(startIndex, endIndex);
          
          setAvailableClients(paginatedClients);
          setClientTotalResults(filteredClients.length);
          setClientTotalPages(Math.ceil(filteredClients.length / 10));
          setClientCurrentPage(requestedPage);
          return;
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

          clientsData = await clientsResponse.json();
        }
      }

      setAvailableClients(clientsData.results || []);
      setClientTotalResults(clientsData.totalResults || 0);
      setClientTotalPages(clientsData.totalPages || 1);
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

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (groupId: string, searchQuery: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setClientCurrentPage(1);
          fetchAvailableClients(groupId, searchQuery, 1);
        }, 500);
      };
    })(),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setClientSearchQuery(query);
    if (showClientModal && formData.groupId) {
      debouncedSearch(formData.groupId, query);
    }
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (formData.groupId) {
      setClientCurrentPage(1);
      fetchAvailableClients(formData.groupId, clientSearchQuery, 1);
    }
  };

  // Handle pagination for clients
  const handleClientPageChange = (page: number) => {
    setClientCurrentPage(page);
    if (formData.groupId) {
      fetchAvailableClients(formData.groupId, clientSearchQuery, page);
    }
  };

  // Handle client selection in modal (multiple selection)
  const handleClientToggle = (client: Client) => {
    setSelectedClientsInModal(prev => {
      const isSelected = prev.some(c => c.id === client.id);
      if (isSelected) {
        return prev.filter(c => c.id !== client.id);
      } else {
        return [...prev, client];
      }
    });
  };

  // Handle saving selected clients
  const handleSaveClients = () => {
    setFormData(prev => ({
      ...prev,
      clientId: selectedClientsInModal.map(client => client.id),
      clientName: selectedClientsInModal.map(client => client.name),
      clientEmail: selectedClientsInModal.map(client => client.email)
    }));
    setShowClientModal(false);
  };

  // Handle canceling client selection
  const handleCancelClients = () => {
    setShowClientModal(false);
    setSelectedClientsInModal([]);
  };

  // Check if a client is selected in modal
  const isClientSelected = (clientId: string) => {
    return selectedClientsInModal.some(client => client.id === clientId);
  };

  // Frequency configuration functions
  const handleFrequencyConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      frequencyConfig: {
        ...prev.frequencyConfig,
        [field]: value
      }
    }));
  };

  const validateFrequencyConfig = () => {
    const { frequency, frequencyConfig } = formData;
    
    switch (frequency) {
      case 'Hourly':
        return frequencyConfig.hourlyInterval > 0;
      case 'Daily':
        return frequencyConfig.dailyTime !== '';
      case 'Weekly':
        return frequencyConfig.weeklyDays.length > 0 && frequencyConfig.weeklyTime !== '';
      case 'Monthly':
        return frequencyConfig.monthlyDay > 0 && frequencyConfig.monthlyDay <= 31 && frequencyConfig.monthlyTime !== '';
      case 'Quarterly':
        return frequencyConfig.quarterlyMonths.length > 0 && frequencyConfig.quarterlyDay > 0 && frequencyConfig.quarterlyDay <= 31 && frequencyConfig.quarterlyTime !== '';
      case 'Yearly':
        return frequencyConfig.yearlyMonth.length > 0 && frequencyConfig.yearlyDate > 0 && frequencyConfig.yearlyDate <= 31 && frequencyConfig.yearlyTime !== '';
      default:
        return false;
    }
  };

  const formatTimeForAPI = (timeString: string) => {
    if (!timeString) return '';
    
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const handleSaveFrequencyConfig = () => {
    if (validateFrequencyConfig()) {
      setShowFrequencyModal(false);
      toast.success('Frequency configuration saved');
    } else {
      toast.error('Please fill in all required fields for the selected frequency');
    }
  };

  const handleCancelFrequencyConfig = () => {
    setShowFrequencyModal(false);
  };

  const getFrequencyConfigStatus = () => {
    if (!formData.frequency) return 'Not configured';
    return validateFrequencyConfig() ? 'Configured' : 'Incomplete';
  };

  const getFrequencyConfigStatusColor = () => {
    if (!formData.frequency) return 'text-gray-500';
    return validateFrequencyConfig() ? 'text-green-600' : 'text-red-600';
  };

  // Validation function for date fields
  const validateDates = () => {
    if (formData.startDate && formData.endDate) {
      return new Date(formData.endDate) >= new Date(formData.startDate);
    }
    return true;
  };

  const getDateValidationClass = (fieldName: 'startDate' | 'endDate') => {
    if (formData.startDate && formData.endDate) {
      const isValid = validateDates();
      if (!isValid) {
        return 'border-red-500 focus:border-red-500 focus:ring-red-500';
      }
    }
    return '';
  };

  const getDateValidationMessage = () => {
    if (formData.startDate && formData.endDate && !validateDates()) {
      return 'End date cannot be before start date';
    }
    return '';
  };

  // Helper function to format date to ISO format with time set to 23:59:59.000Z
  const formatDateToISO = (dateString?: string) => {
    if (!dateString) return undefined;
    try {
      const date = new Date(dateString);
      // Set time to 23:59:59.000Z for the end of the day
      date.setHours(23, 59, 59, 0);
      return date.toISOString();
    } catch (error) {
      return undefined;
    }
  };

  // Helper function to remove empty fields from request body
  const removeEmptyFields = (obj: any) => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else if (typeof value === 'object') {
          const cleanedObj = removeEmptyFields(value);
          if (Object.keys(cleanedObj).length > 0) {
            cleaned[key] = cleanedObj;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  };

  // Helper function to generate preview text
  const generatePreviewText = () => {
    if (!formData.activityId || !formData.clientId.length || !formData.frequency || !formData.teamMemberId || !validateFrequencyConfig()) {
      return '';
    }

    const activity = activities.find(a => a.id === formData.activityId);
    const clients = formData.clientName.join(', ');
    const startDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-GB') : 'specified start date';
    const endDate = formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-GB') : 'specified end date';

    let frequencyText = '';
    const { frequencyConfig } = formData;

    switch (formData.frequency) {
      case 'Hourly':
        frequencyText = `every ${frequencyConfig.hourlyInterval} hour${frequencyConfig.hourlyInterval > 1 ? 's' : ''}`;
        break;
      case 'Daily':
        const dailyTime = frequencyConfig.dailyTime ? formatTimeForAPI(frequencyConfig.dailyTime) : 'specified time';
        frequencyText = `every day at ${dailyTime}`;
        break;
      case 'Weekly':
        const weeklyDays = frequencyConfig.weeklyDays.length > 0 ? frequencyConfig.weeklyDays.join(', ') : 'specified days';
        const weeklyTime = frequencyConfig.weeklyTime ? formatTimeForAPI(frequencyConfig.weeklyTime) : 'specified time';
        frequencyText = `every ${weeklyDays} at ${weeklyTime}`;
        break;
      case 'Monthly':
        const monthlyDay = frequencyConfig.monthlyDay || 'specified day';
        const monthlyTime = frequencyConfig.monthlyTime ? formatTimeForAPI(frequencyConfig.monthlyTime) : 'specified time';
        frequencyText = `every month on ${monthlyDay}${monthlyDay === 1 ? 'st' : monthlyDay === 2 ? 'nd' : monthlyDay === 3 ? 'rd' : 'th'} at ${monthlyTime}`;
        break;
      case 'Quarterly':
        const quarterlyMonths = frequencyConfig.quarterlyMonths.length > 0 ? frequencyConfig.quarterlyMonths.join(', ') : 'specified months';
        const quarterlyDay = frequencyConfig.quarterlyDay || 'specified day';
        const quarterlyTime = frequencyConfig.quarterlyTime ? formatTimeForAPI(frequencyConfig.quarterlyTime) : 'specified time';
        frequencyText = `every quarter on ${quarterlyDay}${quarterlyDay === 1 ? 'st' : quarterlyDay === 2 ? 'nd' : quarterlyDay === 3 ? 'rd' : 'th'} of ${quarterlyMonths} at ${quarterlyTime}`;
        break;
      case 'Yearly':
        const yearlyMonths = frequencyConfig.yearlyMonth.length > 0 ? frequencyConfig.yearlyMonth.join(', ') : 'specified months';
        const yearlyDate = frequencyConfig.yearlyDate || 'specified date';
        const yearlyTime = frequencyConfig.yearlyTime ? formatTimeForAPI(frequencyConfig.yearlyTime) : 'specified time';
        frequencyText = `every year on ${yearlyDate}${yearlyDate === 1 ? 'st' : yearlyDate === 2 ? 'nd' : yearlyDate === 3 ? 'rd' : 'th'} of ${yearlyMonths} at ${yearlyTime}`;
        break;
      default:
        frequencyText = 'at specified intervals';
    }

    const dateRange = formData.startDate && formData.endDate 
      ? `starting from ${startDate} and continuing till ${endDate}`
      : formData.startDate 
        ? `starting from ${startDate}`
        : formData.endDate 
          ? `continuing till ${endDate}`
          : '';

    return `${activity?.name} activity will be created ${frequencyText} for ${clients}${dateRange ? `, ${dateRange}` : ''}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if(!formData.clientId.length) {
      toast.error('Please select at least one client');
      return;
    }
    
    // Validate branch selection
    if (!formData.branchId) {
      toast.error('Please select a branch');
      return;
    }
    
    // Validate frequency configuration
    if (!validateFrequencyConfig()) {
      toast.error('Please configure the frequency settings properly');
      return;
    }
    
    // Validate that end date is not before start date
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }
    
    try {
      setIsLoading(true);

      // Format frequency configuration for API
      const formattedFrequencyConfig = {
        ...formData.frequencyConfig,
        dailyTime: formatTimeForAPI(formData.frequencyConfig.dailyTime),
        weeklyTime: formatTimeForAPI(formData.frequencyConfig.weeklyTime),
        monthlyTime: formatTimeForAPI(formData.frequencyConfig.monthlyTime),
        quarterlyTime: formatTimeForAPI(formData.frequencyConfig.quarterlyTime),
        yearlyTime: formatTimeForAPI(formData.frequencyConfig.yearlyTime)
      };

      // Remove empty fields from request body
      const cleanedFormData = removeEmptyFields({
        activity: formData.activityId,
        client: formData.clientId,
        branchId: formData.branchId,
        frequency: formData.frequency,
        frequencyConfig: formattedFrequencyConfig,
        status: formData.status,
        udin: formData.udin || undefined,
        turnover: formData.turnover ? parseFloat(formData.turnover) : undefined,
        assignedMember: formData.teamMemberId,
        startDate: formatDateToISO(formData.startDate),
        endDate: formatDateToISO(formData.endDate)
      });

      const response = await fetch(`${Base_url}timelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cleanedFormData)
      });

      if (!response.ok) {
        throw new Error('Failed to create timeline');
      }

      toast.success('Timeline created successfully');
      router.push('/timelines');
    } catch (err) {
      console.error('Error creating timeline:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyOptions = () => {
    const options = [
      { value: 'Hourly', label: 'Hourly' },
      { value: 'Daily', label: 'Daily' },
      { value: 'Weekly', label: 'Weekly' },
      { value: 'Monthly', label: 'Monthly' },
      { value: 'Quarterly', label: 'Quarterly' },
      { value: 'Yearly', label: 'Yearly' }
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

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Timeline"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Timeline</h1>
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
                      <span className="text-sm font-medium text-gray-500">Add New Timeline</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* First Row: Activity Name, Group, Client */}
                  <div className="form-group">
                    <label htmlFor="activityId" className="form-label">Activity Name <span className="text-red-500">*</span></label>
                    <select
                      id="activityId"
                      name="activityId"
                      className="form-select"
                      value={formData.activityId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Activity</option>
                      {activities.map(activity => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      <option value="none">All Clients</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.numberOfClients} clients)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="clientId" className="form-label">Client <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                          !formData.groupId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (formData.groupId) {
                            fetchAvailableClients(formData.groupId);
                            setShowClientModal(true);
                            // Reset pagination and search when opening modal
                            setClientCurrentPage(1);
                            setClientSearchQuery("");
                            // Initialize modal with currently selected clients
                            const currentSelectedClients = availableClients.filter(client => 
                              formData.clientId.includes(client.id)
                            );
                            setSelectedClientsInModal(currentSelectedClients);
                          }
                        }}
                        disabled={!formData.groupId}
                      >
                        <span className="truncate">
                          {formData.clientName.length > 0 
                            ? `${formData.clientName.length} client(s) selected` 
                            : "Select Client(s)"
                          }
                        </span>
                        <i className="ri-arrow-down-s-line text-gray-400"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {/* Second Row: Frequency, Frequency Configuration, Status */}
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

                  <div className="form-group">
                    <label className="form-label">Frequency Configuration <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                        !formData.frequency ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (formData.frequency) {
                          setShowFrequencyModal(true);
                        }
                      }}
                      disabled={!formData.frequency}
                    >
                      <span className="truncate">
                        {formData.frequency ? (
                          <span className={`${getFrequencyConfigStatusColor()}`}>
                            {getFrequencyConfigStatus()}
                          </span>
                        ) : (
                          'Select Frequency Configuration'
                        )}
                      </span>
                      <i className="ri-settings-3-line text-gray-400"></i>
                    </button>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status <span className="text-red-500">*</span></label>
                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {/* Third Row: UDIN, Turnover, Assigned Member */}
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

                  <div className="form-group">
                    <label htmlFor="turnover" className="form-label">Turnover</label>
                    <input
                      type="text"
                      id="turnover"
                      name="turnover"
                      className="form-control"
                      placeholder="Enter turnover (e.g., 25000000)"
                      value={formData.turnover}
                      onChange={handleInputChange}
                    />
                  </div>

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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {/* Fourth Row: Branch, Start Date, End Date */}
                  <div className="form-group">
                    <label htmlFor="branchId" className="form-label">Branch <span className="text-red-500">*</span></label>
                    <select
                      id="branchId"
                      name="branchId"
                      className="form-select"
                      value={formData.branchId}
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

                  <div className="form-group">
                    <label htmlFor="startDate" className="form-label">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      className={`form-control ${getDateValidationClass('startDate')}`}
                      value={formData.startDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endDate" className="form-label">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      className={`form-control ${getDateValidationClass('endDate')}`}
                      value={formData.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Date Validation Message */}
                {getDateValidationMessage() && (
                  <div className="mt-2 text-red-500 text-sm">
                    <i className="ri-error-warning-line me-1"></i>
                    {getDateValidationMessage()}
                  </div>
                )}

                {/* Preview Box */}
                {generatePreviewText() && (
                  <div className="mt-6">
                    <label className="form-label">Preview</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {generatePreviewText()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center space-x-3 mt-6">
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
                    ) : (
                      'Save Timeline'
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
                      className="form-control py-3 pr-20"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchClick();
                        }
                      }}
                    />
                    <button 
                      className="absolute end-0 top-0 px-4 h-full bg-primary text-white hover:bg-primary-dark"
                      onClick={handleSearchClick}
                    >
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
                          <th scope="col" className="text-start w-12">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={availableClients.length > 0 && selectedClientsInModal.length === availableClients.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClientsInModal(availableClients);
                                } else {
                                  setSelectedClientsInModal([]);
                                }
                              }}
                            />
                          </th>
                          <th scope="col" className="text-start">Name</th>
                          <th scope="col" className="text-start">Email</th>
                          <th scope="col" className="text-start">Phone</th>
                          <th scope="col" className="text-start">District</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(availableClients) && availableClients.length > 0 ? (
                          availableClients.map((client) => (
                            <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-checkbox"
                                  checked={isClientSelected(client.id)}
                                  onChange={() => handleClientToggle(client)}
                                />
                              </td>
                              <td>{client.name}</td>
                              <td>{client.email}</td>
                              <td>{client.phone}</td>
                              <td>{client.district}</td>
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
                            onClick={() => handleClientPageChange(Math.max(clientCurrentPage - 1, 1))}
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
                                onClick={() => handleClientPageChange(Number(page))}
                              >
                                {page}
                              </button>
                            </li>
                          )
                        )}
                        <li className={`page-item ${clientCurrentPage === clientTotalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => handleClientPageChange(Math.min(clientCurrentPage + 1, clientTotalPages))}
                            disabled={clientCurrentPage === clientTotalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={handleCancelClients}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleSaveClients}
                  >
                    Save Clients ({selectedClientsInModal.length} selected)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frequency Configuration Modal */}
      {showFrequencyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-xl font-semibold">
                  Configure {formData.frequency} Frequency
                </h3>
                <button
                  onClick={handleCancelFrequencyConfig}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-6">
                {formData.frequency === 'Hourly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Hourly Interval <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.hourlyInterval}
                        onChange={(e) => handleFrequencyConfigChange('hourlyInterval', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                          <option key={hour} value={hour}>
                            Every {hour} hour{hour > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">How many hours between each occurrence</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Daily' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Daily Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.dailyTime}
                        onChange={(e) => handleFrequencyConfigChange('dailyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Weekly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Days of Week <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.frequencyConfig.weeklyDays.includes(day)}
                              onChange={(e) => {
                                const currentDays = formData.frequencyConfig.weeklyDays;
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('weeklyDays', [...currentDays, day]);
                                } else {
                                  handleFrequencyConfigChange('weeklyDays', currentDays.filter(d => d !== day));
                                }
                              }}
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weekly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.weeklyTime}
                        onChange={(e) => handleFrequencyConfigChange('weeklyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Monthly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.monthlyDay}
                        onChange={(e) => handleFrequencyConfigChange('monthlyDay', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.monthlyTime}
                        onChange={(e) => handleFrequencyConfigChange('monthlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Quarterly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Quarterly Months <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['January', 'April', 'July', 'October'].map(month => (
                          <label key={month} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.frequencyConfig.quarterlyMonths.includes(month)}
                              onChange={(e) => {
                                const currentMonths = formData.frequencyConfig.quarterlyMonths;
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('quarterlyMonths', [...currentMonths, month]);
                                } else {
                                  handleFrequencyConfigChange('quarterlyMonths', currentMonths.filter((m: string) => m !== month));
                                }
                              }}
                            />
                            <span className="text-sm">{month}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.quarterlyDay}
                        onChange={(e) => handleFrequencyConfigChange('quarterlyDay', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quarterly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.quarterlyTime}
                        onChange={(e) => handleFrequencyConfigChange('quarterlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Yearly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Months <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                          <label key={month} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.frequencyConfig.yearlyMonth.includes(month)}
                              onChange={(e) => {
                                const currentMonths = formData.frequencyConfig.yearlyMonth;
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('yearlyMonth', [...currentMonths, month]);
                                } else {
                                  handleFrequencyConfigChange('yearlyMonth', currentMonths.filter((m: string) => m !== month));
                                }
                              }}
                            />
                            <span className="text-sm">{month}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.yearlyDate}
                        onChange={(e) => handleFrequencyConfigChange('yearlyDate', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Yearly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.yearlyTime}
                        onChange={(e) => handleFrequencyConfigChange('yearlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={handleCancelFrequencyConfig}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleSaveFrequencyConfig}
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTimelinePage;
