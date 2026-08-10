import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';

export interface FrequencyStatusData {
  frequency: string;
  totalPeriods: number;
  statusBreakdown: {
    pending: { count: number; periods: string[] };
    completed: { count: number; periods: string[] };
    delayed: { count: number; periods: string[] };
    ongoing: { count: number; periods: string[] };
  };
}

export interface TimelinePeriodData {
  period: string;
  status: string;
  completedAt: string | null;
  notes: string;
  timelineId: string;
  activity: string;
  client: string;
  assignedMember: string;
  branch: string;
}

export interface FrequencyAnalyticsData {
  frequency: string;
  totalPeriods: number;
  pendingCount: number;
  completedCount: number;
  delayedCount: number;
  ongoingCount: number;
  completionRate: number;
}

export interface StatusTrendsData {
  interval: string;
  totalCount: number;
  statusBreakdown: {
    pending: number;
    completed: number;
    delayed: number;
    ongoing: number;
  };
}

export interface CompletionRatesData {
  totalPeriods: number;
  completedPeriods: number;
  delayedPeriods: number;
  ongoingPeriods: number;
  pendingPeriods: number;
  completionRate: number;
  onTimeRate: number;
}

export interface FrequencyStatusStats {
  pending: number;
  ongoing: number;
  delayed: number;
  completed: number;
  total: number;
}

export interface TaskTrendsData {
  interval: string;
  totalTasks: number;
  statusBreakdown: {
    pending: number;
    ongoing: number;
    completed: number;
    on_hold: number;
    cancelled: number;
    delayed: number;
  };
  priorityBreakdown: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
}

export interface TaskTrendsResponse {
  interval: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalTasks: number;
  trends: TaskTrendsData[];
}

// Task Analytics Interfaces
export interface TaskAnalyticsResponse {
  groupBy: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalTasks: number;
  totalGroups: number;
  analytics: TaskAnalyticsData[];
}

export interface TaskAnalyticsData {
  status?: string;
  priority?: string;
  branch?: string;
  teamMember?: string;
  month?: string;
  week?: string;
  count: number;
  tasks: TaskDetail[];
  statusBreakdown: {
    pending: number;
    ongoing: number;
    completed: number;
    on_hold: number;
    cancelled: number;
    delayed: number;
  };
  priorityBreakdown: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
}

export interface TaskDetail {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  teamMember: string;
  assignedBy: string;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  frequency?: string;
  status?: string;
  interval?: string;
}

class DashboardService {
  private getHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get timeline status by frequency
  async getTimelineStatusByFrequency(filters: DashboardFilters): Promise<FrequencyStatusData[]> {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-status-by-frequency`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data.results || [];
    } catch (error) {
      throw error;
    }
  }

  // Get timeline status by period
  async getTimelineStatusByPeriod(filters: DashboardFilters): Promise<{
    frequency: string;
    dateRange: { startDate: string; endDate: string };
    period?: string;
    totalPeriods: number;
    periods: TimelinePeriodData[];
  }> {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-status-by-period`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get timeline frequency analytics
  async getTimelineFrequencyAnalytics(filters: DashboardFilters): Promise<FrequencyAnalyticsData[]> {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-frequency-analytics`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data.analytics || [];
    } catch (error) {
      throw error;
    }
  }

  // Get timeline status trends
  async getTimelineStatusTrends(filters: DashboardFilters): Promise<StatusTrendsData[]> {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-status-trends`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data.trends || [];
    } catch (error) {
      throw error;
    }
  }

  // Get timeline completion rates
  async getTimelineCompletionRates(filters: DashboardFilters): Promise<CompletionRatesData> {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-completion-rates`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data.overallStats;
    } catch (error) {
      throw error;
    }
  }

  // Get frequency status stats
  async getFrequencyStatusStats(filters: DashboardFilters): Promise<FrequencyStatusStats> {
    try {
      const response = await axios.get(`${Base_url}timelines/frequency-status-stats`, {
        headers: this.getHeaders(),
        params: filters
      });
      const breakdown = response.data?.data?.statusBreakdown || response.data?.statusBreakdown || {};
      const total = response.data?.data?.totalTimelines ?? response.data?.total ?? 0;
      return {
        pending: breakdown.pending || 0,
        ongoing: breakdown.ongoing || 0,
        delayed: breakdown.delayed || 0,
        completed: breakdown.completed || 0,
        total,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get existing dashboard data (keeping for backward compatibility)
  async getDashboardData(branchId?: string) {
    try {
      const headers = this.getHeaders();
      const branchParams = branchId ? { branchId } : {};

      const [
        branchesResponse,
        customersResponse,
        teamsResponse,
        activitiesResponse,
        tasksResponse
      ] = await Promise.all([
        axios.get(`${Base_url}dashboard/total-branches`, { headers }),
        axios.get(`${Base_url}dashboard/total-clients`, { headers, params: branchParams }),
        axios.get(`${Base_url}dashboard/total-teams`, { headers, params: branchParams }),
        axios.get(`${Base_url}dashboard/total-activities`, { headers }),
        axios.get(`${Base_url}dashboard/total-ongoing-tasks`, { headers, params: branchParams })
      ]);

      return {
        totalBranches: branchesResponse.data.total || 0,
        totalCustomers: customersResponse.data.total || 0,
        totalTeams: teamsResponse.data.total || 0,
        totalActivities: activitiesResponse.data.total || 0,
        totalOngoingTasks: tasksResponse.data.total || 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Get timeline counts by branch
  async getTimelineCountsByBranch(branchId: string) {
    try {
      const response = await axios.get(`${Base_url}dashboard/timeline-counts-by-branch`, {
        headers: this.getHeaders(),
        params: { branchId }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get assigned task counts
  async getAssignedTaskCounts(branchId: string) {
    try {
      const response = await axios.get(`${Base_url}dashboard/assigned-task-counts`, {
        headers: this.getHeaders(),
        params: { branchId }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get top clients
  async getTopClients(branchId: string) {
    try {
      const response = await axios.get(`${Base_url}dashboard/top-clients`, {
        headers: this.getHeaders(),
        params: { branchId }
      });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get top activities
  async getTopActivities(branchId: string) {
    try {
      const response = await axios.get(`${Base_url}dashboard/top-activities`, {
        headers: this.getHeaders(),
        params: { branchId }
      });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get task trends
  async getTaskTrends(filters: DashboardFilters): Promise<TaskTrendsResponse> {
    try {
      const response = await axios.get(`${Base_url}dashboard/task-trends`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get task analytics
  async getTaskAnalytics(filters: DashboardFilters & { groupBy: string }): Promise<TaskAnalyticsResponse> {
    try {
      const response = await axios.get(`${Base_url}dashboard/task-analytics`, {
        headers: this.getHeaders(),
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Single round-trip dashboard summary (totals + charts + analytics).
   * @param filters - branch / frequency / interval filters
   */
  async getDashboardSummary(filters: DashboardFilters = {}) {
    const response = await axios.get(`${Base_url}dashboard/summary`, {
      headers: this.getHeaders(),
      params: filters,
    });
    return response.data;
  }
}

export default new DashboardService(); 