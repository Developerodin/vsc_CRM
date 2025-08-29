"use client";
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';
import { useBranchContext } from "@/shared/contextapi";
import StateSelectionModal from '@/app/(components)/StateSelectionModal';

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
  gstNumbers: GstNumber[];
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  activities: ActivityMapping[];
  groups?: string[]; // Array of group IDs
  createdAt: string;
  updatedAt: string;
}

interface GstNumber {
  _id?: string;
  state: string;
  gstNumber: string;
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

interface Group {
  id: string;
  name: string;
  numberOfClients: number;
  clients: string[];
  branch: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityMapping {
  activity: string;
  notes: string;
  status: string;
  assignedDate?: string;
}

const EditClientPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const { branches } = useBranchContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'activity' | 'group' | 'documents'>('general');
  
  // States for activities and team members
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  
  // States for activity mappings
  const [activityMappings, setActivityMappings] = useState<ActivityMapping[]>([
    {
      activity: '',
      notes: '',
      status: 'active',
      assignedDate: new Date().toISOString()
    }
  ]);

  // States for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingClientGroups, setIsLoadingClientGroups] = useState(false);
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const [groupTotalPages, setGroupTotalPages] = useState(1);

  // States for modals
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number>(-1);
  const [selectedTeamMemberIndex, setSelectedTeamMemberIndex] = useState<number>(-1);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  
  // States for documents
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Document context menu state
  const [documentContextMenu, setDocumentContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    document: any;
  } | null>(null);
  
  // Email sending state
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  
  // Download operation state
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
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
    branch: '',
    sortOrder: 1,
    businessType: '',
    gstNumbers: [] as GstNumber[],
    tanNumber: '',
    cinNumber: '',
    udyamNumber: '',
    iecCode: '',
    entityType: '',
  });

  const [gstNumbers, setGstNumbers] = useState<GstNumber[]>([
    {
      state: '',
      gstNumber: ''
    }
  ]);

  // Add these state variables after the existing useState declarations (around line 80)
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [showEntityTypeModal, setShowEntityTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<Array<{id: string, name: string}>>([]);
  const [entityTypes, setEntityTypes] = useState<Array<{id: string, name: string}>>([]);
  const [businessTypeSearch, setBusinessTypeSearch] = useState("");
  const [entityTypeSearch, setEntityTypeSearch] = useState("");
  const [businessTypePage, setBusinessTypePage] = useState(1);
  const [entityTypePage, setEntityTypePage] = useState(1);
  const [businessTypeTotalPages, setBusinessTypeTotalPages] = useState(1);
  const [entityTypeTotalPages, setEntityTypeTotalPages] = useState(1);
  const [businessTypeLoading, setBusinessTypeLoading] = useState(false);
  const [entityTypeLoading, setEntityTypeLoading] = useState(false);
  const [selectedStateIndex, setSelectedStateIndex] = useState<number>(-1);

  // Fetch activities
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

  // Fetch team members
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

  // Fetch groups
  const fetchGroups = async (page: number = 1, searchQueryParam?: string) => {
    try {
      setIsLoadingGroups(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy: "name:asc",
        ...((searchQueryParam || groupSearchQuery) && { name: searchQueryParam || groupSearchQuery })
      });

      const response = await fetch(`${Base_url}groups?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data.results || []);
      setFilteredGroups(data.results || []);
      const totalResults = data.totalResults || data.total || 0;
      const limit = 10;
      setGroupTotalPages(Math.max(1, Math.ceil(totalResults / limit)));
      setGroupCurrentPage(page);
    } catch (err) {
      console.error('Error fetching groups:', err);
      toast.error('Failed to fetch groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Fetch client's existing groups
  const fetchClientGroups = async (clientId: string) => {
    try {
      setIsLoadingClientGroups(true);
      // First try to get groups from the client data itself
      const response = await fetch(`${Base_url}clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const clientData = await response.json();
        if (clientData.groups && Array.isArray(clientData.groups) && clientData.groups.length > 0) {
          // If client has group IDs, fetch the full group details
          const groupPromises = clientData.groups.map(async (groupId: string) => {
            try {
              const groupResponse = await fetch(`${Base_url}groups/${groupId}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (groupResponse.ok) {
                return await groupResponse.json();
              }
              return null;
            } catch (error) {
              console.error(`Error fetching group ${groupId}:`, error);
              return null;
            }
          });
          
          const groupResults = await Promise.all(groupPromises);
          const validGroups = groupResults.filter(group => group !== null);
          setSelectedGroups(validGroups);
        }
      }
    } catch (error) {
      console.error('Error fetching client groups:', error);
      // If the endpoint doesn't exist, we'll handle it gracefully
    } finally {
      setIsLoadingClientGroups(false);
    }
  };

  // Fetch business types
  const fetchBusinessTypes = async (page = 1, search = "") => {
    setBusinessTypeLoading(true);
    try {
      console.log('Fetching business types...', { page, search });
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        name: search,
        sortBy: 'name:asc'
      });

      const url = `${Base_url}business-master?${queryParams}`;
      console.log('API URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch business types: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      
      if (data && data.results && Array.isArray(data.results)) {
        setBusinessTypes(data.results);
        setBusinessTypeTotalPages(data.totalPages || 1);
        console.log('Business types set:', data.results);
      } else {
        console.error('Invalid data structure:', data);
        // Fallback to some default business types if API fails
        setBusinessTypes([
          { id: '1', name: 'Information Technology' },
          { id: '2', name: 'Manufacturing' },
          { id: '3', name: 'Banking' },
          { id: '4', name: 'Insurance' },
          { id: '5', name: 'Construction' }
        ]);
        setBusinessTypeTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching business types:', err);
      toast.error(`Failed to fetch business types: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to default business types on error
      setBusinessTypes([
        { id: '1', name: 'Information Technology' },
        { id: '2', name: 'Manufacturing' },
        { id: '3', name: 'Banking' },
        { id: '4', name: 'Insurance' },
        { id: '5', name: 'Construction' }
      ]);
      setBusinessTypeTotalPages(1);
    } finally {
      setBusinessTypeLoading(false);
    }
  };

  // Fetch entity types
  const fetchEntityTypes = async (page = 1, search = "") => {
    setEntityTypeLoading(true);
    try {
      console.log('Fetching entity types...', { page, search });
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        name: search,
        sortBy: 'name:asc'
      });

      const url = `${Base_url}entity-master?${queryParams}`;
      console.log('API URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch entity types: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      
      if (data && data.results && Array.isArray(data.results)) {
        setEntityTypes(data.results);
        setEntityTypeTotalPages(data.totalPages || 1);
        console.log('Entity types set:', data.results);
      } else {
        console.error('Invalid data structure:', data);
        // Fallback to some default entity types if API fails
        setEntityTypes([
          { id: '1', name: 'Private Limited' },
          { id: '2', name: 'Public Limited' },
          { id: '3', name: 'Partnership' },
          { id: '4', name: 'Proprietorship' },
          { id: '5', name: 'LLP' }
        ]);
        setEntityTypeTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching entity types:', err);
      toast.error(`Failed to fetch entity types: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to default entity types on error
      setEntityTypes([
        { id: '1', name: 'Private Limited' },
        { id: '2', name: 'Public Limited' },
        { id: '3', name: 'Partnership' },
        { id: '4', name: 'Proprietorship' },
        { id: '5', name: 'LLP' }
      ]);
      setEntityTypeTotalPages(1);
    } finally {
      setEntityTypeLoading(false);
    }
  };

  // Handle business type selection
  const handleBusinessTypeSelect = (businessType: {id: string, name: string}) => {
    setFormData(prev => ({
      ...prev,
      businessType: businessType.name
    }));
    setShowBusinessTypeModal(false);
  };

  // Handle entity type selection
  const handleEntityTypeSelect = (entityType: {id: string, name: string}) => {
    setFormData(prev => ({
      ...prev,
      entityType: entityType.name
    }));
    setShowEntityTypeModal(false);
  };

  const openStateModal = (gstIndex: number) => {
    setSelectedStateIndex(gstIndex);
    setShowStateModal(true);
  };

  const handleStateSelect = (state: string) => {
    if (selectedStateIndex >= 0) {
      const updatedGstNumbers = [...gstNumbers];
      updatedGstNumbers[selectedStateIndex] = {
        ...updatedGstNumbers[selectedStateIndex],
        state: state
      };
      setGstNumbers(updatedGstNumbers);
    }
    setShowStateModal(false);
    setSelectedStateIndex(-1);
  };

  useEffect(() => {
    fetchActivities();
    fetchTeamMembers();
    fetchGroups();
  }, []);

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

  useEffect(() => {
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [groups, groupSearchQuery]);

  // Document functions
  const handleFilesSelected = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveUploadFile = (name: string) => {
    setUploadFiles(prev => prev.filter(file => file.name !== name));
  };

  const fetchClientDocuments = async (clientId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`${Base_url}file-manager/clients/${clientId}/contents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClientDocuments(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching client documents:', error);
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



  const handleDownloadDocument = (docItem: any) => {
    const fileUrl = docItem.file?.fileUrl || docItem.fileUrl;
    const fileName = docItem.file?.fileName || docItem.fileName;
    
    if (!fileUrl || !fileName) {
      console.error('File URL or name is missing');
      toast.error('File information is missing');
      return;
    }

    setDownloadingFile(fileName);
    
    try {
      // Create a more robust download approach (exact copy from file manager)
      const link = document.createElement('a');
      link.style.display = 'none'; // Hide the link
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      
      // Always add download parameters to force download behavior
      const url = new URL(fileUrl);
      url.searchParams.set('download', 'true');
      url.searchParams.set('t', Date.now().toString());
      url.searchParams.set('filename', encodeURIComponent(fileName));
      link.href = url.toString();
      
      // Set additional attributes to force download
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_self'); // Force same window behavior
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Downloading: ${fileName} from ${link.href}`);
      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
    
    closeDocumentContextMenu();
  };



  const handleDeleteDocument = async (docItem: any) => {
    const fileName = docItem.file?.fileName || docItem.fileName;
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        // You can implement delete functionality here if needed
        toast.success('Document deleted successfully');
        // Refresh documents list
        fetchClientDocuments(params.id);
      } catch (error) {
        console.error('Failed to delete document:', error);
        toast.error('Failed to delete document');
      }
    }
    closeDocumentContextMenu();
  };

  // Send file to client email
  const sendFileToEmail = async (docItem: any) => {
    if (!formData.email) {
      toast.error('Client email not found. Please fill in the client email first.');
      closeDocumentContextMenu();
      return;
    }

    setSendingEmail(docItem.file?.fileName || docItem.fileName);
    try {
      const requestBody = {
        to: formData.email,
        subject: `File: ${docItem.file?.fileName || docItem.fileName}`,
        text: `Please find the attached file: ${docItem.file?.fileName || docItem.fileName}`,
        description: `File sent from Client Edit Page: ${docItem.file?.fileName || docItem.fileName}`,
        attachments: [
          {
            url: docItem.file?.fileUrl || docItem.fileUrl,
            filename: docItem.file?.fileName || docItem.fileName,
            contentType: docItem.file?.mimeType || docItem.mimeType || 'application/octet-stream'
          }
        ]
      };

      console.log('Sending email with data:', requestBody);
      console.log('Email will be sent to:', formData.email);

      const response = await fetch(`${Base_url}common-email/send-with-attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
      
      toast.success(`File "${docItem.file?.fileName || docItem.fileName}" sent to ${formData.email} successfully!`);
      closeDocumentContextMenu();
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingEmail(null);
    }
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
    if (uploadFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress({});

      const uploadPromises = uploadFiles.map(async (file) => {
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
            description: `Document for client: ${formData.name || 'Client'}`
          }
        };

        console.log('File info being sent to client upload endpoint:', fileInfo);
        console.log('Client ID:', params.id);
        console.log('Upload URL:', `${Base_url}file-manager/clients/${params.id}/upload`);

        const saveResponse = await fetch(`${Base_url}file-manager/clients/${params.id}/upload`, {
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

        return saveResponse.json();
      });

      await Promise.all(uploadPromises);
      toast.success('Files uploaded successfully');
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadProgress({});
      
      // Refresh documents list
      fetchClientDocuments(params.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`${Base_url}clients/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }

        const data: Client = await response.json();
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          email2: data.email2 || '',
          address: data.address || '',
          district: data.district || '',
          state: data.state || '',
          country: data.country || '',
          fNo: data.fNo || '',
          pan: data.pan || '',
          dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
          branch: data.branch || '',
          sortOrder: data.sortOrder || 1,
          businessType: data.businessType || '',
          gstNumbers: data.gstNumbers || [],
          tanNumber: data.tanNumber || '',
          cinNumber: data.cinNumber || '',
          udyamNumber: data.udyamNumber || '',
          iecCode: data.iecCode || '',
          entityType: data.entityType || '',
        });

        // Set activity mappings if they exist
        if (data.activities && data.activities.length > 0) {
          setActivityMappings(data.activities);
        }
        
        // Set GST numbers if they exist
        if (data.gstNumbers && data.gstNumbers.length > 0) {
          setGstNumbers(data.gstNumbers);
        }
        
        // Set selected groups if they exist
        if (data.groups && data.groups.length > 0) {
          // Fetch the full group details to display them
          fetchClientGroups(params.id);
        }
        
        // Fetch client documents
        fetchClientDocuments(params.id);
      } catch (err) {
        console.error('Error fetching client:', err);
        toast.error('Failed to fetch client details');
        router.push('/clients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [params.id, router]);

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
        notes: '',
        status: 'active',
        assignedDate: new Date().toISOString()
      }
    ]);
  };

  const removeActivityMapping = (index: number) => {
    if (activityMappings.length > 1) {
      const updatedMappings = activityMappings.filter((_, i) => i !== index);
      setActivityMappings(updatedMappings);
    }
  };

  const openActivityModal = (index: number) => {
    setSelectedActivityIndex(index);
    setActivitySearchQuery('');
    setShowActivityModal(true);
  };

  const openTeamMemberModal = (index: number) => {
    setSelectedTeamMemberIndex(index);
    setTeamMemberSearchQuery('');
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
        // Note: assignedTeamMember is not part of ActivityMapping interface
        // If you need to assign team members, you'll need to extend the interface
      };
      setActivityMappings(updatedMappings);
    }
    setShowTeamMemberModal(false);
    setSelectedTeamMemberIndex(-1);
  };

  // Group selection functions
  const openGroupModal = () => {
    setGroupSearchQuery('');
    setGroupCurrentPage(1);
    fetchGroups(1);
    setShowGroupModal(true);
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroups(prev => {
      const isSelected = prev.some(g => g.id === group.id);
      if (isSelected) {
        return prev.filter(g => g.id !== group.id);
      } else {
        return [...prev, group];
      }
    });
  };

  const handleGroupModalSubmit = () => {
    setShowGroupModal(false);
    if (selectedGroups.length > 0) {
      toast.success(`${selectedGroups.length} group(s) assigned to client`);
    }
  };

  const removeGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.filter(g => g.id !== groupId));
    toast.success('Group removed from client');
  };

  // Group pagination and search
  const handleGroupPageChange = (newPage: number) => {
    setGroupCurrentPage(newPage);
    fetchGroups(newPage);
  };

  const handleGroupSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setGroupSearchQuery(query);
    if (showGroupModal) {
      // Debounced search
      setTimeout(() => {
        setGroupCurrentPage(1);
        fetchGroups(1, query);
      }, 500);
    }
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

    // Activity mapping validation
    for (let i = 0; i < activityMappings.length; i++) {
      const mapping = activityMappings[i];
      if (!mapping.activity) {
        toast.error(`Please select an activity for mapping ${i + 1}`);
        return false;
      }
      if (!mapping.status) {
        toast.error(`Please select a status for mapping ${i + 1}`);
        return false;
      }
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
      setActiveTab('group');
      return;
    }
    
    if (activeTab === 'group') {
      // Group assignment is optional, so we can proceed
      setActiveTab('documents');
      return;
    }
    
    if (activeTab === 'documents') {
      // Final submission with all data
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

        const clientData = {
          ...formData,
          gstNumbers: gstNumbers.filter(gst => gst.state && gst.gstNumber),
          activities: activityMappings.filter(mapping => mapping.activity),
          groups: selectedGroups.map(group => group.id) // Include selected groups
        };

      const response = await fetch(`${Base_url}clients/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
          body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      toast.success('Client updated successfully');
        
        // Load client documents
        fetchClientDocuments(params.id);
        
        // Show final success and redirect
        setTimeout(() => {
          toast.success('Client and documents updated successfully!');
          router.push('/clients');
        }, 1000);
        
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setIsSubmitting(false);
      }
      return;
    }
  };

  const addGstNumber = () => {
    setGstNumbers([
      ...gstNumbers,
      {
        state: '',
        gstNumber: ''
      }
    ]);
  };

  const removeGstNumber = (index: number) => {
    if (gstNumbers.length > 1) {
      const updatedGstNumbers = gstNumbers.filter((_, i) => i !== index);
      setGstNumbers(updatedGstNumbers);
    }
  };

  const handleGstNumberChange = (index: number, field: keyof GstNumber, value: string) => {
    const updatedGstNumbers = [...gstNumbers];
    updatedGstNumbers[index] = {
      ...updatedGstNumbers[index],
      [field]: value
    };
    setGstNumbers(updatedGstNumbers);
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
      <Seo title="Edit Client"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Client</h1>
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
                      <span className="text-sm font-medium text-gray-500">Edit Client</span>
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
                      activeTab === 'group'
                        ? 'bg-primary text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('group')}
                  >
                    Group Assignment
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

                {/* General Info Tab */}
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
                      <div className="relative">
                        <input
                          type="text"
                        id="businessType"
                        name="businessType"
                        className="form-control"
                        value={formData.businessType}
                          placeholder="Select Business Type"
                          readOnly
                          onClick={() => {
                            console.log('Opening business type modal...');
                            setShowBusinessTypeModal(true);
                            console.log('Modal state set to true');
                            fetchBusinessTypes(1, "");
                            console.log('Fetch business types called');
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setShowBusinessTypeModal(true);
                            fetchBusinessTypes(1, "");
                          }}
                        >
                          <i className="ri-arrow-down-s-line"></i>
                        </button>
                      </div>
                    </div>

                    {/* Entity Type */}
                    <div className="form-group">
                      <label htmlFor="entityType" className="form-label">Entity Type</label>
                      <div className="relative">
                        <input
                          type="text"
                        id="entityType"
                        name="entityType"
                        className="form-control"
                        value={formData.entityType}
                          placeholder="Select Entity Type"
                          readOnly
                          onClick={() => {
                            console.log('Opening entity type modal...');
                            setShowEntityTypeModal(true);
                            console.log('Modal state set to true');
                            fetchEntityTypes(1, "");
                            console.log('Fetch entity types called');
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setShowEntityTypeModal(true);
                            fetchEntityTypes(1, "");
                          }}
                        >
                          <i className="ri-arrow-down-s-line"></i>
                        </button>
                      </div>
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

                    {/* GST Numbers */}
                    <div className="form-group md:col-span-2">
                      <label className="form-label">GST Numbers</label>
                      <div className="space-y-3">
                        {gstNumbers.map((gst, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <button
                                type="button"
                                className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50 ${
                                  gst.state ? 'text-gray-900' : 'text-gray-500'
                                }`}
                                onClick={() => openStateModal(index)}
                              >
                                <span className="truncate">
                                  {gst.state || "Select State"}
                                </span>
                                <i className="ri-arrow-down-s-line text-gray-400"></i>
                              </button>
                            </div>
                            <div className="flex-1">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter GST Number"
                                value={gst.gstNumber}
                                onChange={(e) => handleGstNumberChange(index, 'gstNumber', e.target.value)}
                              />
                            </div>
                            {gstNumbers.length > 1 && (
                              <button
                                type="button"
                                className="ti-btn ti-btn-danger ti-btn-sm"
                                onClick={() => removeGstNumber(index)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="ti-btn ti-btn-secondary mx-auto block"
                          onClick={addGstNumber}
                        >
                          <i className="ri-add-line mr-1"></i>
                          Add GST Number
                        </button>
                      </div>
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
                        placeholder="Enter IEC Code"
                        value={formData.iecCode}
                        onChange={handleInputChange}
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

                {/* Activity Mapping Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={addActivityMapping}
                      >
                        <i className="ri-add-line mr-2"></i>
                        Add Activity
                      </button>
                    </div>

                    {activityMappings.map((mapping, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Activity */}
                          <div className="form-group">
                          <label className="form-label">Activity <span className="text-red-500">*</span></label>
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

                          {/* Status */}
                          <div className="form-group">
                            <label className="form-label">Status <span className="text-red-500">*</span></label>
                            <select
                              className="form-control"
                              value={mapping.status}
                              onChange={(e) => handleActivityMappingChange(index, 'status', e.target.value)}
                              required
                            >
                              <option value="">Select Status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
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

                        {activityMappings.length > 1 && (
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              className="ti-btn ti-btn-danger"
                              onClick={() => removeActivityMapping(index)}
                            >
                              <i className="ri-delete-bin-line mr-1"></i>
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Group Assignment Tab */}
                {activeTab === 'group' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Group Assignment</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Select which groups this client should belong to
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={openGroupModal}
                      >
                        <i className="ri-add-line mr-2"></i>
                        Select Groups
                      </button>
                    </div>

                    {/* Loading State */}
                    {isLoadingClientGroups && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                        <span className="text-gray-600">Loading existing group assignments...</span>
                      </div>
                    )}

                    {/* Selected Groups Display */}
                    {!isLoadingClientGroups && selectedGroups.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Current Group Assignments ({selectedGroups.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedGroups.map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-blue-900">{group.name}</div>
                                <div className="text-sm text-blue-700">
                                  {group.numberOfClients} clients • {branches.find(b => b.id === group.branch)?.name || group.branch}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeGroup(group.id)}
                                className="ml-2 text-blue-600 hover:text-blue-800 p-1"
                                title="Remove from group"
                              >
                                <i className="ri-close-line text-lg"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {!isLoadingClientGroups && selectedGroups.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <i className="ri-group-line text-4xl mb-4 opacity-50"></i>
                        <p className="text-lg font-medium">No groups assigned</p>
                        <p className="text-sm">This client is not currently assigned to any groups. Click "Select Groups" to assign them.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                      <h3 className="text-lg font-medium text-gray-900">Client Documents</h3>
                        {formData.email && (
                          <p className="text-sm text-gray-500 mt-1">
                            Files will be sent to: {formData.email}
                          </p>
                        )}
                      </div>
                      <button type="button" className="ti-btn ti-btn-primary" onClick={() => setShowUploadModal(true)}>
                        <i className="ri-upload-2-line mr-2"></i> Upload Documents
                      </button>
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
                                <div className="w-full h-full rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                  <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400"></i>
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
                        <p className="text-lg font-medium">No files found in this folder</p>
                        <p className="text-sm">Try uploading some files or creating a new folder</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center space-x-3 mt-6">
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : activeTab === 'general' || activeTab === 'activity' || activeTab === 'group' ? (
                      'Next'
                    ) : (
                      'Save Client'
                    )}
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={() => router.push('/clients')}
                    disabled={isSubmitting}
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

      {/* Group Selection Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Groups</h2>
              <button
                onClick={() => setShowGroupModal(false)}
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
                      placeholder="Search groups by name..."
                      className="form-control py-4 pr-20 text-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                      value={groupSearchQuery}
                      onChange={handleGroupSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setGroupCurrentPage(1);
                          fetchGroups(1, groupSearchQuery);
                        }
                      }}
                    />
                  </div>
                  <button 
                    className="absolute end-0 top-0 px-6 h-full bg-primary text-white hover:bg-primary-dark rounded-r-md"
                    onClick={() => {
                      setGroupCurrentPage(1);
                      fetchGroups(1, groupSearchQuery);
                    }}
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingGroups ? (
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
                          Group Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clients Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sort Order
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredGroups.map((group) => (
                        <tr key={group.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="form-checkbox h-5 w-5 text-primary"
                              checked={selectedGroups.some(g => g.id === group.id)}
                              onChange={() => handleGroupSelect(group)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{group.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {group.numberOfClients} clients
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {group.branch}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {group.sortOrder}
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
                  onClick={() => handleGroupPageChange(Math.max(groupCurrentPage - 1, 1))}
                  disabled={groupCurrentPage === 1}
                  className="ti-btn ti-btn-secondary"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {groupTotalPages > 0 ? (
                    `Page ${groupCurrentPage} of ${groupTotalPages}`
                  ) : (
                    "No pages"
                  )}
                </span>
                <button
                  onClick={() => handleGroupPageChange(Math.min(groupCurrentPage + 1, groupTotalPages))}
                  disabled={groupCurrentPage === groupTotalPages || groupTotalPages === 0}
                  className="ti-btn ti-btn-secondary"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="ti-btn ti-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGroupModalSubmit}
                  className="ti-btn ti-btn-primary"
                >
                  Select ({selectedGroups.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Upload Documents</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto">
              {/* File Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <i className="ri-upload-cloud-line text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
                <p className="text-gray-500 mb-4">Support for PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and other common formats</p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <label htmlFor="file-upload" className="ti-btn ti-btn-primary cursor-pointer">
                  <i className="ri-folder-open-line mr-2"></i>
                  Choose Files
                </label>
              </div>

              {/* Selected Files */}
              {uploadFiles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Selected Files</h4>
                  <div className="space-y-2">
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <i className="ri-file-line text-primary"></i>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveUploadFile(file.name)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="ri-upload-line mr-2"></i>
                    Upload Files
                  </>
                )}
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
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            onClick={() => handleDownloadDocument(documentContextMenu.document)}
            disabled={downloadingFile === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName)}
          >
            <i className={`${downloadingFile === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName) ? 'ri-loader-4-line animate-spin' : 'ri-download-2-line'} text-purple-600`}></i>
            {downloadingFile === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName) ? 'Downloading...' : 'Download'}
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            onClick={() => sendFileToEmail(documentContextMenu.document)}
            disabled={sendingEmail === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName)}
          >
            <i className={`${sendingEmail === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName) ? 'ri-loader-4-line animate-spin' : 'ri-mail-line'} text-green-600`}></i>
            {sendingEmail === (documentContextMenu.document.file?.fileName || documentContextMenu.document.fileName) ? 'Sending...' : 'Send to Email'}
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

      {/* Business Type Selection Modal */}
      {showBusinessTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Business Type</h3>
              <button
                onClick={() => setShowBusinessTypeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search business types..."
                className="form-control w-full"
                value={businessTypeSearch}
                onChange={(e) => {
                  setBusinessTypeSearch(e.target.value);
                  setBusinessTypePage(1);
                  fetchBusinessTypes(1, e.target.value);
                }}
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {businessTypeLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : businessTypes.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No business types found
                </div>
              ) : (
                <div className="space-y-2">
                  {businessTypes.map((businessType) => (
                    <button
                      key={businessType.id}
                      onClick={() => handleBusinessTypeSelect(businessType)}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded border border-gray-200 hover:border-primary transition-colors"
                    >
                      {businessType.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {businessTypeTotalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                  onClick={() => {
                    const newPage = businessTypePage - 1;
                    setBusinessTypePage(newPage);
                    fetchBusinessTypes(newPage, businessTypeSearch);
                  }}
                  disabled={businessTypePage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {businessTypePage} of {businessTypeTotalPages}
                </span>
                <button
                  onClick={() => {
                    const newPage = businessTypePage + 1;
                    setBusinessTypePage(newPage);
                    fetchBusinessTypes(newPage, businessTypeSearch);
                  }}
                  disabled={businessTypePage === businessTypeTotalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entity Type Selection Modal */}
      {showEntityTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Entity Type</h3>
              <button
                onClick={() => setShowEntityTypeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search entity types..."
                className="form-control w-full"
                value={entityTypeSearch}
                onChange={(e) => {
                  setEntityTypeSearch(e.target.value);
                  setEntityTypePage(1);
                  fetchEntityTypes(1, e.target.value);
                }}
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {entityTypeLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : entityTypes.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No entity types found
                </div>
              ) : (
                <div className="space-y-2">
                  {entityTypes.map((entityType) => (
                    <button
                      key={entityType.id}
                      onClick={() => handleEntityTypeSelect(entityType)}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded border border-gray-200 hover:border-primary transition-colors"
                    >
                      {entityType.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {entityTypeTotalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                  onClick={() => {
                    const newPage = entityTypePage - 1;
                    setEntityTypePage(newPage);
                    fetchEntityTypes(newPage, entityTypeSearch);
                  }}
                  disabled={entityTypePage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {entityTypePage} of {entityTypeTotalPages}
                </span>
                <button
                  onClick={() => {
                    const newPage = entityTypePage + 1;
                    setEntityTypePage(newPage);
                    fetchEntityTypes(newPage, entityTypeSearch);
                  }}
                  disabled={entityTypePage === entityTypeTotalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* State Selection Modal */}
      <StateSelectionModal
        isOpen={showStateModal}
        onClose={() => setShowStateModal(false)}
        onSelect={handleStateSelect}
        title="Select State for GST"
      />
    </div>
  );
};

export default EditClientPage; 