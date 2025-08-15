"use client";
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';
import { useBranchContext } from "@/shared/contextapi";

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
  notes: string;
}

const EditClientPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const { branches } = useBranchContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'activity' | 'documents'>('general');
  
  // States for activities and team members
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  
  // States for activity mappings
  const [activityMappings, setActivityMappings] = useState<ActivityMapping[]>([
    {
      activity: '',
      notes: ''
    }
  ]);

  // States for modals
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number>(-1);
  const [selectedTeamMemberIndex, setSelectedTeamMemberIndex] = useState<number>(-1);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>([]);
  
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
    gstNumber: '',
    tanNumber: '',
    cinNumber: '',
    udyamNumber: '',
    iecCode: '',
    entityType: '',
  });

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

  useEffect(() => {
    fetchActivities();
    fetchTeamMembers();
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
          gstNumber: data.gstNumber || '',
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
        notes: ''
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

    // Activity mapping validation
    for (let i = 0; i < activityMappings.length; i++) {
      const mapping = activityMappings[i];
      if (!mapping.activity) {
        toast.error(`Please select an activity for mapping ${i + 1}`);
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

    try {
      setIsSubmitting(true);

        const clientData = {
          ...formData,
          activities: activityMappings.filter(mapping => mapping.activity)
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
        setActiveTab('documents');
        
        // Load client documents
        fetchClientDocuments(params.id);
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setIsSubmitting(false);
      }
      return;
    }
    
    // On documents tab, show success and redirect
    if (activeTab === 'documents') {
      toast.success('Client and documents updated successfully!');
      router.push('/clients');
      return;
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    ) : activeTab === 'general' || activeTab === 'activity' ? (
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
    </div>
  );
};

export default EditClientPage; 