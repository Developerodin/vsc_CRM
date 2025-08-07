import axios from 'axios';
import { Base_url } from '@/app/api/config/BaseUrl';

export interface ClientFileItem {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  fileKey: string;
  metadata: {
    originalName: string;
    uploadedAt: string;
  };
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFolder {
  _id: string;
  name: string;
  path: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFolderContent {
  _id: string;
  isDeleted: boolean;
  type: 'file' | 'folder';
  file?: ClientFileItem;
  folder?: ClientFolder;
  createdAt: string;
  updatedAt: string;
  id: string;
}

export interface ClientContentsResponse {
  results: ClientFolderContent[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  clientFolder: {
    id: string;
    name: string;
    path: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    id: string;
    name: string;
    email: string;
  };
}

class ClientFileManagerService {
  private getAuthHeaders() {
    const token = localStorage.getItem('clientToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // Get client contents (root folder)
  async getClientContents(clientId: string, page: number = 1): Promise<ClientContentsResponse> {
    try {
      const response = await axios.get(`${Base_url}client-file-manager/clients/${clientId}/contents`, {
        headers: this.getAuthHeaders(),
        params: { page, limit: 100 }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load client contents');
    }
  }

  // Get folder contents
  async getFolderContents(folderId: string, page: number = 1): Promise<ClientContentsResponse> {
    try {
      const response = await axios.get(`${Base_url}file-manager/folders/${folderId}/contents`, {
        headers: this.getAuthHeaders(),
        params: { page, limit: 100 }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load folder contents');
    }
  }

  // Upload files to client
  async uploadFilesToClient(clientId: string, files: File[], folderId?: string): Promise<any> {
    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (folderId) {
        formData.append('folderId', folderId);
      }
      formData.append('clientId', clientId);
      
      const response = await axios.post(`${Base_url}file-manager/clients/${clientId}/upload`, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload files');
    }
  }

  // Create folder
  async createFolder(name: string, description: string = '', parentFolderId?: string, clientId?: string): Promise<any> {
    try {
      const response = await axios.post(`${Base_url}file-manager/folders`, {
        name,
        description,
        parentFolderId,
        clientId
      }, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create folder');
    }
  }

  // Update file
  async updateFile(fileId: string, updates: any): Promise<any> {
    try {
      const response = await axios.patch(`${Base_url}file-manager/files/${fileId}`, updates, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update file');
    }
  }

  // Update folder
  async updateFolder(folderId: string, updates: any): Promise<any> {
    try {
      const response = await axios.patch(`${Base_url}file-manager/folders/${folderId}`, updates, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update folder');
    }
  }

  // Delete file
  async deleteFile(fileId: string, fileKey: string): Promise<any> {
    try {
      const response = await axios.delete(`${Base_url}file-manager/files/${fileId}`, {
        headers: this.getAuthHeaders(),
        data: { fileKey }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete file');
    }
  }

  // Delete folder
  async deleteFolder(folderId: string): Promise<any> {
    try {
      const response = await axios.delete(`${Base_url}file-manager/folders/${folderId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete folder');
    }
  }

  // Delete multiple items
  async deleteMultipleItems(itemIds: string[]): Promise<any> {
    try {
      const response = await axios.delete(`${Base_url}file-manager/items`, {
        headers: this.getAuthHeaders(),
        data: { itemIds }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete items');
    }
  }

  // Search files
  async searchFiles(query: string, folderId?: string, page: number = 1): Promise<ClientContentsResponse> {
    try {
      const response = await axios.get(`${Base_url}file-manager/search`, {
        headers: this.getAuthHeaders(),
        params: { 
          query, 
          folderId, 
          page, 
          limit: 100 
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search files');
    }
  }

  // Get file details
  async getFile(fileId: string): Promise<ClientFileItem> {
    try {
      const response = await axios.get(`${Base_url}file-manager/files/${fileId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get file details');
    }
  }

  // Utility functions
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'ri-image-line text-green-600';
    if (mimeType.startsWith('video/')) return 'ri-video-line text-purple-600';
    if (mimeType.startsWith('audio/')) return 'ri-music-line text-blue-600';
    if (mimeType.includes('pdf')) return 'ri-file-pdf-line text-red-600';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'ri-file-word-line text-blue-600';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'ri-file-excel-line text-green-600';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ri-file-ppt-line text-orange-600';
    return 'ri-file-line text-gray-600';
  }
}

export const clientFileManagerService = new ClientFileManagerService();
