# Client Authentication System Guide

## Overview

This guide explains the client authentication system that allows clients to access their files and folders using OTP-based authentication.

## System Architecture

### 1. Client Login Flow
- **Route**: `/client-login`
- **Authentication Method**: OTP (One-Time Password)
- **Steps**:
  1. Client enters email address
  2. System validates email and sends 6-digit OTP
  3. Client enters OTP
  4. System verifies OTP and grants access
  5. Client is redirected to dashboard

### 2. Client Dashboard
- **Route**: `/client-dashboard`
- **Features**:
  - View client's files and folders
  - Download files
  - Navigate folder structure
  - Search files
  - Logout functionality

## API Endpoints

### Client Authentication APIs

#### 1. Generate OTP
```http
POST /client-auth/generate-otp
Content-Type: application/json

{
  "email": "client@example.com"
}
```

**Response**:
```json
{
  "message": "OTP sent successfully",
  "success": true
}
```

#### 2. Verify OTP & Login
```http
POST /client-auth/verify-otp
Content-Type: application/json

{
  "email": "client@example.com",
  "otp": "123456"
}
```

**Response**:
```json
{
  "client": {
    "_id": "client_id",
    "name": "Client Name",
    "email": "client@example.com",
    "company": "Company Name",
    "phone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_token_here",
  "message": "Login successful",
  "success": true
}
```

#### 3. Get Client Profile (Protected)
```http
GET /client-auth/profile
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "_id": "client_id",
  "name": "Client Name",
  "email": "client@example.com",
  "company": "Company Name",
  "phone": "+1234567890",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 4. Logout
```http
POST /client-auth/logout
Content-Type: application/json

{
  "accessToken": "jwt_token_here"
}
```

**Response**:
```json
{
  "message": "Logged out successfully",
  "success": true
}
```

### File Manager APIs (Client-Specific)

#### 1. Get Client Contents
```http
GET /file-manager/clients/:clientId/contents
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)

**Response**:
```json
{
  "contents": [
    {
      "_id": "item_id",
      "type": "file",
      "file": {
        "_id": "file_id",
        "fileName": "document.pdf",
        "fileUrl": "https://example.com/file.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "fileKey": "file_key",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "folder_id",
      "type": "folder",
      "folder": {
        "_id": "folder_id",
        "name": "Documents",
        "description": "Important documents",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "totalResults": 50,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 100
  }
}
```

#### 2. Get Folder Contents
```http
GET /file-manager/folders/:folderId/contents
Authorization: Bearer <access_token>
```

#### 3. Upload Files to Client
```http
POST /file-manager/clients/:clientId/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- files: File[] (multiple files)
- folderId: string (optional)
- clientId: string
```

#### 4. Create Folder
```http
POST /file-manager/folders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Folder",
  "description": "Folder description",
  "parentFolderId": "parent_folder_id",
  "clientId": "client_id"
}
```

#### 5. Update File
```http
PATCH /file-manager/files/:fileId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fileName": "new_name.pdf"
}
```

#### 6. Update Folder
```http
PATCH /file-manager/folders/:folderId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Folder Name",
  "description": "New description"
}
```

#### 7. Delete File
```http
DELETE /file-manager/files/:fileId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fileKey": "file_key"
}
```

#### 8. Delete Folder
```http
DELETE /file-manager/folders/:folderId
Authorization: Bearer <access_token>
```

#### 9. Delete Multiple Items
```http
DELETE /file-manager/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "itemIds": ["item_id_1", "item_id_2"]
}
```

#### 10. Search Files
```http
GET /file-manager/search
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `query`: Search term
- `folderId` (optional): Search within specific folder
- `page` (optional): Page number
- `limit` (optional): Items per page

#### 11. Get File Details
```http
GET /file-manager/files/:fileId
Authorization: Bearer <access_token>
```

## Frontend Components

### 1. Client Login Page (`/client-login`)
- **File**: `vsc_CRM/app/client-login/page.tsx`
- **Features**:
  - Email input validation
  - OTP generation
  - 6-digit OTP input with auto-focus
  - Resend OTP functionality
  - Error handling
  - Success messages

### 2. Client Dashboard (`/client-dashboard`)
- **File**: `vsc_CRM/app/client-dashboard/page.tsx`
- **Features**:
  - File and folder listing
  - File download functionality
  - Responsive design
  - Loading states
  - Error handling
  - Logout functionality

### 3. Client Authentication Guard
- **File**: `vsc_CRM/shared/utils/clientAuthGuard.tsx`
- **Purpose**: Protect client routes from unauthorized access
- **Usage**: Import and use in client components

### 4. Client Authentication Service
- **File**: `vsc_CRM/shared/services/clientAuthService.ts`
- **Features**:
  - OTP generation and verification
  - Token management
  - Local storage utilities
  - Email and OTP validation

### 5. Client File Manager Service
- **File**: `vsc_CRM/shared/services/clientFileManagerService.ts`
- **Features**:
  - File and folder operations
  - Upload functionality
  - Search capabilities
  - Utility functions

## Security Features

### 1. OTP Security
- 6-digit numeric OTP
- 10-minute expiration
- Rate limiting for OTP generation
- Secure token storage

### 2. JWT Token Security
- Short-lived access tokens
- Secure token storage in localStorage
- Automatic token validation
- Logout functionality

### 3. Client Isolation
- Clients can only access their own files
- Server-side validation of client ownership
- Protected API endpoints

## Usage Instructions

### For Clients

1. **Access Client Portal**:
   - Navigate to `/client-login`
   - Enter your registered email address
   - Click "Send OTP"

2. **Complete Authentication**:
   - Check your email for the 6-digit OTP
   - Enter the OTP in the provided fields
   - Click "Verify & Login"

3. **Access Files**:
   - View your files and folders
   - Download files by clicking the download button
   - Navigate through folder structure

4. **Logout**:
   - Click the logout button in the top-right corner
   - You'll be redirected to the login page

### For Administrators

1. **Create Client Accounts**:
   - Use the admin panel to create client accounts
   - Ensure client email addresses are valid
   - Set appropriate permissions

2. **Upload Client Files**:
   - Use the file manager to upload files for clients
   - Organize files in appropriate folders
   - Set proper access permissions

3. **Monitor Client Access**:
   - Check client login logs
   - Monitor file access patterns
   - Manage client permissions

## Error Handling

### Common Error Scenarios

1. **Invalid Email**:
   - Error: "Please enter a valid email address"
   - Solution: Check email format and try again

2. **Client Not Found**:
   - Error: "Client not found. Please contact your administrator."
   - Solution: Contact admin to create client account

3. **Invalid OTP**:
   - Error: "Invalid OTP. Please try again."
   - Solution: Check email and re-enter OTP

4. **Expired OTP**:
   - Error: "OTP has expired. Please request a new one."
   - Solution: Click "Resend OTP"

5. **Authentication Required**:
   - Error: "Please log in to access this page."
   - Solution: Navigate to `/client-login`

6. **File Access Denied**:
   - Error: "You don't have permission to access this file."
   - Solution: Contact administrator for file permissions

## Development Notes

### Environment Variables
Ensure these environment variables are set:
```env
NEXT_PUBLIC_API_BASE_URL=your_api_base_url
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE_CONFIG=your_email_service_config
```

### Dependencies
The system uses these key dependencies:
- `axios`: HTTP client for API calls
- `next/navigation`: Next.js routing
- `react`: React framework
- `xlsx`: Excel file export functionality

### File Structure
```
vsc_CRM/
├── app/
│   ├── client-login/
│   │   └── page.tsx
│   └── client-dashboard/
│       └── page.tsx
├── shared/
│   ├── services/
│   │   ├── clientAuthService.ts
│   │   └── clientFileManagerService.ts
│   └── utils/
│       └── clientAuthGuard.tsx
└── CLIENT_AUTHENTICATION_GUIDE.md
```

## Troubleshooting

### Common Issues

1. **OTP Not Received**:
   - Check spam folder
   - Verify email address is correct
   - Contact administrator to check email service

2. **Login Fails**:
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Check internet connection

3. **Files Not Loading**:
   - Check authentication token
   - Verify API endpoint configuration
   - Contact administrator for file permissions

4. **Download Issues**:
   - Check file URL accessibility
   - Verify file permissions
   - Try different browser

### Support
For technical support or issues:
1. Check this documentation
2. Review error messages carefully
3. Contact system administrator
4. Provide error details and steps to reproduce

## Future Enhancements

### Planned Features
1. **Two-Factor Authentication**: Additional security layer
2. **File Sharing**: Client-to-client file sharing
3. **File Versioning**: Track file changes and versions
4. **Advanced Search**: Full-text search capabilities
5. **Mobile App**: Native mobile application
6. **Real-time Notifications**: Instant file update notifications
7. **Bulk Operations**: Mass file operations
8. **File Preview**: In-browser file preview
9. **Audit Logs**: Detailed access and modification logs
10. **API Rate Limiting**: Enhanced security measures
