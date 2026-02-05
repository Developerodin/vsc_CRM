/**
 * Types for group analytics API response (GET /v1/groups/:groupId/analytics)
 */

export interface Group {
  _id: string;
  name: string;
  branch: { _id: string; name: string };
  numberOfClients: number;
}

export interface ClientActivity {
  activity: { _id: string; name: string };
  subactivity: string;
  assignedDate: string;
  status: string;
  notes?: string;
}

export interface TimelineByActivityCurrentFY {
  activityId: string;
  activityName: string;
  completedCurrentFY: number;
  pendingCurrentFY: number;
  totalCurrentFY: number;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  category: string;
  turnover: string;
  turnoverHistory: Array<{ _id: string; year: string; turnover: string }>;
  activities: ClientActivity[];
  taskCount: number;
  timelineCount: number;
  timelineByActivityCurrentFY: TimelineByActivityCurrentFY[];
}

export interface TaskAnalytics {
  total: number;
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

export interface TimelineAnalytics {
  total: number;
  statusBreakdown: {
    pending: number;
    ongoing: number;
    completed: number;
    delayed: number;
  };
  frequencyBreakdown: {
    None: number;
    OneTime: number;
    Hourly: number;
    Daily: number;
    Weekly: number;
    Monthly: number;
    Quarterly: number;
    Yearly: number;
  };
}

export interface TurnoverByClient {
  clientId: string;
  clientName: string;
  category: string;
  year?: string;
  turnover?: string;
}

export interface GroupTurnoverSummary {
  currentFY: string;
  turnoverByClient: TurnoverByClient[];
  clientsWithTurnover: number;
}

export interface ActivityWiseTimelineItem {
  activityId: string;
  activityName: string;
  completedCurrentFY: number;
  pendingCurrentFY: number;
  totalCurrentFY: number;
}

export interface ActivityWiseTimelineAnalytics {
  currentFY: string;
  byActivity: ActivityWiseTimelineItem[];
}

export interface GroupAnalyticsResponse {
  group: Group;
  clients: Client[];
  taskAnalytics: TaskAnalytics;
  timelineAnalytics: TimelineAnalytics;
  currentFY: string;
  groupTurnoverSummary: GroupTurnoverSummary;
  activityWiseTimelineAnalytics: ActivityWiseTimelineAnalytics;
}
