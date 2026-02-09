/**
 * Types for client/group year report APIs:
 * GET /v1/clients/:clientId/report, GET /v1/groups/:groupId/report
 */

export interface ReportClientRef {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  status?: string;
}

export interface ReportTimelineItem {
  _id: string;
  activity: { _id: string; name: string };
  subactivity: { _id: string; name: string };
  status: string;
  period?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  frequency?: string;
  timelineType?: string;
  referenceNumber?: string;
}

export interface ReportStatusSummary {
  pending: number;
  completed: number;
  delayed: number;
  ongoing: number;
  total: number;
}

export interface TurnoverHistoryItem {
  _id?: string;
  year: string;
  turnover: string;
}

/** Previous-year block (e.g. auditingPreviousYear) */
export interface PreviousYearBlock {
  financialYear: string;
  timelines: ReportTimelineItem[];
}

/** GET /v1/clients/:clientId/report */
export interface ClientReportResponse {
  client: ReportClientRef;
  financialYear: string;
  turnover: string;
  turnoverHistory: TurnoverHistoryItem[];
  timelines: ReportTimelineItem[];
  statusSummary: ReportStatusSummary;
  pendings: ReportTimelineItem[];
  /** Optional: activity-specific previous year timelines (e.g. Auditing) */
  auditingPreviousYear?: PreviousYearBlock;
  /** Optional: activity-specific next year timelines (e.g. Auditing) */
  auditingNextYear?: PreviousYearBlock;
}

/** Single client block inside group report */
export interface GroupReportClientBlock {
  client: ReportClientRef;
  financialYear: string;
  turnover: string;
  turnoverHistory: TurnoverHistoryItem[];
  timelines: ReportTimelineItem[];
  statusSummary: ReportStatusSummary;
  pendings: ReportTimelineItem[];
}

/** GET /v1/groups/:groupId/report */
export interface GroupReportResponse {
  group: { _id: string; name: string; branch?: string | { _id: string; name: string } };
  financialYear: string;
  clients: GroupReportClientBlock[];
  summary: {
    totalClients: number;
    totalTimelines: number;
    totalPending: number;
    totalCompleted: number;
  };
}
