/**
 * Auto-sync utility for Compliance Register
 * Handles synchronization between Tasks, Register, and Client Data
 */

import { Base_url } from '@/app/api/config/BaseUrl';

export type ComplianceTaskType = 
  | 'ITR' 
  | 'GSTR-1' 
  | 'GSTR-3B' 
  | 'TDS Returns' 
  | 'ROC Compliance' 
  | 'Audit & Other Statutory Tasks';

export type RegisterStatus = 'Pending' | 'In Progress' | 'Completed' | 'Filed' | 'Approved';

interface Task {
  id?: string;
  _id?: string;
  timeline?: Array<{
    id?: string;
    _id?: string;
    activity?: {
      name?: string;
    };
    subactivity?: {
      name?: string;
    };
    client?: {
      id?: string;
      _id?: string;
      name?: string;
    };
    period?: string;
    financialYear?: string;
    status?: string;
  }>;
  status?: string;
  remarks?: string;
}

interface RegisterEntry {
  clientId: string;
  clientName: string;
  taskType: ComplianceTaskType;
  period: string;
  financialYear?: string;
  status: RegisterStatus;
  dueDate?: string;
  filedDate?: string;
  approvedDate?: string;
  remarks?: string;
  timelineId?: string;
}

/**
 * Map task status to register status
 */
const mapTaskStatusToRegisterStatus = (taskStatus: string): RegisterStatus => {
  const statusMap: Record<string, RegisterStatus> = {
    'pending': 'Pending',
    'ongoing': 'In Progress',
    'completed': 'Completed',
    'on_hold': 'Pending',
    'cancelled': 'Pending',
    'delayed': 'Pending'
  };
  return statusMap[taskStatus.toLowerCase()] || 'Pending';
};

/**
 * Map subactivity name to compliance task type
 */
const mapSubactivityToTaskType = (subactivityName: string): ComplianceTaskType | null => {
  const name = subactivityName.toLowerCase();
  
  if (name.includes('itr') || name.includes('income tax')) {
    return 'ITR';
  } else if (name.includes('gstr-1') || name.includes('gstr1')) {
    return 'GSTR-1';
  } else if (name.includes('gstr-3b') || name.includes('gstr3b')) {
    return 'GSTR-3B';
  } else if (name.includes('tds') || name.includes('tax deducted')) {
    return 'TDS Returns';
  } else if (name.includes('roc') || name.includes('registrar of companies')) {
    return 'ROC Compliance';
  } else if (name.includes('audit') || name.includes('statutory')) {
    return 'Audit & Other Statutory Tasks';
  }
  
  return null;
};

/**
 * Sync task completion/update to Compliance Register
 * Called when a task is completed or updated
 */
export const syncTaskToRegister = async (task: Task): Promise<void> => {
  try {
    if (!task.timeline || task.timeline.length === 0) {
      return; // No timeline associated, skip sync
    }

    const timeline = task.timeline[0];
    if (!timeline.client || !timeline.subactivity) {
      return; // Missing required data
    }

    const taskType = mapSubactivityToTaskType(timeline.subactivity.name || '');
    if (!taskType) {
      return; // Not a compliance task type
    }

    const registerEntry: RegisterEntry = {
      clientId: timeline.client.id || timeline.client._id || '',
      clientName: timeline.client.name || '',
      taskType,
      period: timeline.period || '',
      financialYear: timeline.financialYear,
      status: mapTaskStatusToRegisterStatus(task.status || 'pending'),
      remarks: task.remarks,
      timelineId: timeline.id || timeline._id
    };

    // Check if register entry already exists
    const existingEntry = await findRegisterEntry(
      registerEntry.clientId,
      registerEntry.taskType,
      registerEntry.period
    );

    if (existingEntry) {
      // Update existing entry
      await fetch(`${Base_url}compliance-register/${existingEntry.id || existingEntry._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...registerEntry,
          status: task.status === 'completed' ? 'Completed' : registerEntry.status,
          filedDate: task.status === 'completed' ? new Date().toISOString() : existingEntry.filedDate
        })
      });
    } else {
      // Create new entry
      await fetch(`${Base_url}compliance-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(registerEntry)
      });
    }

    // Sync to client data
    await syncRegisterToClientData(registerEntry);
  } catch (error) {
    console.error('Failed to sync task to register:', error);
    // Don't throw - this is background sync
  }
};

/**
 * Find existing register entry
 */
const findRegisterEntry = async (
  clientId: string,
  taskType: ComplianceTaskType,
  period: string
): Promise<any | null> => {
  try {
    const response = await fetch(
      `${Base_url}compliance-register?clientId=${clientId}&taskType=${taskType}&period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const results = data.results || data;
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    }
    return null;
  } catch (error) {
    console.error('Failed to find register entry:', error);
    return null;
  }
};

/**
 * Sync register entry to client compliance data
 */
export const syncRegisterToClientData = async (entry: RegisterEntry): Promise<void> => {
  try {
    await fetch(`${Base_url}clients/${entry.clientId}/compliance-data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        taskType: entry.taskType,
        period: entry.period,
        status: entry.status,
        dueDate: entry.dueDate,
        filedDate: entry.filedDate,
        approvedDate: entry.approvedDate,
        financialYear: entry.financialYear
      })
    });
  } catch (error) {
    console.error('Failed to sync register to client data:', error);
    // Don't throw - this is background sync
  }
};

// For non-React contexts
export default {
  syncTaskToRegister,
  syncRegisterToClientData
};
