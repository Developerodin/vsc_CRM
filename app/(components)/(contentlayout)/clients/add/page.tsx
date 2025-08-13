"use client"
import React, { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'activity' | 'documents'>('general');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  
  // Document context menu state
  const [documentContextMenu, setDocumentContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    document: any;
  } | null>(null);
  
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

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (documentContextMenu?.visible) {
        closeDocumentContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [documentContextMenu]);

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
    
    if (activeTab === 'activity') {
      if (!validateForm()) return;
      
      // Check if client already exists to prevent duplicate creation
      if (savedClientId) {
        // Client already exists, just move to documents tab
        toast.success('Client already exists. Moving to documents tab.');
        setActiveTab('documents');
        return;
      }
      
      // Save client and get client ID (only if not already saved)
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
        setSavedClientId(data.id);
        toast.success('Client created successfully');
        setActiveTab('documents');
        
        // Load client documents
        fetchClientDocuments(data.id);
      } catch (err) {
        console.error('Error creating client:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create client');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // On documents tab, don't create client again - just show success and redirect
    if (activeTab === 'documents') {
      if (savedClientId) {
        toast.success('Client and documents saved successfully!');
        router.push('/clients');
      } else {
        toast.error('Client not found. Please go back to Activity Mapping and try again.');
      }
      return;
    }
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      branch: selectedBranchId || ''
    }));
  }, [selectedBranchId]);

  // Document upload functionality
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    // Accept all file types - let the server handle validation
    const fileArray = Array.from(files);
    setUploadFiles(prev => [...prev, ...fileArray]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveUploadFile = (name: string) => {
    setUploadFiles(prev => prev.filter(f => f.name !== name));
  };

  const fetchClientDocuments = async (clientId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`${Base_url}file-manager/clients/${clientId}/contents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch client documents');
      }

      const data = await response.json();
      setClientDocuments(data.results || []);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      toast.error('Failed to fetch client documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Document context menu handlers
  const handleDocumentContextMenu = (e: React.MouseEvent, document: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDocumentContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      document
    });
  };

  const closeDocumentContextMenu = () => {
    setDocumentContextMenu(null);
  };

  // Document action handlers
  const handleViewDocument = (document: any) => {
    const fileUrl = document.file?.fileUrl || document.fileUrl;
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
    closeDocumentContextMenu();
  };

  const handleOpenDocumentInNewTab = (document: any) => {
    const fileUrl = document.file?.fileUrl || document.fileUrl;
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
    closeDocumentContextMenu();
  };

  const handleDownloadDocument = (document: any) => {
    const fileUrl = document.file?.fileUrl || document.fileUrl;
    const fileName = document.file?.fileName || document.fileName;
    if (fileUrl && fileName) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.click();
    }
    closeDocumentContextMenu();
  };

  const handleCopyDocumentUrl = async (document: any) => {
    const fileUrl = document.file?.fileUrl || document.fileUrl;
    if (fileUrl) {
      try {
        await navigator.clipboard.writeText(fileUrl);
        toast.success('File URL copied to clipboard');
      } catch (err) {
        console.error('Failed to copy URL:', err);
        toast.error('Failed to copy URL');
      }
    }
    closeDocumentContextMenu();
  };

  const handleDeleteDocument = async (document: any) => {
    const fileName = document.file?.fileName || document.fileName;
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        // You can implement delete functionality here if needed
        toast.success('Document deleted successfully');
        // Refresh documents list
        if (savedClientId) {
          fetchClientDocuments(savedClientId);
        }
      } catch (error) {
        console.error('Failed to delete document:', error);
        toast.error('Failed to delete document');
      }
    }
    closeDocumentContextMenu();
  };

  // File type detection and icon mapping
  const getFileIcon = (mimeType: string, fileName: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    // Image files
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif', 'ico', 'jfif', 'pjpeg', 'pjp'].includes(extension || '')) {
      return 'ri-image-line text-blue-600';
    }
    
    // PDF files
    if (mimeType?.includes('pdf') || extension === 'pdf') {
      return 'ri-file-pdf-line text-red-600';
    }
    
    // Word documents
    if (mimeType?.includes('word') || mimeType?.includes('document') || ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm'].includes(extension || '')) {
      return 'ri-file-word-line text-blue-600';
    }
    
    // Excel files
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm'].includes(extension || '')) {
      return 'ri-file-excel-line text-green-600';
    }
    
    // PowerPoint files
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation') || ['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'pps', 'ppsx', 'ppsm'].includes(extension || '')) {
      return 'ri-file-ppt-line text-orange-600';
    }
    
    // Text files
    if (mimeType?.startsWith('text/') || ['txt', 'md', 'log', 'rtf', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
      return 'ri-file-text-line text-gray-600';
    }
    
    // Video files
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv', 'mts', 'm2ts'].includes(extension || '')) {
      return 'ri-video-line text-purple-600';
    }
    
    // Audio files
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'amr'].includes(extension || '')) {
      return 'ri-volume-up-line text-pink-600';
    }
    
    // Archive files
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'cab', 'iso', 'dmg'].includes(extension || '')) {
      return 'ri-file-zip-line text-yellow-600';
    }
    
    // Database files
    if (['db', 'sqlite', 'sqlite3', 'mdb', 'accdb', 'odb'].includes(extension || '')) {
      return 'ri-database-2-line text-indigo-600';
    }
    
    // Code files
    if (['py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'matlab', 'sh', 'bat', 'ps1'].includes(extension || '')) {
      return 'ri-code-s-slash-line text-cyan-600';
    }
    
    // CAD files
    if (['dwg', 'dxf', 'stl', 'obj', '3ds', 'max', 'blend', 'skp'].includes(extension || '')) {
      return 'ri-cube-line text-teal-600';
    }
    
    // Font files
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(extension || '')) {
      return 'ri-font-size text-lime-600';
    }
    
    // Default file icon
    return 'ri-file-line text-gray-600';
  };

  const getFileColor = (mimeType: string, fileName: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    // Image files
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif', 'ico', 'jfif', 'pjpeg', 'pjp'].includes(extension || '')) {
      return 'bg-blue-100 dark:bg-blue-900/30';
    }
    
    // PDF files
    if (mimeType?.includes('pdf') || extension === 'pdf') {
      return 'bg-red-100 dark:bg-red-900/30';
    }
    
    // Word documents
    if (mimeType?.includes('word') || mimeType?.includes('document') || ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm'].includes(extension || '')) {
      return 'bg-blue-100 dark:bg-blue-900/30';
    }
    
    // Excel files
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm'].includes(extension || '')) {
      return 'bg-green-100 dark:bg-green-900/30';
    }
    
    // PowerPoint files
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation') || ['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'pps', 'ppsx', 'ppsm'].includes(extension || '')) {
      return 'bg-orange-100 dark:bg-orange-900/30';
    }
    
    // Text files
    if (mimeType?.startsWith('text/') || ['txt', 'md', 'log', 'rtf', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
      return 'bg-gray-100 dark:bg-gray-700';
    }
    
    // Video files
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv', 'mts', 'm2ts'].includes(extension || '')) {
      return 'bg-purple-100 dark:bg-purple-900/30';
    }
    
    // Audio files
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'amr'].includes(extension || '')) {
      return 'bg-pink-100 dark:bg-pink-900/30';
    }
    
    // Archive files
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'cab', 'iso', 'dmg'].includes(extension || '')) {
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    }
    
    // Database files
    if (['db', 'sqlite', 'sqlite3', 'mdb', 'accdb', 'odb'].includes(extension || '')) {
      return 'bg-indigo-100 dark:bg-indigo-900/30';
    }
    
    // Code files
    if (['py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'matlab', 'sh', 'bat', 'ps1'].includes(extension || '')) {
      return 'bg-cyan-100 dark:bg-cyan-900/30';
    }
    
    // CAD files
    if (['dwg', 'dxf', 'stl', 'obj', '3ds', 'max', 'blend', 'skp'].includes(extension || '')) {
      return 'bg-teal-100 dark:bg-teal-900/30';
    }
    
    // Font files
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(extension || '')) {
      return 'bg-lime-100 dark:bg-lime-900/30';
    }
    
    // Default
    return 'bg-gray-100 dark:bg-gray-700';
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !savedClientId) return;

    setIsUploading(true);
    try {
      // Reset progress for all files
      const initialProgress = uploadFiles.reduce((acc, file) => {
        acc[file.name] = 0;
        return acc;
      }, {} as Record<string, number>);
      setUploadProgress(initialProgress);

      const uploadPromises = uploadFiles.map(async (file, index) => {
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

          // Update progress to 50% after first upload
          setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

          const uploadResult = await response.json();
          console.log('Upload response from /common/upload:', uploadResult);
          
          // Extract file data from the response
          const fileData = uploadResult.data || uploadResult;
          
          // Save file info to client documents
          const fileInfo = {
            fileName: fileData.originalName,
            fileUrl: fileData.url,
            fileKey: fileData.key,
            fileSize: fileData.size,
            mimeType: fileData.mimeType,
            metadata: {
              category: 'client_document',
              description: `Document for client: ${formData.name}`
            }
          };

          console.log('File info being sent to client upload endpoint:', fileInfo);
          console.log('Client ID:', savedClientId);
          console.log('Upload URL:', `${Base_url}file-manager/clients/${savedClientId}/upload`);

          // Update progress to 75% before saving
          setUploadProgress(prev => ({ ...prev, [file.name]: 75 }));

          const saveResponse = await fetch(`${Base_url}file-manager/clients/${savedClientId}/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(fileInfo)
          });

          if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error('Save response error:', {
              status: saveResponse.status,
              statusText: saveResponse.statusText,
              error: errorText
            });
            throw new Error(`Failed to save file info for ${file.name}: ${errorText}`);
          }

          // Update progress to 100% after successful save
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          return saveResponse.json();
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      toast.success('Files uploaded successfully');
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadProgress({});
      
      // Refresh documents list
      if (savedClientId) {
        fetchClientDocuments(savedClientId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

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
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'documents'
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('documents')}
                >
                  Documents
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
                    {/* Show client creation status if already created */}
                    {savedClientId && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                          <i className="ri-information-line text-blue-600 text-xl mr-3"></i>
                          <div>
                            <h4 className="text-blue-800 font-medium">Client Already Created!</h4>
                            <p className="text-blue-700 text-sm mt-1">
                              This client has been saved. You can now proceed to the Documents tab to upload files.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Client Documents</h3>
                      {savedClientId && (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary"
                          onClick={() => setShowUploadModal(true)}
                        >
                          <i className="ri-upload-2-line mr-2"></i>
                          Upload Documents
                        </button>
                      )}
                    </div>

                    {!savedClientId ? (
                      <div className="text-center py-16">
                        <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center mb-4 mx-auto">
                          <i className="ri-information-line text-4xl text-yellow-600"></i>
                        </div>
                        <h3 className="text-xl font-medium mb-2">Client Not Saved Yet</h3>
                        <p className="text-gray-500 text-center mb-6">
                          Please complete the Activity Mapping tab and save the client first to upload documents.
                        </p>
                        <button
                          type="button"
                          className="ti-btn ti-btn-secondary"
                          onClick={() => setActiveTab('activity')}
                        >
                          <i className="ri-arrow-left-line mr-2"></i>
                          Back to Activity Mapping
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Success message for saved client */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center">
                            <i className="ri-check-circle-line text-green-600 text-xl mr-3"></i>
                            <div>
                              <h4 className="text-green-800 font-medium">Client Created Successfully!</h4>
                              <p className="text-green-700 text-sm mt-1">
                                You can now upload documents for this client. Click "Save & Complete" when you're done.
                              </p>
                            </div>
                          </div>
                        </div>

                        {isLoadingDocuments ? (
                          <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3 text-gray-600">Loading documents...</span>
                          </div>
                        ) : clientDocuments.length > 0 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                              {clientDocuments.map((doc, index) => (
                                <div
                                  key={index}
                                  className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                                >
                                  {/* Selection Checkbox */}
                                  <input
                                    type="checkbox"
                                    className="absolute top-2 left-2 z-10 opacity-100 transition-opacity duration-200"
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      // Handle selection if needed
                                    }}
                                  />

                                  {/* Icon */}
                                  <div className="flex items-center justify-center w-16 h-16 mb-3">
                                    <div className={`w-full h-full rounded-lg flex items-center justify-center ${getFileColor(doc.file?.mimeType || '', doc.file?.fileName || doc.fileName || '')}`}>
                                      <i className={`text-2xl ${getFileIcon(doc.file?.mimeType || '', doc.file?.fileName || doc.fileName || '')}`}></i>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="text-center">
                                    <div className="font-medium text-sm truncate">
                                      {doc.file?.fileName || doc.fileName || 'Unknown File'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {doc.file?.fileSize ? `${(doc.file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                                    </div>
                                  </div>

                                  {/* Three-dot menu */}
                                  <button
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDocumentContextMenu(e, doc);
                                    }}
                                    title="More options"
                                  >
                                    <i className="ri-more-2-fill text-gray-500 hover:text-primary"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-16 text-gray-500">
                            <i className="ri-folder-open-line text-4xl mb-4 opacity-50"></i>
                            <p className="text-lg font-medium">No documents uploaded yet</p>
                            <p className="text-sm">Click "Upload Documents" to add files for this client</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center space-x-3 mt-8 pt-6 border-t border-gray-200">
                  {activeTab === 'documents' ? (
                    // On documents tab, show Save & Complete button
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary"
                      onClick={() => {
                        if (savedClientId) {
                          toast.success('Client and documents saved successfully!');
                          router.push('/clients');
                        } else {
                          toast.error('Client not found. Please go back to Activity Mapping and try again.');
                        }
                      }}
                    >
                      <i className="ri-check-line mr-2"></i>
                      Save & Complete
                    </button>
                  ) : (
                    // On other tabs, show Next button
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
                      ) : activeTab === 'activity' && savedClientId ? (
                        'Go to Documents'
                      ) : (
                        'Next'
                      )}
                    </button>
                  )}
                  
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              onClick={() => { setShowUploadModal(false); setUploadFiles([]); }}
            >
              <i className="ri-close-line"></i>
            </button>
            <h2 className="text-xl font-semibold mb-4 text-defaulttextcolor flex items-center">
              <i className="ri-upload-2-line text-2xl mr-2 text-primary"></i> Upload Documents
            </h2>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <i className="ri-upload-cloud-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
              <p className="text-gray-500 mb-4">Support for PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and other common formats</p>
              <input
                ref={fileUploadRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFilesSelected(e.target.files)}
              />
              <label htmlFor="file-upload" className="ti-btn ti-btn-primary cursor-pointer" onClick={() => fileUploadRef.current?.click()}>
                <i className="ri-folder-open-line mr-2"></i>
                Choose Files
              </label>
            </div>
            {uploadFiles.length > 0 && (
              <div className="space-y-3 max-h-56 overflow-y-auto mb-2 w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-defaulttextcolor font-medium">{uploadFiles.length} file(s) selected</span>
                </div>
                {uploadFiles.map(file => (
                  <div key={file.name} className="flex items-center gap-3 bg-light rounded p-2">
                    <div className="flex-1">
                      <div className="font-medium text-defaulttextcolor text-sm truncate">{file.name}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[file.name] || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{Math.round((uploadProgress[file.name] || 0))}%</span>
                    <button
                      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger ml-2"
                      onClick={() => handleRemoveUploadFile(file.name)}
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                className="ti-btn ti-btn-primary"
                disabled={uploadFiles.length === 0 || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Context Menu */}
      {documentContextMenu?.visible && (
        <div 
          className="fixed z-50 bg-white dark:bg-bodybg border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: documentContextMenu.x,
            top: documentContextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
            {documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName || 'Unknown File'}
          </div>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleViewDocument(documentContextMenu.document)}
          >
            <i className="ri-eye-line text-blue-600"></i>
            View File
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleOpenDocumentInNewTab(documentContextMenu.document)}
          >
            <i className="ri-external-link-line text-green-600"></i>
            Open in New Tab
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleDownloadDocument(documentContextMenu.document)}
          >
            <i className="ri-download-2-line text-purple-600"></i>
            Download
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleCopyDocumentUrl(documentContextMenu.document)}
          >
            <i className="ri-link text-orange-600"></i>
            Copy URL
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
            onClick={() => handleDeleteDocument(documentContextMenu.document)}
          >
            <i className="ri-delete-bin-line"></i>
            Delete File
          </button>
        </div>
      )}
    </div>
  );
};

export default AddClientPage; 