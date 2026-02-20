"use client"
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Base_url } from '@/app/api/config/BaseUrl'

interface ClientData {
  id: string
  name: string
  email?: string
}

interface FileItem {
  _id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  fileKey: string
  metadata: {
    originalName: string
    uploadedAt: string
  }
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

interface FolderItem {
  _id: string
  name: string
  path: string
  description: string
  createdAt: string
  updatedAt: string
}

interface FileManagerItem {
  _id: string
  isDeleted: boolean
  type: 'file' | 'folder'
  file?: FileItem
  folder?: FolderItem
  createdAt: string
  updatedAt: string
  id: string
}

interface FileManagerResponse {
  results: FileManagerItem[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
  clientFolder: {
    id: string
    name: string
    path: string
    description: string
    createdAt: string
    updatedAt: string
  }
  client: {
    id: string
    name: string
    email: string
  }
}

const ClientDashboard = () => {
  const router = useRouter()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [folderContents, setFolderContents] = useState<FileManagerItem[]>([])
  const [clientFolder, setClientFolder] = useState<any>(null)
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null) // Track current folder being viewed
  const [folderHistory, setFolderHistory] = useState<string[]>([]) // Track folder navigation history
  const [clientEmail, setClientEmail] = useState<string>('') // New state for client email from API
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'file' | 'folder'>('all')
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const token = localStorage.getItem('clientToken')
    const clientDataStr = localStorage.getItem('clientData')
    
    if (!token || !clientDataStr) {
      router.push('/client-login')
      return
    }

    try {
      const client = JSON.parse(clientDataStr)
      console.log('Client data loaded:', client)
      setClientData(client)
      
      // Load contents immediately after setting client data (only once)
      if (client) {
        // We'll call this in a separate useEffect to avoid dependency issues
      }
    } catch (error) {
      console.error('Error parsing client data:', error)
      router.push('/client-login')
    }
  }, [router])

  // Get auth headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('clientToken')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-ID': clientData?.id || ''
    }
  }

  // Define loadClientContents function before using it in useEffect
  const loadClientContents = useCallback(async () => {
    if (!clientData) return
    
    setLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('clientToken')
      console.log('Loading contents for client:', clientData.id, 'with token:', token)
      
      // Debug token format
      if (token) {
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            console.log('Token payload:', payload)
            console.log('Token type:', payload.type)
            console.log('Token userType:', payload.userType)
            console.log('Token expires:', new Date(payload.exp * 1000))
          }
        } catch (e) {
          console.error('Error parsing token:', e)
        }
      }
      
      // Log the full request details for debugging
      const requestConfig = {
        headers: getAuthHeaders()
      }
      console.log('Request config:', requestConfig)
      console.log('Request URL:', `${Base_url}client-file-manager/clients/${clientData.id}/contents`)
      
      // First, test if the token works with a simple client endpoint
      try {
        const profileResponse = await axios.get(`${Base_url}client-auth/profile`, requestConfig)
        console.log('Profile test successful:', profileResponse.data)
      } catch (profileError: any) {
        console.error('Profile test failed:', profileError.response?.data)
      }
      
      const response = await axios.get(`${Base_url}client-file-manager/clients/${clientData.id}/contents`, requestConfig)
      
      console.log('Contents loaded:', response.data)
      const responseData: FileManagerResponse = response.data
      setFolderContents(responseData.results || [])
      setClientFolder(responseData.clientFolder)
      setCurrentFolder(null) // Reset current folder when loading root
      setFolderHistory([]) // Reset history when loading root
      
      // Update client data with the latest information from API (including email)
      if (responseData.client) {
        // Don't update clientData to prevent infinite loop
        // setClientData(prev => ({
        //   ...prev,
        //   ...responseData.client
        // }))
        
        // Only update the client email separately to ensure we always have it
        setClientEmail(responseData.client.email)
        console.log('Client data from API:', responseData.client)
        console.log('Client email set to:', responseData.client.email)
      }
    } catch (error: any) {
      console.error('Error loading contents:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error headers:', error.response?.headers)
      
      if (error.response?.status === 401) {
        console.error('Unauthorized - token might be invalid or expired')
        console.error('Token being used:', localStorage.getItem('clientToken'))
        localStorage.removeItem('clientToken')
        localStorage.removeItem('clientData')
        router.push('/client-login')
      } else {
        setError('Failed to load contents')
      }
    } finally {
      setLoading(false)
    }
  }, [clientData])

  // Load folder contents (for subfolders)
  // NOTE: This function tries multiple endpoints:
  // 1. /client-file-manager/folders/{folderId}/contents (preferred - needs backend implementation)
  // 2. /client-file-manager/clients/{clientId}/contents?folderId={folderId} (fallback - if backend supports folderId param)
  // The backend should implement one of these endpoints to allow clients to access subfolders
  const loadFolderContents = useCallback(async (folderId: string) => {
    if (!clientData) return
    
    setLoading(true)
    setError('')
    
    try {
      const requestConfig = {
        headers: getAuthHeaders()
      }
      
      // Use client-specific endpoint for folder contents
      // Try client-file-manager endpoint first (client-specific)
      let response
      try {
        response = await axios.get(`${Base_url}client-file-manager/folders/${folderId}/contents`, {
          ...requestConfig,
          params: { page: 1, limit: 100 }
        })
        console.log('Folder contents loaded from client-file-manager:', response.data)
      } catch (clientError: any) {
        // If client-specific endpoint doesn't exist, fall back to using clientId in the path
        console.warn('Client-specific folder endpoint not available, trying alternative:', clientError.response?.status)
        
        // Alternative: Use client contents endpoint with folderId parameter
        try {
          response = await axios.get(`${Base_url}client-file-manager/clients/${clientData.id}/contents`, {
            ...requestConfig,
            params: { 
              page: 1, 
              limit: 100,
              folderId: folderId // Pass folderId as query parameter
            }
          })
          console.log('Folder contents loaded from client contents with folderId param:', response.data)
        } catch (altError: any) {
          console.error('All client endpoints failed:', altError)
          throw altError
        }
      }
      
      // The response structure should match the client contents response
      const responseData = response.data
      
      // Handle response structure (same as root folder response)
      if (responseData.results) {
        setFolderContents(responseData.results || [])
        
        // Set current folder if available in response
        if (responseData.clientFolder) {
          setCurrentFolder({
            _id: responseData.clientFolder.id,
            name: responseData.clientFolder.name,
            path: responseData.clientFolder.path,
            description: responseData.clientFolder.description || '',
            createdAt: responseData.clientFolder.createdAt,
            updatedAt: responseData.clientFolder.updatedAt
          })
        } else if (responseData.folder) {
          // Handle if folder info is in different format
          setCurrentFolder({
            _id: responseData.folder.id || responseData.folder._id,
            name: responseData.folder.name,
            path: responseData.folder.path || '',
            description: responseData.folder.description || '',
            createdAt: responseData.folder.createdAt,
            updatedAt: responseData.folder.updatedAt
          })
        }
      } else if (responseData.contents && responseData.contents.results) {
        // Handle nested contents structure
        setFolderContents(responseData.contents.results || [])
        if (responseData.folder) {
          setCurrentFolder({
            _id: responseData.folder.id || responseData.folder._id,
            name: responseData.folder.name,
            path: responseData.folder.path || '',
            description: responseData.folder.description || '',
            createdAt: responseData.folder.createdAt,
            updatedAt: responseData.folder.updatedAt
          })
        }
      } else if (Array.isArray(responseData)) {
        // Handle direct array response
        setFolderContents(responseData)
      } else {
        // Fallback
        setFolderContents(responseData || [])
      }
    } catch (error: any) {
      console.error('Error loading folder contents:', error)
      console.error('Error response:', error.response?.data)
      
      if (error.response?.status === 401) {
        localStorage.removeItem('clientToken')
        localStorage.removeItem('clientData')
        router.push('/client-login')
        setError('Session expired. Please login again.')
      } else {
        setError(error.response?.data?.message || 'Failed to load folder contents. The backend may need a client-specific folder endpoint.')
      }
    } finally {
      setLoading(false)
    }
  }, [clientData, router])

  // Handle folder click - navigate into folder
  const handleFolderClick = (folder: FolderItem) => {
    // Add current folder to history if we're in a subfolder
    if (currentFolder) {
      setFolderHistory(prev => [...prev, currentFolder._id])
    } else if (clientFolder) {
      // If we're at root, add root folder to history
      setFolderHistory(prev => [...prev, clientFolder.id])
    }
    
    // Load the clicked folder's contents
    loadFolderContents(folder._id)
  }

  // Handle back navigation
  const handleBackToParent = () => {
    if (folderHistory.length > 0) {
      const previousFolderId = folderHistory[folderHistory.length - 1]
      setFolderHistory(prev => prev.slice(0, -1))
      
      // If we're going back to root
      if (previousFolderId === clientFolder?.id) {
        loadClientContents()
      } else {
        // Load the previous folder
        loadFolderContents(previousFolderId)
      }
    } else {
      // If no history, go back to root
      loadClientContents()
    }
  }

  // Handle item click (both files and folders)
  const handleItemClick = (item: FileManagerItem) => {
    if (item.type === 'folder' && item.folder) {
      handleFolderClick(item.folder)
    } else if (item.type === 'file' && item.file) {
      // Files are handled by their action buttons, but we could add download on click here if needed
      // handleDownloadFile(item.file)
    }
  }

  // Separate useEffect to load contents after clientData is set
  useEffect(() => {
    if (clientData && clientData.id) {
      loadClientContents()
    }
  }, [clientData?.id]) // Remove loadClientContents from dependencies

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (token) {
        await axios.post(`${Base_url}client-auth/logout`, { accessToken: token })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('clientToken')
      localStorage.removeItem('clientData')
      router.push('/client-login')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'ri-image-line text-green-600 dark:text-green-400'
    if (mimeType.startsWith('video/')) return 'ri-video-line text-purple-600 dark:text-purple-400'
    if (mimeType.startsWith('audio/')) return 'ri-music-line text-blue-600 dark:text-blue-400'
    if (mimeType.includes('pdf')) return 'ri-file-pdf-line text-red-600 dark:text-red-400'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'ri-file-word-line text-blue-600 dark:text-blue-400'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'ri-file-excel-line text-green-600 dark:text-green-400'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ri-file-ppt-line text-orange-600 dark:text-orange-400'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'ri-file-zip-line text-yellow-600 dark:text-yellow-400'
    if (mimeType.includes('text/')) return 'ri-file-text-line text-gray-600 dark:text-gray-400'
    return 'ri-file-line text-gray-600 dark:text-gray-400'
  }

  const canViewInBrowser = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType.includes('pdf') || 
           mimeType.includes('text/') ||
           mimeType.includes('html')
  }

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  const getFileCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'Image'
    if (mimeType.startsWith('video/')) return 'Video'
    if (mimeType.startsWith('audio/')) return 'Audio'
    if (mimeType.startsWith('text/')) return 'Text'
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Document'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation'
    if (mimeType.includes('archive') || mimeType.includes('zip') || mimeType.includes('rar')) return 'Archive'
    return 'Other'
  }

  const handleDownloadFile = async (file: FileItem) => {
    setDownloadingFile(file.fileName)
    try {
      // Use Next.js API route to download the file
      const response = await axios.get(`/api/client-file-manager/download`, {
        params: {
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          fileKey: file.fileKey
        },
        responseType: 'blob' // Important: get the file as blob
      })
      
      // Create blob URL and download
      const blob = new Blob([response.data])
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = blobUrl
      link.download = file.fileName
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl)
      
      setSuccess(`Downloading ${file.fileName}...`)
      setTimeout(() => {
        setSuccess('')
        setDownloadingFile(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to download file:', error)
      setError('Failed to download file')
      setTimeout(() => {
        setError('')
        setDownloadingFile(null)
      }, 3000)
    }
  }

  const handleViewFile = (file: FileItem) => {
    try {
      window.open(file.fileUrl, '_blank')
      setSuccess(`Opening ${file.fileName} in new tab...`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Failed to open file:', error)
      setError('Failed to open file')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Send file to client email
  const sendFileToEmail = async (file: FileItem) => {
    // Use the dedicated client email state that gets updated from the API
    console.log('Client email state:', clientEmail)
    console.log('Client data when sending email:', clientData)
    

    setSendingEmail(file.fileName)
    try {
      const requestBody = {
        to: clientEmail,
        subject: `File: ${file.fileName}`,
        text: `Please find the attached file: ${file.fileName}`,
        description: `File sent from Client Dashboard: ${file.fileName}`,
        attachments: [
          {
            url: file.fileUrl,
            filename: file.fileName,
            contentType: file.mimeType
          }
        ]
      }

      console.log('Sending email with data:', requestBody)
      console.log('Email will be sent to:', clientEmail)

      const response = await fetch(`${Base_url}common-email/send-with-attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Failed to send email: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Email sent successfully:', result)
      
      setSuccess(`File "${file.fileName}" sent to ${clientEmail} successfully!`)
      setTimeout(() => {
        setSuccess('')
        setSendingEmail(null)
      }, 5000)
    } catch (error) {
      console.error('Failed to send email:', error)
      setError(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => {
        setError('')
        setSendingEmail(null)
      }, 5000)
    }
  }

  // Filtered and sorted content
  const filteredContent = useMemo(() => {
    const filtered = folderContents.filter((item: FileManagerItem) => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        (item.type === 'file' && item.file && (
          item.file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getFileExtension(item.file.fileName).includes(searchTerm.toLowerCase()) ||
          getFileCategory(item.file.mimeType).toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        (item.type === 'folder' && item.folder?.name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Type filter
      const typeMatch = fileTypeFilter === 'all' || item.type === fileTypeFilter

      // File category filter
      const categoryMatch = fileCategoryFilter === 'all' || 
        (item.type === 'file' && item.file && getFileCategory(item.file.mimeType) === fileCategoryFilter)

      // Date filter
      let dateMatch = true
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.updatedAt)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        switch (dateFilter) {
          case 'today':
            dateMatch = itemDate >= today
            break
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            dateMatch = itemDate >= weekAgo
            break
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            dateMatch = itemDate >= monthAgo
            break
        }
      }

      return searchMatch && typeMatch && categoryMatch && dateMatch
    })

    // Sorting
    const sorted = [...filtered].sort((a: FileManagerItem, b: FileManagerItem) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.type === 'file' ? a.file?.fileName : a.folder?.name
          bValue = b.type === 'file' ? b.file?.fileName : b.folder?.name
          break
        case 'date':
          aValue = new Date(a.updatedAt)
          bValue = new Date(b.updatedAt)
          break
        case 'size':
          aValue = a.type === 'file' ? a.file?.fileSize : 0
          bValue = b.type === 'file' ? b.file?.fileSize : 0
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        default:
          aValue = a.type === 'file' ? a.file?.fileName : a.folder?.name
          bValue = b.type === 'file' ? b.file?.fileName : b.folder?.name
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime()
      } else {
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
      }
    })

    return sorted
  }, [folderContents, searchTerm, fileTypeFilter, fileCategoryFilter, dateFilter, sortBy, sortOrder])

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "rgb(240 241 247)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "rgb(240 241 247)" }}>
      {/* Header – spec: 14px bold gray-800, logout 11px danger */}
      <div className="bg-white shadow-sm border-b border-gray-300">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <h1 className="text-[14px] font-bold text-gray-800">
            Welcome, {clientData.name}
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
          >
            <i className="ri-logout-box-r-line text-xs"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-[11px]">
          <div className="flex items-center justify-between">
            <span className="truncate">{error}</span>
            <button onClick={() => setError('')} className="ml-2 sm:ml-4 text-red-500 hover:text-red-700 flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-[11px]">
          <div className="flex items-center justify-between">
            <span className="truncate">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-2 sm:ml-4 text-emerald-600 hover:text-emerald-800 flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-[10px] sm:p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
          <div className="p-[10px] sm:p-4 border-b border-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {(currentFolder || folderHistory.length > 0) && (
                  <button
                    onClick={handleBackToParent}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-300 text-[#495057] hover:bg-gray-50 shadow-sm flex-shrink-0"
                    title="Back to parent folder"
                  >
                    <i className="ri-arrow-left-line text-xs"></i>
                    <span>Back</span>
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-[14px] font-bold text-gray-800 truncate">
                    {currentFolder ? currentFolder.name : 'Your Files'}
                  </h2>
                  <p className="text-[11px] text-[#495057] mt-0.5 truncate">
                    {currentFolder
                      ? currentFolder.path || currentFolder.description || 'Folder'
                      : clientFolder
                        ? `Location: ${clientFolder.path}`
                        : 'Manage your files and folders'}
                  </p>
                </div>
              </div>
              {clientFolder && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <p className="text-[11px] font-medium text-[#495057]">
                    Total: {folderContents.length} item{folderContents.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={loadClientContents}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-xs"></i>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-refresh-line text-xs"></i>
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters and Search – spec: 11px, border-gray-300, focus purple */}
          <div className="p-[10px] sm:p-4 border-b border-gray-300 bg-gray-50/50">
            <div className="space-y-3">
              <div className="relative">
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded bg-white text-[11px] font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:border-purple-300 transition-all"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-[#495057]">Type:</label>
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value as 'all' | 'file' | 'folder')}
                    className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="file">Files</option>
                    <option value="folder">Folders</option>
                  </select>
                </div>
                {fileTypeFilter === 'file' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-medium text-[#495057]">Category:</label>
                    <select
                      value={fileCategoryFilter}
                      onChange={(e) => setFileCategoryFilter(e.target.value)}
                      className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      <option value="Image">Images</option>
                      <option value="Video">Videos</option>
                      <option value="Audio">Audio</option>
                      <option value="Text">Text Files</option>
                      <option value="PDF">PDFs</option>
                      <option value="Document">Documents</option>
                      <option value="Spreadsheet">Spreadsheets</option>
                      <option value="Presentation">Presentations</option>
                      <option value="Archive">Archives</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-[#495057]">Date:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                    className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-[#495057]">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size' | 'type')}
                    className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="size">Size</option>
                    <option value="type">Type</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                    title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                  >
                    <i className={`ri-sort-${sortOrder === 'asc' ? 'asc' : 'desc'} text-xs`}></i>
                  </button>
                </div>
                <div className="ml-auto text-[11px] font-medium text-[#495057]">
                  Showing {filteredContent.length} of {folderContents.length} items
                </div>
                {(searchTerm || fileTypeFilter !== 'all' || fileCategoryFilter !== 'all' || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFileTypeFilter('all')
                      setFileCategoryFilter('all')
                      setDateFilter('all')
                      setSortBy('name')
                      setSortOrder('asc')
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-300 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {!loading && folderContents.length > 0 && (
            <div className="px-[10px] sm:px-4 py-2.5 bg-gray-50/30 border-b border-gray-300">
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-[#495057]">
                <span>Files: {folderContents.filter(item => item.type === 'file').length}</span>
                <span>Folders: {folderContents.filter(item => item.type === 'folder').length}</span>
                {(() => {
                  const categories = folderContents
                    .filter(item => item.type === 'file' && item.file)
                    .reduce((acc, item) => {
                      const category = getFileCategory(item.file!.mimeType)
                      acc[category] = (acc[category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  return Object.entries(categories).map(([category, count]) => (
                    <span key={category}>{category}: {count}</span>
                  ))
                })()}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
              <span className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Loading</span>
            </div>
          ) : filteredContent.length > 0 ? (
            <div className="divide-y divide-gray-300">
              {filteredContent.map((item) => (
                <div
                  key={item._id}
                  className={`flex items-center gap-2 sm:gap-4 px-[10px] sm:px-4 py-2.5 transition-colors ${
                    item.type === 'folder'
                      ? 'hover:bg-gray-50/50 cursor-pointer'
                      : 'hover:bg-gray-50/50'
                  }`}
                  onClick={() => item.type === 'folder' && handleItemClick(item)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-50 border border-gray-300 flex items-center justify-center">
                      <i className={`text-base ${
                        item.type === 'folder'
                          ? 'ri-folder-2-line text-purple-600'
                          : getFileIcon(item.file?.mimeType || '')
                      }`}></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-gray-900 truncate">
                      {item.type === 'file' ? item.file?.fileName : item.folder?.name}
                      {item.type === 'folder' && (
                        <span className="ml-1 text-gray-400"><i className="ri-arrow-right-s-line text-xs"></i></span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#495057]">
                      {item.type === 'folder'
                        ? `Folder • ${item.folder?.description || 'No description'}`
                        : `${item.file?.mimeType} • ${formatFileSize(item.file?.fileSize || 0)}`
                      } • {new Date(item.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {item.type === 'file' && item.file && (
                    <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => sendFileToEmail(item.file!)}
                        disabled={sendingEmail === item.file?.fileName}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors"
                        title="Send file to client email"
                      >
                        {sendingEmail === item.file?.fileName ? (
                          <><i className="ri-loader-4-line animate-spin text-xs"></i><span>Sending...</span></>
                        ) : (
                          <><i className="ri-mail-line text-xs"></i><span>Email</span></>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadFile(item.file!)}
                        disabled={downloadingFile === item.file?.fileName}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-sky-600 text-white hover:bg-sky-700 shadow-sm disabled:opacity-50 transition-colors"
                        title="Download file"
                      >
                        {downloadingFile === item.file?.fileName ? (
                          <><i className="ri-loader-4-line animate-spin text-xs"></i><span>Downloading...</span></>
                        ) : (
                          <><i className="ri-download-line text-xs"></i><span>Download</span></>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-folder-open-line text-xl text-gray-200"></i>
              </div>
              <p className="text-[12px] font-bold text-gray-400 mb-1">
                {searchTerm || fileTypeFilter !== 'all' || fileCategoryFilter !== 'all' || dateFilter !== 'all'
                  ? 'No files match your filters'
                  : 'No files found'}
              </p>
              <p className="text-[11px] text-[#495057] mb-4">
                {searchTerm || fileTypeFilter !== 'all' || fileCategoryFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Contact your administrator to upload files'}
              </p>
              {(searchTerm || fileTypeFilter !== 'all' || fileCategoryFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFileTypeFilter('all')
                    setFileCategoryFilter('all')
                    setDateFilter('all')
                    setSortBy('name')
                    setSortOrder('asc')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
