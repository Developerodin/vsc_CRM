import { useState, useCallback } from 'react';

export interface TaskStatus {
  pending: boolean;
  completed: boolean;
  delayed: boolean;
  ongoing: boolean;
}

export interface AdvancedFilters {
  clientName: string;
  minTasks: string;
  maxTasks: string;
  minClients: string;
  maxClients: string;
  taskStatus: TaskStatus;
}

export interface GroupWithTasks {
  id: string;
  name: string;
  numberOfClients: number;
  clients: Array<{
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
  }>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  taskStats: {
    total: number;
    pending: number;
    completed: number;
    delayed: number;
    ongoing: number;
  };
}

export const useGroupFilters = () => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    clientName: "",
    minTasks: "",
    maxTasks: "",
    minClients: "",
    maxClients: "",
    taskStatus: {
      pending: false,
      completed: false,
      delayed: false,
      ongoing: false
    }
  });

  // Check if any advanced filters are active
  const hasActiveAdvancedFilters = useCallback(() => {
    return (
      advancedFilters.clientName ||
      advancedFilters.minTasks ||
      advancedFilters.maxTasks ||
      advancedFilters.minClients ||
      advancedFilters.maxClients ||
      Object.values(advancedFilters.taskStatus).some(Boolean)
    );
  }, [advancedFilters]);

  // Apply advanced filters to groups
  const applyAdvancedFilters = useCallback((groupsData: GroupWithTasks[]) => {
    if (!hasActiveAdvancedFilters()) return groupsData;

    return groupsData.filter(group => {
      // Filter by client name (search within group's clients)
      if (advancedFilters.clientName) {
        const hasMatchingClient = group.clients.some(client =>
          client.name.toLowerCase().includes(advancedFilters.clientName.toLowerCase())
        );
        if (!hasMatchingClient) return false;
      }

      // Filter by task count range
      if (advancedFilters.minTasks && group.taskStats.total < parseInt(advancedFilters.minTasks)) {
        return false;
      }
      if (advancedFilters.maxTasks && group.taskStats.total > parseInt(advancedFilters.maxTasks)) {
        return false;
      }

      // Filter by client count range
      if (advancedFilters.minClients && group.numberOfClients < parseInt(advancedFilters.minClients)) {
        return false;
      }
      if (advancedFilters.maxClients && group.numberOfClients > parseInt(advancedFilters.maxClients)) {
        return false;
      }

      // Filter by task status
      if (Object.values(advancedFilters.taskStatus).some(Boolean)) {
        const hasMatchingStatus = Object.entries(advancedFilters.taskStatus).some(([status, isActive]) => {
          if (!isActive) return false;
          return group.taskStats[status as keyof typeof group.taskStats] > 0;
        });
        if (!hasMatchingStatus) return false;
      }

      return true;
    });
  }, [advancedFilters, hasActiveAdvancedFilters]);

  // Clear all advanced filters
  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      clientName: "",
      minTasks: "",
      maxTasks: "",
      minClients: "",
      maxClients: "",
      taskStatus: {
        pending: false,
        completed: false,
        delayed: false,
        ongoing: false
      }
    });
  }, []);

  // Update a specific filter
  const updateFilter = useCallback((key: keyof AdvancedFilters, value: string | TaskStatus) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Update task status filter
  const updateTaskStatusFilter = useCallback((status: keyof TaskStatus, value: boolean) => {
    setAdvancedFilters(prev => ({
      ...prev,
      taskStatus: {
        ...prev.taskStatus,
        [status]: value
      }
    }));
  }, []);

  return {
    showAdvancedFilters,
    setShowAdvancedFilters,
    advancedFilters,
    hasActiveAdvancedFilters,
    applyAdvancedFilters,
    clearAdvancedFilters,
    updateFilter,
    updateTaskStatusFilter
  };
};
