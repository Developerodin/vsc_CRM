"use client"
import React, { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

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
    } catch (error) {
      console.error('Error parsing client data:', error)
      router.push('/client-login')
    }
  }, [router])

  useEffect(() => {
    if (clientData) {
      loadClientContents()
    }
  }, [clientData])

  const loadClientContents = async () => {
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
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-ID': clientData.id
        }
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
  }

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
           mimeType.startsWith('audio/') || 
           mimeType.includes('pdf') || 
           mimeType.includes('text/') ||
           mimeType.includes('html')
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

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Client Portal</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
              Welcome, {clientData.name}
            </span>
            <span className="sm:hidden text-xs text-gray-600 dark:text-gray-300">
              {clientData.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <span className="hidden sm:inline">Logout</span>
              <i className="sm:hidden ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>
      </div>

             {/* Error Toast */}
       {error && (
         <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
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
         <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
           <div className="flex items-center justify-between">
             <span className="truncate">{success}</span>
             <button onClick={() => setSuccess('')} className="ml-2 sm:ml-4 text-green-500 hover:text-green-700 flex-shrink-0">
               ×
             </button>
           </div>
         </div>
       )}

             {/* Main Content */}
       <div className="p-4 sm:p-6">
         <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
               <div>
                 <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Your Files</h2>
                 <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                   {clientFolder ? `Location: ${clientFolder.path}` : 'Manage your files and folders'}
                 </p>
               </div>
               {clientFolder && (
                 <div className="flex items-center gap-2 sm:gap-4">
                   <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                     Total: {folderContents.length} item{folderContents.length !== 1 ? 's' : ''}
                   </p>
                   <button
                     onClick={loadClientContents}
                     disabled={loading}
                     className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                   >
                     {loading ? (
                       <>
                         <i className="ri-loader-4-line animate-spin mr-1"></i>
                         <span className="hidden sm:inline">Refreshing...</span>
                         <span className="sm:hidden">...</span>
                       </>
                     ) : (
                       <>
                         <i className="ri-refresh-line mr-1"></i>
                         <span className="hidden sm:inline">Refresh</span>
                         <span className="sm:hidden">Refresh</span>
                       </>
                     )}
                   </button>
                 </div>
               )}
             </div>
           </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
                     ) : folderContents.length > 0 ? (
             <div className="divide-y divide-gray-200 dark:divide-gray-700">
               {folderContents.map((item) => (
                 <div
                   key={item._id}
                   className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                 >
                   {/* Icon */}
                   <div className="flex-shrink-0">
                     <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                       <i className={`text-lg sm:text-xl ${
                         item.type === 'folder' 
                           ? 'ri-folder-2-line text-blue-600 dark:text-blue-400' 
                           : getFileIcon(item.file?.mimeType || '')
                       }`}></i>
                     </div>
                   </div>

                   {/* Content */}
                   <div className="flex-1 min-w-0">
                     <div className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                       {item.type === 'file' ? item.file?.fileName : item.folder?.name}
                     </div>
                     <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                       {item.type === 'folder' 
                         ? `Folder • ${item.folder?.description || 'No description'}` 
                         : `${item.file?.mimeType} • ${formatFileSize(item.file?.fileSize || 0)}`
                       } • {new Date(item.updatedAt).toLocaleDateString()}
                     </div>
                   </div>

                   {/* Actions */}
                   {item.type === 'file' && item.file && (
                     <div className="flex items-center gap-1 sm:gap-2">
                       {canViewInBrowser(item.file.mimeType) && (
                         <button
                           onClick={() => handleViewFile(item.file!)}
                           className="p-1.5 sm:px-3 sm:py-1 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                           title="View file in browser"
                         >
                           <i className="ri-eye-line"></i>
                           <span className="hidden sm:inline ml-1">View</span>
                         </button>
                       )}
                       <button
                         onClick={() => handleDownloadFile(item.file!)}
                         disabled={downloadingFile === item.file?.fileName}
                         className="p-1.5 sm:px-3 sm:py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                         title="Download file to device"
                       >
                         {downloadingFile === item.file?.fileName ? (
                           <>
                             <i className="ri-loader-4-line animate-spin"></i>
                             <span className="hidden sm:inline ml-1">Downloading...</span>
                           </>
                         ) : (
                           <>
                             <i className="ri-download-line"></i>
                             <span className="hidden sm:inline ml-1">Download</span>
                           </>
                         )}
                       </button>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          ) : (
            <div className="text-center py-12 sm:py-16 text-gray-500 dark:text-gray-400">
              <i className="ri-folder-open-line text-3xl sm:text-4xl mb-3 sm:mb-4 opacity-50"></i>
              <p className="text-base sm:text-lg font-medium">No files found</p>
              <p className="text-xs sm:text-sm">Contact your administrator to upload files</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
