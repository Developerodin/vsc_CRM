"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import Seo from "@/shared/layout-components/seo/seo";

interface Task {
  id: string;
  teamMember: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  branch: {
    id: string;
    name: string;
    location?: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  timeline?: Array<{
    id: string;
    activity: string;
    client: string;
    status: string;
  }>;
  remarks?: string;
  status: 'pending' | 'ongoing' | 'completed' | 'on_hold' | 'cancelled' | 'delayed';
  metadata?: any;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    uploadedAt?: string; // Made optional since we don't send this in updates
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Branch {
  id: string;
  name: string;
  location?: string;
}

interface Activity {
  id: string;
  name: string;
  sortOrder: number;
  frequency?: string;
  frequencyConfig?: any;
  createdAt: string;
  updatedAt: string;
  subactivities?: Array<{
    _id: string;
    id: string;
    name: string;
    frequency?: string;
  }>;
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
  activities?: Array<{
    _id: string;
    activity: string;
    assignedDate: string;
    notes: string;
  }>;
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

// Interface for clean attachments (without _id and other problematic fields)
interface CleanAttachment {
  fileName: string;
  fileUrl: string;
}

interface Timeline {
  id: string;
  title: string;
  description: string;
  activity: {
    id: string;
    name: string;
  };
  subactivity?: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
  };
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  period?: string;
}

const EditTaskPage = () => {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [allFilteredTimelines, setAllFilteredTimelines] = useState<Timeline[]>([]); // Store all filtered timelines for client-side pagination
  const [selectedTimelines, setSelectedTimelines] = useState<Timeline[]>([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false);
  const [timelineSearchQuery, setTimelineSearchQuery] = useState("");
  const [timelineCurrentPage, setTimelineCurrentPage] = useState(1);
  const [timelineTotalPages, setTimelineTotalPages] = useState(1);
  const [timelineItemsPerPage, setTimelineItemsPerPage] = useState(10);
  const [timelineTotalResults, setTimelineTotalResults] = useState(0);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState("");
  const [teamMemberCurrentPage, setTeamMemberCurrentPage] = useState(1);
  const [teamMemberTotalPages, setTeamMemberTotalPages] = useState(1);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [attachments, setAttachments] = useState<CleanAttachment[]>([]);
  
  // New state for activity and group filters
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedSubActivity, setSelectedSubActivity] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  
  const [formData, setFormData] = useState({
    teamMember: "",
    startDate: "",
    endDate: "",
    priority: "medium",
    branch: "",
    assignedBy: "",
    timeline: [] as string[],
    remarks: "",
    status: "pending",
    metadata: {},
    attachments: [] as CleanAttachment[]
  });

  useEffect(() => {
    if (taskId) {
      fetchTask();
      fetchTeamMembers();
      fetchBranches();
      fetchActivities();
      fetchGroups();
    }
  }, [taskId]);

  // Refetch timelines when filters change
  useEffect(() => {
    if (showTimelineModal) {
      if (selectedActivity || selectedSubActivity || selectedGroup) {
        setTimelineCurrentPage(1);
        fetchTimelines(1, timelineSearchQuery);
      } else {
        // If no filters are selected, fetch all timelines
        fetchTimelines(1, "", true);
      }
    }
  }, [selectedActivity, selectedSubActivity, selectedGroup, showTimelineModal]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }
      
      const taskData: Task = await response.json();
      setTask(taskData);
      
      // Fetch full timeline details for currently selected timelines
      if (taskData.timeline && taskData.timeline.length > 0) {
        try {
          // Fetch full details for each timeline
          const timelinePromises = taskData.timeline.map(async (timelineRef) => {
            try {
              const response = await fetch(`${Base_url}timelines/${timelineRef.id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (response.ok) {
                const fullTimeline = await response.json();
                return fullTimeline;
              } else {
                // If individual timeline fetch fails, fetch activity and client names
                const [activityResponse, clientResponse] = await Promise.allSettled([
                  fetch(`${Base_url}activities/${timelineRef.activity}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  }),
                  fetch(`${Base_url}clients/${timelineRef.client}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  })
                ]);

                const activityName = activityResponse.status === 'fulfilled' && activityResponse.value.ok
                  ? (await activityResponse.value.json()).name || 'Unknown Activity'
                  : 'Unknown Activity';
                  
                const clientName = clientResponse.status === 'fulfilled' && clientResponse.value.ok
                  ? (await clientResponse.value.json()).name || 'Unknown Client'
                  : 'Unknown Client';

                return {
                  id: timelineRef.id,
                  title: `${activityName} - ${clientName}`,
                  description: '',
                  activity: { id: timelineRef.activity, name: activityName },
                  client: { id: timelineRef.client, name: clientName },
                  status: timelineRef.status,
                  priority: 'medium',
                  startDate: '',
                  endDate: ''
                };
              }
            } catch (error) {
              // Return basic timeline object as fallback - try to fetch activity and client names
              try {
                const [activityResponse, clientResponse] = await Promise.allSettled([
                  fetch(`${Base_url}activities/${timelineRef.activity}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  }),
                  fetch(`${Base_url}clients/${timelineRef.client}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  })
                ]);

                const activityName = activityResponse.status === 'fulfilled' && activityResponse.value.ok
                  ? (await activityResponse.value.json()).name || 'Unknown Activity'
                  : 'Unknown Activity';
                  
                const clientName = clientResponse.status === 'fulfilled' && clientResponse.value.ok
                  ? (await clientResponse.value.json()).name || 'Unknown Client'
                  : 'Unknown Client';

                return {
                  id: timelineRef.id,
                  title: `${activityName} - ${clientName}`,
                  description: '',
                  activity: { id: timelineRef.activity, name: activityName },
                  client: { id: timelineRef.client, name: clientName },
                  status: timelineRef.status,
                  priority: 'medium',
                  startDate: '',
                  endDate: ''
                };
              } catch (fallbackError) {
                return {
                  id: timelineRef.id,
                  title: `Timeline ${timelineRef.id.slice(-6)}`,
                  description: '',
                  activity: { id: timelineRef.activity, name: 'Unknown Activity' },
                  client: { id: timelineRef.client, name: 'Unknown Client' },
                  status: timelineRef.status,
                  priority: 'medium',
                  startDate: '',
                  endDate: ''
                };
              }
            }
          });
          
          const fullTimelines = await Promise.all(timelinePromises);
          setSelectedTimelines(fullTimelines.filter(Boolean)); // Filter out any null/undefined results
        } catch (error) {
          // Final fallback: create basic timeline objects from the data we have
          const basicTimelines = taskData.timeline.map(t => ({
            id: t.id,
            title: `Timeline ${t.id.slice(-6)}`,
            description: '',
            activity: { id: t.activity, name: 'Unknown Activity' },
            client: { id: t.client, name: 'Unknown Client' },
            status: t.status,
            priority: 'medium',
            startDate: '',
            endDate: ''
          }));
          setSelectedTimelines(basicTimelines);
        }
      }

      // Set selected team member
      if (taskData.teamMember) {
        setSelectedTeamMember(taskData.teamMember);
      }

      // Set existing attachments - clean them to remove _id fields
      if (taskData.attachments) {
        const cleanAttachments = taskData.attachments.map(attachment => ({
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl
          // Remove _id, uploadedAt, and other fields that might cause issues
        }));
        setAttachments(cleanAttachments);
      }
      
      setFormData({
        teamMember: taskData.teamMember?.id || "",
        startDate: taskData.startDate ? new Date(taskData.startDate).toISOString().split('T')[0] : "",
        endDate: taskData.endDate ? new Date(taskData.endDate).toISOString().split('T')[0] : "",
        priority: taskData.priority,
        branch: taskData.branch?.id || "",
        assignedBy: taskData.assignedBy?.id || "",
        timeline: taskData.timeline?.map(t => t.id) || [],
        remarks: taskData.remarks || "",
        status: taskData.status,
        metadata: taskData.metadata || {},
        attachments: taskData.attachments ? taskData.attachments.map(attachment => ({
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl
        })) : []
      });
    } catch (error) {
      toast.error('Failed to fetch task');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${Base_url}team-members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.results || []);
      }
    } catch (error) {
    }
  };

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
      setAllTeamMembers(data.results || []);
      const totalResults = data.totalResults || data.total || 0;
      const limit = 10;
      setTeamMemberTotalPages(Math.max(1, Math.ceil(totalResults / limit)));
      setTeamMemberCurrentPage(page);
    } catch (err) {
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${Base_url}branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.results || []);
      }
    } catch (error) {
    }
  };

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
      }
    } catch (error) {
      toast.error('Failed to fetch activities');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const response = await fetch(`${Base_url}groups`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.results || []);
      }
    } catch (error) {
      toast.error('Failed to fetch groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchTimelines = async (page: number = 1, searchQueryParam?: string, forceClearFilters: boolean = false) => {
    try {
      setIsLoadingTimelines(true);
      
      // Get activity name if activity filter is selected
      const selectedActivityData = selectedActivity && !forceClearFilters
        ? activities.find(a => a.id === selectedActivity)
        : null;
      const activityName = selectedActivityData?.name;
      
      // Get subactivity name if subactivity filter is selected
      const selectedSubActivityData = selectedSubActivity && selectedActivity && !forceClearFilters
        ? selectedActivityData?.subactivities?.find(sa => (sa._id || sa.id) === selectedSubActivity)
        : null;
      const subActivityName = selectedSubActivityData?.name;
      
      // Get group name if group filter is selected
      const selectedGroupData = selectedGroup && !forceClearFilters
        ? groups.find(g => g.id === selectedGroup)
        : null;
      const groupName = selectedGroupData?.name;
      
      // Build query parameters with proper pagination
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: timelineItemsPerPage.toString(),
        sortBy: activityName ? "activityName:asc" : "title:asc",
        ...((searchQueryParam || timelineSearchQuery) && { search: searchQueryParam || timelineSearchQuery })
      });

      // Add activity filter using activityName parameter
      if (activityName && !forceClearFilters) {
        queryParams.append('activityName', activityName);
      }

      // Add subactivity filter using subactivityName parameter
      if (subActivityName && !forceClearFilters) {
        queryParams.append('subactivityName', subActivityName);
      }

      // Add group filter using group parameter (backend API now supports it)
      if (groupName && !forceClearFilters) {
        queryParams.append('group', groupName);
      }

      const response = await fetch(`${Base_url}timelines?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timelines');
      }

      const data = await response.json();
      
      // Server-side pagination (backend handles filtering)
      setAllFilteredTimelines([]); // Clear stored filtered timelines
      setTimelines(data.results || []);
      setTimelineTotalResults(data.totalResults || 0);
      setTimelineTotalPages(data.totalPages || 1);
      setTimelineCurrentPage(page);
    } catch (err) {
      toast.error('Failed to fetch timelines');
    } finally {
      setIsLoadingTimelines(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimelineSelect = (timeline: Timeline) => {
    setSelectedTimelines(prev => {
      const isSelected = prev.some(t => t.id === timeline.id);
      if (isSelected) {
        return prev.filter(t => t.id !== timeline.id);
      } else {
        return [...prev, timeline];
      }
    });
  };

  const handleTimelineModalSubmit = () => {
    setFormData(prev => ({
      ...prev,
      timeline: selectedTimelines.map(timeline => timeline.id)
    }));
    setShowTimelineModal(false);
  };

  const handleTimelineSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setTimelineSearchQuery(query);
    if (showTimelineModal) {
      debouncedTimelineSearch(query);
    }
  };

  const handleTimelineSearchClick = () => {
    if (showTimelineModal) {
      setTimelineCurrentPage(1);
      fetchTimelines(1, timelineSearchQuery);
    }
  };

  const handleTimelinePageChange = (newPage: number) => {
    setTimelineCurrentPage(newPage);
    // Backend handles all filtering and pagination
    fetchTimelines(newPage, timelineSearchQuery);
  };

  // Filter change handlers
  const handleActivityFilterChange = (activityId: string) => {
    setSelectedActivity(activityId);
    setSelectedSubActivity(""); // Clear subactivity when activity changes
  };

  const handleSubActivityFilterChange = (subActivityId: string) => {
    setSelectedSubActivity(subActivityId);
  };

  const handleGroupFilterChange = (groupId: string) => {
    setSelectedGroup(groupId);
  };

  const clearFilters = () => {
    setSelectedActivity("");
    setSelectedSubActivity("");
    setSelectedGroup("");
    setTimelineSearchQuery("");
    setTimelineCurrentPage(1);
    // Force fetch all timelines without any filters
    fetchTimelines(1, "", true);
  };

  // Get paginated timelines for display
  // Backend handles all filtering and pagination, so just return the timelines
  const getPaginatedTimelines = () => {
    return timelines;
  };

  // Debounced search function for timelines
  const debouncedTimelineSearch = React.useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (searchQuery: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setTimelineCurrentPage(1);
          fetchTimelines(1, searchQuery);
        }, 500);
      };
    })(),
    []
  );

  // Team member selection handlers
  const handleTeamMemberSelect = (teamMember: TeamMember) => {
    setSelectedTeamMember(teamMember);
  };

  const handleTeamMemberModalSubmit = () => {
    if (selectedTeamMember) {
      setFormData(prev => ({
        ...prev,
        teamMember: selectedTeamMember.id
      }));
    }
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
  const debouncedTeamMemberSearch = React.useCallback(
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

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Reset progress for all files
      const initialProgress = uploadFiles.reduce((acc, file) => {
        acc[file.name] = 0;
        return acc;
      }, {} as Record<string, number>);
      setUploadProgress(initialProgress);

      const uploadPromises = uploadFiles.map(async (file) => {
        try {
          // Simulate progress for first upload step
          setUploadProgress(prev => ({ ...prev, [file.name]: 25 }));

          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          const response = await fetch(`${Base_url}common/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: uploadFormData
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          // Update progress to 50% after upload
          setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

          const uploadResult = await response.json();
          
          // Extract file data from the response
          const fileData = uploadResult.data || uploadResult;
          
          const attachmentData = {
            fileName: fileData.originalName || file.name,
            fileUrl: fileData.url
            // Only include fileName and fileUrl, no _id or other fields
          };

          // Update progress to 100%
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          return attachmentData;
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadResults.filter(Boolean) as Array<{fileName: string, fileUrl: string}>;
      
      // Add to attachments
      setAttachments(prev => [...prev, ...successfulUploads]);
      
      // Update form data - ensure all attachments are clean
      setFormData(prev => {
        const allAttachments = [...prev.attachments, ...successfulUploads];
        const cleanAttachments = allAttachments.map(attachment => ({
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl
        }));
        return {
          ...prev,
          attachments: cleanAttachments
        };
      });

      // Clear uploaded files
      setUploadFiles([]);
      setUploadProgress({});
      toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = prev.filter((_, i) => i !== index);
      // Ensure attachments are clean (no _id fields) when updating form data
      const cleanAttachments = newAttachments.map(attachment => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl
      }));
      setFormData(prevFormData => ({
        ...prevFormData,
        attachments: cleanAttachments
      }));
      return newAttachments;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamMember || !formData.startDate || !formData.endDate || !formData.branch) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    // For delayed tasks, only allow status change to completed
    if (task?.status === 'delayed' && formData.status !== 'completed') {
      toast.error('Delayed tasks can only be marked as completed', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      return;
    }

    setIsSaving(true);
    try {
      // Clean attachments data by removing _id fields
      const cleanAttachments = formData.attachments.map(attachment => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl
        // Remove _id, uploadedAt, and any other fields that might cause API errors
      }));

      // Create clean form data without problematic fields
      const cleanFormData: any = {
        ...formData,
        attachments: cleanAttachments
      };

      // For delayed tasks, only send status update
      if (task?.status === 'delayed') {
        cleanFormData.status = formData.status;
        // Remove other fields that shouldn't be updated for delayed tasks
        delete cleanFormData.teamMember;
        delete cleanFormData.startDate;
        delete cleanFormData.endDate;
        delete cleanFormData.priority;
        delete cleanFormData.branch;
        delete cleanFormData.assignedBy;
        delete cleanFormData.timeline;
        delete cleanFormData.remarks;
        delete cleanFormData.metadata;
        delete cleanFormData.attachments;
      }

      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cleanFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }

      toast.success(task?.status === 'delayed' ? 'Task marked as completed!' : 'Task updated successfully');
      router.push('/timelines');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="main-content">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium text-gray-600">Task not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Task" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Edit Task</h1>
            </div>
          </div>

          {/* Form */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Member */}
                  <div>
                    <label className="form-label">Team Member <span className="text-red-500">*</span></label>
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
                        {selectedTeamMember ? selectedTeamMember.name : "Select Team Member"}
                      </button>
                      {selectedTeamMember && (
                        <span className="text-sm text-gray-500">
                          {selectedTeamMember.email}
                        </span>
                      )}
                    </div>
                    {selectedTeamMember && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          {selectedTeamMember.name} ({selectedTeamMember.email})
                          <button
                            type="button"
                            className="ml-2 text-green-600 hover:text-green-800"
                            onClick={() => {
                              setSelectedTeamMember(null);
                              setFormData(prev => ({
                                ...prev,
                                teamMember: ""
                              }));
                            }}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="form-label">Branch <span className="text-red-500">*</span></label>
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} {branch.location && `(${branch.location})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="form-label">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="form-label">End Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="form-label">Status</label>
                    {task?.status === 'delayed' ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <i className="ri-information-line text-yellow-500 text-lg mr-2"></i>
                            <span className="text-sm text-yellow-800">
                              Delayed tasks can only be marked as completed
                            </span>
                          </div>
                        </div>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="delayed">Delayed</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    ) : (
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Related Timelines */}
                <div>
                  <label className="form-label">Related Timelines</label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary"
                      onClick={() => {
                        setShowTimelineModal(true);
                        setTimelineSearchQuery("");
                        setTimelineCurrentPage(1);
                        setSelectedActivity("");
                        setSelectedSubActivity("");
                        setSelectedGroup("");
                        // Fetch all timelines without filters initially
                        fetchTimelines(1, "", true);
                      }}
                    >
                      Select Timelines ({selectedTimelines.length} selected)
                    </button>
                    {selectedTimelines.length > 0 && (
                      <span className="text-sm text-gray-500">
                        {selectedTimelines.length} timeline{selectedTimelines.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                  </div>
                  {selectedTimelines.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTimelines.map(timeline => (
                        <span key={timeline.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          {timeline.title || `${timeline.activity?.name || 'Unknown Activity'}${timeline.subactivity?.name ? ` - ${timeline.subactivity.name}` : ''} - ${timeline.client?.name || 'Unknown Client'}${timeline.period ? ` (${timeline.period})` : ''}`}
                          <button
                            type="button"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              setSelectedTimelines(prev => prev.filter(t => t.id !== timeline.id));
                              setFormData(prev => ({
                                ...prev,
                                timeline: prev.timeline.filter(id => id !== timeline.id)
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

                {/* Remarks */}
                <div>
                  <label className="form-label">Remarks</label>
                  {task?.status === 'delayed' ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <i className="ri-information-line text-gray-500 text-lg mr-2"></i>
                          <span className="text-sm text-gray-600">
                            Remarks cannot be modified for delayed tasks
                          </span>
                        </div>
                      </div>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        rows={4}
                        className="form-control bg-gray-100"
                        placeholder="Remarks are locked for delayed tasks"
                        disabled
                        readOnly
                      />
                    </div>
                  ) : (
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      rows={4}
                      className="form-control"
                      placeholder="Enter task details, notes, or instructions..."
                    />
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <label className="form-label">Attachments</label>
                  
                  {/* File Upload Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="form-control"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
                      />
                      {uploadFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="ti-btn ti-btn-primary"
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            `Upload ${uploadFiles.length} file(s)`
                          )}
                        </button>
                      )}
                    </div>

                    {/* Files to Upload */}
                    {uploadFiles.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Files to Upload:</h4>
                        <div className="space-y-2">
                          {uploadFiles.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center space-x-3">
                                <i className="ri-file-text-line text-gray-500"></i>
                                <div>
                                  <div className="text-sm font-medium">{file.name}</div>
                                  <div className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {uploadProgress[file.name] !== undefined && (
                                  <div className="w-20">
                                    <div className="bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress[file.name]}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                  disabled={isUploading}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Attachments */}
                    {attachments.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-green-700 mb-3">Uploaded Attachments:</h4>
                        <div className="space-y-2">
                          {attachments.map((attachment, index) => (
                            <div key={`${attachment.fileName}-${index}`} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                              <div className="flex items-center space-x-3">
                                <i className="ri-file-check-line text-green-500"></i>
                                <div>
                                  <div className="text-sm font-medium">{attachment.fileName}</div>
                                  <a 
                                    href={attachment.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View File
                                  </a>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="ti-btn ti-btn-secondary"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSaving || (task?.status === 'delayed' && formData.status === 'delayed')}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : task?.status === 'delayed' ? (
                      <>
                        <i className="ri-check-line mr-2"></i>
                        Mark as Completed
                      </>
                    ) : (
                      'Update Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Selection Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Timelines</h2>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              {/* Activity, Subactivity and Group Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Activity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Activity
                  </label>
                  <select
                    className="form-select w-full"
                    value={selectedActivity}
                    onChange={(e) => handleActivityFilterChange(e.target.value)}
                  >
                    <option value="">All Activities</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subactivity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Sub Activity
                  </label>
                  <select
                    className="form-select w-full"
                    value={selectedSubActivity}
                    onChange={(e) => handleSubActivityFilterChange(e.target.value)}
                    disabled={!selectedActivity}
                  >
                    <option value="">All Sub Activities</option>
                    {selectedActivity && activities.find(a => a.id === selectedActivity)?.subactivities?.map((subActivity) => (
                      <option key={subActivity._id || subActivity.id} value={subActivity._id || subActivity.id}>
                        {subActivity.name}
                      </option>
                    ))}
                  </select>
                  {!selectedActivity && (
                    <p className="text-xs text-gray-500 mt-1">Select an activity first</p>
                  )}
                </div>

                {/* Group Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Group
                  </label>
                  <select
                    className="form-select w-full"
                    value={selectedGroup}
                    onChange={(e) => handleGroupFilterChange(e.target.value)}
                  >
                    <option value="">All Groups</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.numberOfClients} clients)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ti-btn ti-btn-secondary w-full"
                    disabled={!selectedActivity && !selectedSubActivity && !selectedGroup && !timelineSearchQuery}
                  >
                    <i className="ri-refresh-line me-2"></i>
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <div className="flex items-center">
                    <i className="ri-search-line text-gray-400 text-xl mr-3"></i>
                    <input
                      type="text"
                      placeholder="Search timelines by title, activity, or client..."
                      className="form-control py-4 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                      value={timelineSearchQuery}
                      onChange={handleTimelineSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTimelineSearchClick();
                        }
                      }}
                    />
                  </div>
                  <button 
                    className="absolute end-0 top-0 px-6 h-full bg-primary text-white hover:bg-primary-dark rounded-r-md"
                    onClick={handleTimelineSearchClick}
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {/* Active Filters Summary */}
              {(selectedActivity || selectedSubActivity || selectedGroup) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                      {selectedActivity && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Activity: {activities.find(a => a.id === selectedActivity)?.name}
                        </span>
                      )}
                      {selectedSubActivity && selectedActivity && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Sub Activity: {activities.find(a => a.id === selectedActivity)?.subactivities?.find(sa => (sa._id || sa.id) === selectedSubActivity)?.name}
                        </span>
                      )}
                      {selectedGroup && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Group: {groups.find(g => g.id === selectedGroup)?.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={clearFilters}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <i className="ri-close-line me-1"></i>
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {isLoadingTimelines ? (
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
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sub Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timelines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <i className="ri-search-line text-2xl text-gray-400"></i>
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No timelines found
                              </h3>
                              <p className="text-gray-500 text-center mb-4">
                                {selectedActivity || selectedGroup 
                                  ? "Try adjusting your filters or search criteria."
                                  : "No timelines available at the moment."
                                }
                              </p>
                              {(selectedActivity || selectedGroup) && (
                                <button
                                  onClick={clearFilters}
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-refresh-line me-2"></i>
                                  Clear Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        getPaginatedTimelines().map((timeline) => (
                          <tr key={timeline.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-primary"
                                checked={selectedTimelines.some(t => t.id === timeline.id)}
                                onChange={() => handleTimelineSelect(timeline)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{timeline.activity?.name || 'Unknown Activity'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{timeline.subactivity?.name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{timeline.client?.name || 'Unknown Client'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{timeline.period || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                timeline.status === 'completed' ? 'bg-green-100 text-green-800' :
                                timeline.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                timeline.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {timeline.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                timeline.priority === 'high' ? 'bg-red-100 text-red-800' :
                                timeline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {timeline.priority}
                              </span>
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
                <div className="flex items-center mr-4">
                  <label className="mr-2 text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={timelineItemsPerPage}
                    onChange={(e) => {
                      const newItemsPerPage = Number(e.target.value);
                      setTimelineItemsPerPage(newItemsPerPage);
                      setTimelineCurrentPage(1);
                      fetchTimelines(1, timelineSearchQuery);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <button
                  onClick={() => handleTimelinePageChange(Math.max(timelineCurrentPage - 1, 1))}
                  disabled={timelineCurrentPage === 1 || timelines.length === 0}
                  className="ti-btn ti-btn-secondary"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {timelineTotalResults > 0 ? (
                    `Showing ${(timelineCurrentPage - 1) * timelineItemsPerPage + 1} to ${Math.min(timelineCurrentPage * timelineItemsPerPage, timelineTotalResults)} of ${timelineTotalResults} entries`
                  ) : (
                    "No results"
                  )}
                </span>
                <button
                  onClick={() => handleTimelinePageChange(Math.min(timelineCurrentPage + 1, timelineTotalPages))}
                  disabled={timelineCurrentPage === timelineTotalPages || timelineTotalPages === 0 || timelines.length === 0}
                  className="ti-btn ti-btn-secondary"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="ti-btn ti-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTimelineModalSubmit}
                  className="ti-btn ti-btn-primary"
                >
                  Select ({selectedTimelines.length})
                </button>
              </div>
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
                      {allTeamMembers.map((teamMember) => (
                        <tr key={teamMember.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="radio"
                              name="teamMemberSelection"
                              className="form-radio h-5 w-5 text-primary"
                              checked={selectedTeamMember?.id === teamMember.id}
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
                      ))}
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
                  disabled={!selectedTeamMember}
                >
                  Select {selectedTeamMember ? `(${selectedTeamMember.name})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTaskPage;
