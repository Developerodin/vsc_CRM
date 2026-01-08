# Compliance Register System Documentation

## Overview

The Compliance Register system is a centralized register for CA/compliance workflow management. It provides an Excel-like interface for managing compliance tasks with automatic synchronization between Tasks, Register, and Client Data.

## Features

### 1. Register Scope

The Compliance Register includes the following task types:

- **ITR** (Income Tax Return)
- **GSTR-1** (GST Return 1)
- **GSTR-3B** (GST Return 3B)
- **TDS Returns** (Tax Deducted at Source Returns)
- **ROC Compliance** (Registrar of Companies Compliance)
- **Audit & Other Statutory Tasks**

Each record is:
- **Client-wise**: Linked to specific clients
- **Period-wise**: Organized by Financial Year / Month / Quarter as applicable

### 2. Excel-Like UI

The Register provides a spreadsheet-style interface with:

- **Tabular grid view**: Traditional table layout similar to Excel
- **Inline cell editing**: Click any cell to edit directly
- **Keyboard navigation**:
  - `Enter` - Edit cell / Save changes
  - `Tab` - Move to next cell
  - `Shift+Tab` - Move to previous cell
  - `Arrow Keys` - Navigate between cells
  - `Delete/Backspace` - Clear cell value
  - `Escape` - Cancel editing
- **Row-wise and column-wise validation**: Data validation on save
- **Web-based**: Full Excel-like experience in the browser

### 3. Auto-Update Rules

#### A. Task → Register Sync

When a staff member completes or updates a task in the Task Manager:

1. The system checks if the task is linked to a timeline
2. If the timeline's subactivity matches a compliance task type (ITR, GSTR-1, etc.)
3. The corresponding entry in the Compliance Register is automatically updated or created
4. Status mapping:
   - `pending` → `Pending`
   - `ongoing` → `In Progress`
   - `completed` → `Completed`
   - `on_hold` → `Pending`
   - `cancelled` → `Pending`
   - `delayed` → `Pending`

#### B. Register → Client Data Sync

When a user manually enters or edits data in the Register UI:

1. The data is saved to the Compliance Register
2. The system automatically updates the related Client Master / Client Compliance Data
3. No duplicate or manual re-entry is required

### 4. Timeline / Export Modal Flow

The export functionality is integrated with the Timeline Export modal:

- From the Register tab, users can export data
- The export modal supports filtering by:
  - Period (for Register)
  - Activity, Sub-Activity, Frequency, Period (for Timelines)
- The same API logic is reused for both Timeline export and Register export

### 5. API & Architecture

#### Single Source of Truth

The system maintains a single source of truth for compliance status:

- **Compliance Register API**: `/v1/compliance-register`
  - `GET` - Fetch register entries with filters
  - `POST` - Create new register entry
  - `PUT` - Update existing register entry
  - `DELETE` - Delete register entry

- **Client Compliance Data API**: `/v1/clients/:clientId/compliance-data`
  - `PUT` - Update client compliance data

- **Task Sync**: Automatic sync when tasks are updated via `/v1/tasks/:taskId`

#### Reusable APIs

The system uses reusable APIs for:

- Task updates → Register sync
- Register updates → Client data sync
- Real-time or near-real-time synchronization

#### Role-Based Access

The system supports role-based access control:

- **Staff**: Can view and edit register entries
- **Manager**: Can view, edit, and manage register entries
- **Admin**: Full access to all register functions

## Component Structure

### Main Components

1. **ComplianceRegister.tsx**
   - Main register component with Excel-like grid
   - Handles inline editing, keyboard navigation
   - Manages data fetching and saving

2. **registerSync.ts**
   - Utility functions for auto-sync
   - `syncTaskToRegister()` - Syncs task updates to register
   - `syncRegisterToClientData()` - Syncs register updates to client data

3. **Timelines Page (page.tsx)**
   - Main page with tabs: Tasks, Timelines, Register
   - Export modal integration
   - Tab navigation

## Usage

### Accessing the Register

1. Navigate to **Timelines & Tasks** page
2. Click on the **Register** tab
3. The Excel-like grid will display all compliance register entries

### Adding a New Entry

1. Click **Add Row** button
2. Click on any cell to start editing
3. Use keyboard navigation or click to move between cells
4. Press `Enter` or `Tab` to save and move to next cell

### Editing an Entry

1. Click on the cell you want to edit
2. Type the new value
3. Press `Enter` or `Tab` to save
4. The data is automatically synced to Client Data

### Filtering Data

Use the filter controls at the top:

- **Client Name**: Search by client name
- **Task Type**: Filter by compliance task type
- **Status**: Filter by status (Pending, In Progress, Completed, Filed, Approved)
- **Period**: Filter by period
- **Financial Year**: Filter by financial year

### Exporting Data

1. Click the **Export** button
2. For Register: Optionally filter by period
3. Click **Export** in the modal
4. The Excel file will be downloaded

### Auto-Sync Behavior

#### When a Task is Updated:

1. If the task is linked to a timeline with a compliance-related subactivity
2. The system automatically:
   - Creates or updates the corresponding register entry
   - Maps task status to register status
   - Updates client compliance data

#### When Register Entry is Updated:

1. The system automatically:
   - Updates the client's compliance data
   - Maintains data consistency across the system

## Data Model

### ComplianceRegisterEntry

```typescript
interface ComplianceRegisterEntry {
  _id?: string;
  id?: string;
  clientId: string;
  clientName: string;
  taskType: ComplianceTaskType;
  period: string; // FY / Month / Quarter
  financialYear?: string;
  status: RegisterStatus;
  dueDate?: string;
  filedDate?: string;
  approvedDate?: string;
  remarks?: string;
  assignedTo?: string;
  timelineId?: string; // Link to timeline if synced from task
  createdAt?: string;
  updatedAt?: string;
}
```

### ComplianceTaskType

```typescript
type ComplianceTaskType = 
  | 'ITR' 
  | 'GSTR-1' 
  | 'GSTR-3B' 
  | 'TDS Returns' 
  | 'ROC Compliance' 
  | 'Audit & Other Statutory Tasks';
```

### RegisterStatus

```typescript
type RegisterStatus = 
  | 'Pending' 
  | 'In Progress' 
  | 'Completed' 
  | 'Filed' 
  | 'Approved';
```

## API Endpoints

### Compliance Register

#### GET /v1/compliance-register

Fetch compliance register entries with optional filters.

**Query Parameters:**
- `clientName` - Filter by client name
- `taskType` - Filter by task type
- `status` - Filter by status
- `period` - Filter by period
- `financialYear` - Filter by financial year
- `limit` - Number of results (default: 10)
- `page` - Page number (default: 1)

**Response:**
```json
{
  "results": [
    {
      "id": "123",
      "clientId": "456",
      "clientName": "ABC Corp",
      "taskType": "ITR",
      "period": "Q1-2024",
      "financialYear": "2024-2025",
      "status": "Completed",
      "dueDate": "2024-04-30",
      "filedDate": "2024-04-25",
      "approvedDate": "2024-04-28"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

#### POST /v1/compliance-register

Create a new compliance register entry.

**Request Body:**
```json
{
  "clientId": "456",
  "clientName": "ABC Corp",
  "taskType": "ITR",
  "period": "Q1-2024",
  "financialYear": "2024-2025",
  "status": "Pending",
  "dueDate": "2024-04-30"
}
```

#### PUT /v1/compliance-register/:id

Update an existing compliance register entry.

**Request Body:** Same as POST

#### DELETE /v1/compliance-register/:id

Delete a compliance register entry.

### Client Compliance Data

#### PUT /v1/clients/:clientId/compliance-data

Update client compliance data (auto-synced from register).

**Request Body:**
```json
{
  "taskType": "ITR",
  "period": "Q1-2024",
  "status": "Completed",
  "dueDate": "2024-04-30",
  "filedDate": "2024-04-25",
  "approvedDate": "2024-04-28",
  "financialYear": "2024-2025"
}
```

## Integration with Task Management

### Task Update Hook

When a task is updated, the system automatically:

1. Checks if the task has an associated timeline
2. Identifies if the timeline's subactivity is a compliance task
3. Creates or updates the register entry
4. Syncs to client compliance data

### Implementation

The sync is handled by the `registerSync.ts` utility:

```typescript
import { syncTaskToRegister } from '@/app/(components)/(contentlayout)/timelines/utils/registerSync';

// In task update handler
await syncTaskToRegister(updatedTask);
```

## Best Practices

1. **Always use the Register UI** for compliance data entry
2. **Let auto-sync handle** the synchronization between systems
3. **Use filters** to find specific entries quickly
4. **Export regularly** for backup and reporting
5. **Keep period and financial year** consistent for accurate reporting

## Troubleshooting

### Auto-sync not working

- Check if the task has an associated timeline
- Verify the timeline's subactivity matches a compliance task type
- Check browser console for API errors
- Verify authentication token is valid

### Data not saving

- Check network connection
- Verify API endpoint is accessible
- Check browser console for errors
- Ensure required fields are filled

### Export not working

- Check if there's data to export
- Verify Excel export library is loaded
- Check browser download permissions

## Future Enhancements

- Bulk import from Excel
- Advanced filtering and search
- Compliance calendar view
- Automated reminders
- Reporting and analytics dashboard
- Integration with external compliance systems
