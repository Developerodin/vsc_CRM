"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useBranchContext } from '@/shared/contextapi';

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

interface DashboardCardData {
  value: number | string;
  growth: string;
  period: string;
}

interface DashboardCardsResponse {
  success: boolean;
  message: string;
  data: {
    totalTeamMembers: DashboardCardData;
    completionRate: DashboardCardData;
    tasksCompleted: DashboardCardData;
    workloadBalance: DashboardCardData;
  };
}

interface CompletionTrend {
  month: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface CompletionTrendsResponse {
  success: boolean;
  message: string;
  data: {
    trends: CompletionTrend[];
    summary: {
      totalCompleted: number;
      totalTasks: number;
      averageCompletionRate: string;
    };
  };
}

interface TopMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: string;
}

interface TopByCompletionResponse {
  success: boolean;
  message: string;
  data: {
    topMembers: TopMember[];
    summary: {
      totalCompleted: number;
      averageCompletion: string;
    };
  };
}

interface BranchTopMembers {
  branchId: string;
  branchName: string;
  topMembers: TopMember[];
  summary: {
    totalCompleted: number;
    averageCompletion: string;
  };
}

interface TopByBranchResponse {
  success: boolean;
  message: string;
  data: {
    branches?: BranchTopMembers[];
    branchId?: string;
    branchName?: string;
    topMembers?: TopMember[];
    summary?: {
      totalCompleted: number;
      averageCompletion: string;
      totalBranches?: number;
    };
  };
}

interface TopByCompletionResponse {
  success: boolean;
  message: string;
  data: {
    topMembers: TopMember[];
    summary: {
      totalCompleted: number;
      averageCompletion: string;
    };
  };
}

interface GlobalTeamMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  branch: {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
  };
  skills: {
    total: number;
    list: Activity[];
  };
  tasks: {
    total: number;
    byStatus: {
      completed: number;
      pending: number;
      ongoing: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
    status: {
      pending: number;
      ongoing: number;
      completed: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
    completionRate: number;
  };
  timelines: {
    total: number;
    summary: Array<{
      _id: string;
      status: string;
      startDate: string;
      endDate: string;
      frequency: string;
      client: {
        _id: string;
        name: string;
        email: string;
        phone: string;
      };
      activity: {
        _id: string;
        name: string;
      };
    }>;
  };
  clients: {
    total: number;
    list: Array<{
      _id: string;
      name: string;
      email: string;
      phone: string;
      address: string;
      state: string;
      country: string;
      businessType: string;
      entityType: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  name: string;
}

interface GlobalTeamMembersResponse {
  success: boolean;
  message: string;
  data: {
    teamMembers: GlobalTeamMember[];
    total: number;
    page: number;
    limit: number;
  };
}

interface Client {
  _id: string;
  name: string;
  email: string;
  email2?: string;
  phone: string;
  address: string;
  district: string;
  state: string;
  country: string;
  pan: string;
  dob: string | null;
  businessType: string;
  gstNumber: string;
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  iecCode: string;
  entityType: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  branch: {
    _id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
  };
  activities: {
    assigned: Array<{
      _id: string;
      activity: {
        _id: string;
        name: string;
      };
      assignedDate: string;
      notes: string;
    }>;
    total: number;
    summary: Array<{
      id: string;
      name: string;
    }>;
  };
  teamMembers: {
    total: number;
    members: Array<{
      _id: string;
      name: string;
      email: string;
      phone: string;
    }>;
  };
  tasks: {
    total: number;
    byStatus: {
      completed: number;
      pending: number;
      ongoing: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
    status: {
      pending: number;
      ongoing: number;
      completed: number;
      on_hold: number;
      delayed: number;
      cancelled: number;
    };
  };
  timelines: {
    total: number;
    summary: Array<{
      id: string;
      client: string;
    }>;
    hasTimelines: boolean;
  };
}



const AnalyticsPage = () => {
  const router = useRouter();
  const { branches, allBranchesAccess } = useBranchContext();
  const showBranchFilter = allBranchesAccess || branches.length > 1;

  /**
   * Build optional branch query string for analytics API calls.
   * @param {string} branchId - Selected branch id or "all"
   * @param {'?' | '&'} prefix - Query string prefix when branch is set
   * @returns {string} Query fragment or empty string
   */
  const getBranchQuery = (branchId: string, prefix: '?' | '&' = '&') =>
    branchId !== 'all' ? `${prefix}branch=${branchId}` : '';
  const [dashboardData, setDashboardData] = useState<DashboardCardsResponse['data'] | null>(null);
  const [completionTrends, setCompletionTrends] = useState<CompletionTrendsResponse['data'] | null>(null);
  const [topByCompletion, setTopByCompletion] = useState<TopByCompletionResponse['data'] | null>(null);
  const [topByBranch, setTopByBranch] = useState<TopByBranchResponse['data'] | null>(null);
  const [globalTeamMembers, setGlobalTeamMembers] = useState<GlobalTeamMembersResponse['data'] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [topCompletionLoading, setTopCompletionLoading] = useState(true);
  const [topBranchLoading, setTopBranchLoading] = useState(true);
  const [globalTeamLoading, setGlobalTeamLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [chartType, setChartType] = useState<'combined' | 'separate'>('combined');
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedMemberForClients, setSelectedMemberForClients] = useState<any>(null);
  const [showClientsModal, setShowClientsModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchCompletionTrends(selectedMonths);
    fetchTopByCompletion();
    fetchTopByBranch();
    fetchGlobalTeamMembers();
    fetchClients();
    fetchGroups();
  }, [selectedBranch]);

  useEffect(() => {
    fetchCompletionTrends(selectedMonths);
  }, [selectedMonths, selectedBranch]);

  useEffect(() => {
    fetchTopByCompletion();
    fetchTopByBranch();
  }, [selectedBranch, dateRange]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showClientsModal) {
        setShowClientsModal(false);
        setSelectedMemberForClients(null);
      }
    };

    if (showClientsModal) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showClientsModal]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${Base_url}analytics/team-members/dashboard-cards${getBranchQuery(selectedBranch, '?')}`,
        {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
        const result: DashboardCardsResponse = response.data;
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionTrends = async (months: number) => {
    try {
      setTrendsLoading(true);
      const response = await axios.get(
        `${Base_url}analytics/team-members/completion-trends?months=${months}${getBranchQuery(selectedBranch)}`,
        {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: CompletionTrendsResponse = response.data;
      setCompletionTrends(result.data);
    } catch (err) {
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchTopByCompletion = async () => {
    try {
      setTopCompletionLoading(true);
      let url = `${Base_url}analytics/team-members/top-by-completion?limit=10${getBranchQuery(selectedBranch)}`;
      
      if (dateRange.startDate && dateRange.endDate) {
        url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: TopByCompletionResponse = response.data;
      setTopByCompletion(result.data);
    } catch (err) {
    } finally {
      setTopCompletionLoading(false);
    }
  };

  const fetchTopByBranch = async () => {
    try {
      setTopBranchLoading(true);
      let url = `${Base_url}analytics/team-members/top-by-branch?limit=5`;
      
      if (selectedBranch !== "all") {
        url += `&branchId=${selectedBranch}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result: TopByBranchResponse = response.data;
      setTopByBranch(result.data);
    } catch (err) {
    } finally {
      setTopBranchLoading(false);
    }
  };

  const fetchGlobalTeamMembers = async () => {
    try {
      setGlobalTeamLoading(true);
      const response = await axios.get(
        `${Base_url}analytics/team-members/table?page=1&limit=5${getBranchQuery(selectedBranch)}`,
        {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // The API returns data in response.data.results, not response.data.data
      const apiData = response.data;
      const transformedData = {
        teamMembers: apiData.data?.results || [],
        total: apiData.data?.totalResults || 0,
        page: apiData.data?.page || 1,
        limit: apiData.data?.limit || 5
      };
      
      setGlobalTeamMembers(transformedData);
    } catch (err) {
    } finally {
      setGlobalTeamLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await axios.get(
        `${Base_url}analytics/clients/table?page=1&limit=5${getBranchQuery(selectedBranch)}`,
        {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setClients(response.data.data?.results || []);
    } catch (err) {
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      const response = await axios.get(
        `${Base_url}groups/analytics${getBranchQuery(selectedBranch, '?')}`,
        {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setGroups(response.data.groups || []);
    } catch (err) {
    } finally {
      setGroupsLoading(false);
    }
  };

  const getScoreColor = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
    if (numValue >= 90) return 'text-green-600';
    if (numValue >= 80) return 'text-blue-600';
    if (numValue >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionRateColor = (rate: string) => {
    const numRate = parseFloat(rate.replace('%', ''));
    if (numRate >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (numRate >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (numRate >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Helper function to normalize task data for better chart display
  const normalizeTaskData = (data: number[]) => {
    if (!data || data.length === 0) return data;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    
    // If all values are very small (less than 1), scale them up for better visibility
    if (maxValue < 1 && maxValue > 0) {
      return data.map(value => Math.round(value * 100) / 100);
    }
    
    // If values are already reasonable, just round them
    return data.map(value => Math.round(value * 100) / 100);
  };

  // Chart options for completion trends
  const getChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 400,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    dataLabels: { enabled: false },
    grid: { 
      borderColor: '#E5E7EB',
      strokeDashArray: 4
    },
    xaxis: {
      categories: completionTrends?.trends.map(t => t.month) || [],
      labels: { 
        style: { colors: '#6B7280' },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: [
      {
        title: {
          text: 'Number of Tasks',
          style: { color: '#6B7280' }
        },
        labels: { 
          style: { colors: '#6B7280' },
          formatter: function(value: any) {
            return String(Math.round(Number(value) * 100) / 100);
          }
        },
        min: 0,
        forceNiceScale: true,
        tickAmount: 5
      },
      {
        opposite: true,
        title: {
          text: 'Completion Rate (%)',
          style: { color: '#6B7280' }
        },
        labels: { 
          style: { colors: '#6B7280' },
          formatter: function(value: any) {
            return String(Math.round(Number(value) * 100) / 100) + '%';
          }
        },
        min: 0,
        max: 100
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        endingShape: 'rounded' as const
      }
    },
    legend: {
      position: 'top' as const,
      labels: { colors: '#374151' }
    },
    tooltip: {
      theme: 'light' as const,
      shared: true,
      intersect: false,
      y: [
        {
          formatter: function(value: any) {
            return String(Math.round(Number(value) || 0)) + ' tasks';
          }
        },
        {
          formatter: function(value: any) {
            return String(Math.round(Number(value) || 0)) + ' tasks';
          }
        },
        {
          formatter: function(value: any) {
            return String(Math.round(Number(value) || 0)) + '%';
          }
        }
      ]
    }
  });

  const getChartSeries = () => [
    {
      name: 'Completed Tasks',
      type: 'column',
      data: normalizeTaskData(completionTrends?.trends.map(t => Number(t.completed)) || [])
    },
    {
      name: 'Total Tasks',
      type: 'column',
      data: normalizeTaskData(completionTrends?.trends.map(t => Number(t.total)) || [])
    },
    {
      name: 'Completion Rate',
      type: 'line',
      data: completionTrends?.trends.map(t => Math.round(Number(t.completionRate) * 100) / 100) || []
    }
  ];

  // Separate chart options for tasks only
  const getTasksChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#3B82F6', '#10B981'],
    dataLabels: { enabled: false },
    grid: { 
      borderColor: '#E5E7EB',
      strokeDashArray: 4
    },
    xaxis: {
      categories: completionTrends?.trends.map(t => t.month) || [],
      labels: { 
        style: { colors: '#6B7280' },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: {
      title: {
        text: 'Number of Tasks',
        style: { color: '#6B7280' }
      },
      labels: { 
        style: { colors: '#6B7280' },
        formatter: function(value: any) {
          return String(Math.round(Number(value) * 100) / 100);
        }
      },
      min: 0,
      forceNiceScale: true,
      tickAmount: 5
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        endingShape: 'rounded' as const
      }
    },
    legend: {
      position: 'top' as const,
      labels: { colors: '#374151' }
    },
    tooltip: {
      theme: 'light' as const,
      y: {
        formatter: function(value: any) {
          return String(Math.round(Number(value) || 0)) + ' tasks';
        }
      }
    }
  });

  // Separate chart options for completion rate only
  const getCompletionRateChartOptions = () => ({
    chart: {
      type: 'line' as const,
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#F59E0B'],
    dataLabels: { enabled: false },
    grid: { 
      borderColor: '#E5E7EB',
      strokeDashArray: 4
    },
    xaxis: {
      categories: completionTrends?.trends.map(t => t.month) || [],
      labels: { 
        style: { colors: '#6B7280' },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: {
      title: {
        text: 'Completion Rate (%)',
        style: { color: '#6B7280' }
      },
      labels: { 
        style: { colors: '#6B7280' },
        formatter: function(value: any) {
          return String(Math.round(Number(value) || 0)) + '%';
        }
      },
      min: 0,
      max: 100
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    markers: {
      size: 6,
      hover: {
        size: 8
      }
    },
    legend: {
      position: 'top' as const,
      labels: { colors: '#374151' }
    },
    tooltip: {
      theme: 'light' as const,
      y: {
        formatter: function(value: any) {
          return String(Math.round(Number(value) || 0)) + '%';
        }
      }
    }
  });

  // Separate chart series for tasks only
  const getTasksChartSeries = () => [
    {
      name: 'Completed Tasks',
      data: normalizeTaskData(completionTrends?.trends.map(t => Number(t.completed)) || [])
    },
    {
      name: 'Total Tasks',
      data: normalizeTaskData(completionTrends?.trends.map(t => Number(t.total)) || [])
    }
  ];

  // Separate chart series for completion rate only
  const getCompletionRateChartSeries = () => [
    {
      name: 'Completion Rate',
      data: completionTrends?.trends.map(t => Math.round(Number(t.completionRate) * 100) / 100) || []
    }
  ];

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Analytics" />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            <p className="mt-3 text-[11px] font-medium text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Seo title="Analytics" />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-xl text-red-500" />
            </div>
            <p className="text-[12px] text-red-600 font-medium mb-4">Error loading dashboard data</p>
            <button onClick={fetchDashboardData} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Analytics" />

      {/* Page Header – timelines-style */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
            <div>
              <h1 className="text-[0.875rem] font-bold text-gray-800">Analytics Dashboard</h1>
              <p className="text-[11px] text-[#495057] mt-0.5">Key performance metrics and team insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics – timelines-style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-sky-50 border border-sky-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-sky-700">Total Team Members</span>
              <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData?.totalTeamMembers.value}</p>
              <p className="text-[10px] text-[#495057] mt-1">{dashboardData?.totalTeamMembers.growth} {dashboardData?.totalTeamMembers.period}</p>
            </div>
            <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center">
              <i className="ri-team-line text-sky-600 text-sm" />
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700">Completion Rate</span>
              <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData?.completionRate.value}</p>
              <p className="text-[10px] text-[#495057] mt-1">{dashboardData?.completionRate.growth} {dashboardData?.completionRate.period}</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <i className="ri-check-double-line text-emerald-600 text-sm" />
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-700">Tasks Completed</span>
              <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData?.tasksCompleted.value}</p>
              <p className="text-[10px] text-[#495057] mt-1">{dashboardData?.tasksCompleted.growth} {dashboardData?.tasksCompleted.period}</p>
            </div>
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="ri-task-line text-purple-600 text-sm" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700">Workload Balance</span>
              <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData?.workloadBalance.value}</p>
              <p className="text-[10px] text-[#495057] mt-1">{dashboardData?.workloadBalance.growth} {dashboardData?.workloadBalance.period}</p>
            </div>
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-balance-line text-amber-600 text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Task Completion Trends Chart – timelines-style card */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-gray-800">Task Completion Trends</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="months-filter" className="text-[11px] font-medium text-[#495057]">Time Period:</label>
            <select
              id="months-filter"
              className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(Number(e.target.value))}
            >
              <option value={1}>Last Month</option>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
              <option value={24}>Last 24 Months</option>
            </select>
          </div>
        </div>
        <div className="px-[10px] pb-6">
        {trendsLoading ? (
          <div className="h-[320px] flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              <p className="mt-3 text-[11px] text-gray-500">Loading trends...</p>
            </div>
          </div>
        ) : completionTrends && ReactApexChart ? (
          <div>
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
                <button
                  onClick={() => setChartType('combined')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${chartType === 'combined' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  Combined
                </button>
                <button
                  onClick={() => setChartType('separate')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${chartType === 'separate' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  Separate
                </button>
              </div>
            </div>

            {chartType === 'combined' ? (
              <ReactApexChart
                options={getChartOptions()}
                series={getChartSeries()}
                type="bar"
                height={400}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Task Counts</h3>
                  <ReactApexChart
                    options={getTasksChartOptions()}
                    series={getTasksChartSeries()}
                    type="bar"
                    height={300}
                  />
                </div>
                
                {/* Completion Rate Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Completion Rate</h3>
                  <ReactApexChart
                    options={getCompletionRateChartOptions()}
                    series={getCompletionRateChartSeries()}
                    type="line"
                    height={300}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center p-3 bg-gray-50/50 rounded border border-gray-100">
                <p className="text-[11px] font-bold text-[#495057]">Total Completed</p>
                <p className="text-lg font-bold text-sky-600">{completionTrends.summary.totalCompleted}</p>
              </div>
              <div className="text-center p-3 bg-gray-50/50 rounded border border-gray-100">
                <p className="text-[11px] font-bold text-[#495057]">Total Tasks</p>
                <p className="text-lg font-bold text-purple-600">{completionTrends.summary.totalTasks}</p>
              </div>
              <div className="text-center p-3 bg-gray-50/50 rounded border border-gray-100">
                <p className="text-[11px] font-bold text-[#495057]">Avg Completion</p>
                <p className="text-lg font-bold text-emerald-600">{completionTrends.summary.averageCompletionRate}%</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[320px] flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-bar-chart-line text-xl text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-500">No trends data available</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Filters Section */}
      {showBranchFilter && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Performance Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              id="branch-filter"
              className="form-select border-gray-300 rounded-lg w-full"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filter analytics by branch"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              className="form-control border-gray-300 rounded-lg w-full"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              aria-label="Filter start date"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              className="form-control border-gray-300 rounded-lg w-full"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              aria-label="Filter end date"
            />
          </div>
        </div>
      </div>
      )}

      {/* Top Team Members by Completion */}
      {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Top Team Members by Branch</h2>
          {topByCompletion?.summary && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Completed: <span className="font-semibold text-blue-600">{topByCompletion.summary.totalCompleted}</span></p>
              <p className="text-sm text-gray-600">Average: <span className="font-semibold text-green-600">{topByCompletion.summary.averageCompletion}%</span></p>
            </div>
          )}
        </div> */}

        {/* {topCompletionLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-xl text-gray-400 animate-spin"></i>
              </div>
              <p className="text-gray-500">Loading top performers...</p>
            </div>
          </div>
        ) : topByCompletion?.topMembers ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topByCompletion.topMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{member.branch}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.completedTasks} / {member.totalTasks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCompletionRateColor(member.completionRate)}`}>
                        {member.completionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-line text-xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No top performers data available</p>
            </div>
          </div>
        )}
      </div> */}

      {/* Top Team Members by Branch – timelines-style */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-800">Top Team Members by Completion</h2>
          {topByBranch?.summary && (
            <div className="text-[11px] text-[#495057]">
              Branches: <span className="font-bold text-sky-600">{topByBranch.summary.totalBranches}</span>
              <span className="mx-2">|</span>
              Completed: <span className="font-bold text-emerald-600">{topByBranch.summary.totalCompleted}</span>
            </div>
          )}
        </div>
        <div className="px-[10px] pb-6">
        {topBranchLoading ? (
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              <p className="mt-3 text-[11px] text-gray-500">Loading...</p>
            </div>
          </div>
        ) : topByBranch?.branches ? (
          <div className="space-y-4">
            {topByBranch.branches.map((branch) => (
              <div key={branch.branchId} className="border border-gray-200 rounded overflow-hidden">
                <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-[12px] font-bold text-gray-800">{branch.branchName}</h3>
                  <span className="text-[11px] text-[#495057]">Total: <span className="font-bold text-sky-600">{branch.summary.totalCompleted}</span> | Avg: <span className="font-bold text-emerald-600">{branch.summary.averageCompletion}%</span></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Team Member</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Contact</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Tasks</th>
                        <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branch.topMembers.map((member) => (
                        <tr key={member._id} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-[12px] font-medium text-[#323251] border border-gray-200">{member.name}</td>
                          <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{member.email}</td>
                          <td className="px-3 py-2 text-[12px] border border-gray-200">{member.completedTasks} / {member.totalTasks}</td>
                          <td className="px-3 py-2 border border-gray-200">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border ${getCompletionRateColor(member.completionRate)}`}>{member.completionRate}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : topByBranch?.topMembers ? (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Team Member</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Contact</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Tasks</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Rate</th>
                </tr>
              </thead>
              <tbody>
                {topByBranch.topMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-[12px] font-medium text-[#323251] border border-gray-200">{member.name}</td>
                    <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{member.email}</td>
                    <td className="px-3 py-2 text-[12px] border border-gray-200">{member.completedTasks} / {member.totalTasks}</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border ${getCompletionRateColor(member.completionRate)}`}>{member.completionRate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <p className="text-[11px] text-gray-500">No branch data available</p>
          </div>
        )}
        </div>
      </div>

      {/* Global Team Members Table – timelines-style */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-800">Team Members Overview</h2>
          <button onClick={() => router.push('/analytics/team-members')} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
            <i className="ri-arrow-right-line text-xs" /> Explore All Members
          </button>
        </div>
        <div className="px-[10px] pb-6">
        {globalTeamLoading ? (
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              <p className="mt-3 text-[11px] text-gray-500">Loading...</p>
            </div>
          </div>
        ) : globalTeamMembers?.teamMembers ? (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Team Member</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Details</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Task Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Skills</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Activity</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Clients</th>
                </tr>
              </thead>
              <tbody>
                {globalTeamMembers.teamMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 border border-gray-200">
                      <button onClick={() => router.push(`/analytics/team-members/${member._id}/overview`)} className="text-[12px] font-medium text-[#323251] hover:text-purple-600 cursor-pointer text-left">
                        {member.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{member.email}</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {member.tasks?.status?.pending > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">{member.tasks.status.pending} Pending</span>}
                        {member.tasks?.status?.ongoing > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">{member.tasks.status.ongoing} Ongoing</span>}
                        {member.tasks?.status?.completed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">{member.tasks.status.completed} Done</span>}
                        {(!member.tasks || member.tasks.total === 0) && <span className="text-[10px] text-gray-400">No tasks</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {member.skills?.list?.slice(0, 2).map((skill: any) => (
                          <span key={skill._id} className="px-1.5 py-0.5 text-[10px] bg-sky-50 text-sky-700 rounded border border-sky-100">{skill.name}</span>
                        ))}
                        {member.skills?.list && member.skills.list.length > 2 && <span className="text-[10px] text-gray-500">+{member.skills.list.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{member.timelines?.total || 0} timelines</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <button type="button" onClick={() => { setSelectedMemberForClients(member); setShowClientsModal(true); }} className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100" title={`View ${member.clients?.total || 0} clients`}>
                        <i className="ri-eye-line text-xs" /> {member.clients?.total || 0} Clients
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
            <p className="text-[11px] text-gray-500">No team members data available</p>
          </div>
        )}
        </div>
      </div>

       {/* Groups Table – timelines-style */}
       <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
         <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
           <h2 className="text-sm font-bold text-gray-800">Groups Overview</h2>
           <button onClick={() => router.push('/analytics/groups')} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
             <i className="ri-arrow-right-line text-xs" /> Explore All Groups
           </button>
         </div>
         <div className="px-[10px] pb-6">
         {groupsLoading ? (
           <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
             <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
               <p className="mt-3 text-[11px] text-gray-500">Loading...</p>
             </div>
           </div>
         ) : groups && groups.length > 0 ? (
           <div className="overflow-x-auto border border-gray-200 rounded">
             <table className="w-full border-collapse">
               <thead>
                 <tr className="bg-gray-50/30">
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Group</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Branch</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Clients</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Tasks</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Timelines</th>
                 </tr>
               </thead>
               <tbody>
                 {groups.slice(0, 5).map((group) => (
                   <tr key={group.groupId} className="hover:bg-gray-50/50">
                     <td className="px-3 py-2 border border-gray-200">
                       <button onClick={() => router.push(`/analytics/groups/${group.groupId}/overview`)} className="text-[12px] font-medium text-[#323251] hover:text-purple-600 cursor-pointer text-left">{group.groupName || 'N/A'}</button>
                     </td>
                     <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{group.branch?.name || 'N/A'}</td>
                     <td className="px-3 py-2 text-[12px] border border-gray-200">{group.numberOfClients || 0}</td>
                     <td className="px-3 py-2 border border-gray-200">
                       <div className="flex flex-wrap gap-1">
                         {group.taskStatus?.pending > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">{group.taskStatus.pending}P</span>}
                         {group.taskStatus?.ongoing > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">{group.taskStatus.ongoing}O</span>}
                         {group.taskStatus?.completed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">{group.taskStatus.completed}C</span>}
                         {(!group.taskStatus || group.taskStatus.total === 0) && <span className="text-[10px] text-gray-400">—</span>}
                       </div>
                     </td>
                     <td className="px-3 py-2 border border-gray-200">
                       <div className="flex flex-wrap gap-1">
                         {group.timelineStatus?.pending > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">{group.timelineStatus.pending}P</span>}
                         {group.timelineStatus?.completed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">{group.timelineStatus.completed}C</span>}
                         {(!group.timelineStatus || group.timelineStatus.total === 0) && <span className="text-[10px] text-gray-400">—</span>}
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         ) : (
           <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
             <p className="text-[11px] text-gray-500">{groupsLoading ? 'Loading...' : 'No groups data available'}</p>
           </div>
         )}
         </div>
       </div>

       {/* Timelines Overview – timelines-style */}
       <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
         <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
           <h2 className="text-sm font-bold text-gray-800">Timelines Overview</h2>
           <button onClick={() => router.push('/analytics/timelines')} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
             <i className="ri-arrow-right-line text-xs" /> Explore All Timelines
           </button>
         </div>
         <div className="p-6 text-center border-t border-gray-100">
           <div className="w-14 h-14 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-3">
             <i className="ri-calendar-line text-2xl text-purple-600" />
           </div>
           <p className="text-[12px] font-medium text-[#323251] mb-1">Timeline Analytics</p>
           <p className="text-[11px] text-[#495057] mb-4">Filtering and search capabilities.</p>
           <button onClick={() => router.push('/analytics/timelines')} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 mx-auto">
             <i className="ri-calendar-line text-xs" /> View Timelines
           </button>
         </div>
       </div>

       {/* Clients Table – timelines-style */}
       <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
         <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
           <h2 className="text-sm font-bold text-gray-800">Clients Overview</h2>
           <button onClick={() => router.push('/analytics/clients')} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
             <i className="ri-arrow-right-line text-xs" /> Explore All Clients
           </button>
         </div>
         <div className="px-[10px] pb-6">
         {clientsLoading ? (
           <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
             <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
               <p className="mt-3 text-[11px] text-gray-500">Loading...</p>
             </div>
           </div>
         ) : clients && clients.length > 0 ? (
           <div className="overflow-x-auto border border-gray-200 rounded">
             <table className="w-full border-collapse">
               <thead>
                 <tr className="bg-gray-50/30">
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Client</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Activity</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Team Members</th>
                   <th className="px-3 py-2 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">Tasks</th>
                 </tr>
               </thead>
               <tbody>
                 {clients.map((client) => (
                   <tr key={client._id} className="hover:bg-gray-50/50">
                     <td className="px-3 py-2 border border-gray-200">
                       <button onClick={() => router.push(`/analytics/clients/${client._id}/overview`)} className="text-[12px] font-medium text-[#323251] hover:text-purple-600 cursor-pointer text-left">{client.name || 'N/A'}</button>
                       <div className="text-[11px] text-[#495057]">{client.email || 'N/A'}</div>
                     </td>
                     <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{client.activities?.summary?.map((a: any) => a.name).join(', ') || '—'}</td>
                     <td className="px-3 py-2 text-[12px] text-[#495057] border border-gray-200">{client.teamMembers?.members?.map((m: any) => m.name).join(', ') || '—'}</td>
                     <td className="px-3 py-2 border border-gray-200">
                       <div className="flex flex-wrap gap-1">
                         {client.tasks?.status?.pending > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">{client.tasks.status.pending}P</span>}
                         {client.tasks?.status?.completed > 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">{client.tasks.status.completed}C</span>}
                         {(!client.tasks || client.tasks.total === 0) && <span className="text-[10px] text-gray-400">—</span>}
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         ) : (
           <div className="h-48 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
             <p className="text-[11px] text-gray-500">{clientsLoading ? 'Loading...' : 'No clients data available'}</p>
           </div>
         )}
         </div>
       </div>

       {/* Clients Drawer – timelines-style */}
       {showClientsModal && selectedMemberForClients && (
         <>
           <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setShowClientsModal(false); setSelectedMemberForClients(null); }} aria-hidden />
           <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
             <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
               <h3 className="text-sm font-bold text-gray-800">Clients for {selectedMemberForClients.name}</h3>
               <button type="button" onClick={() => { setShowClientsModal(false); setSelectedMemberForClients(null); }} className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100">
                 <i className="ri-close-line text-lg" />
               </button>
             </div>
             <div className="flex-1 overflow-auto p-4">
               {selectedMemberForClients.clients?.list && selectedMemberForClients.clients.list.length > 0 ? (
                 <div className="space-y-2">
                   {selectedMemberForClients.clients.list.map((client: any) => (
                     <div key={client._id} className="border border-gray-200 rounded p-3 hover:bg-gray-50/50">
                       <p className="text-[12px] font-medium text-[#323251]">{client.name}</p>
                       <p className="text-[11px] text-[#495057]">{client.email}</p>
                       <p className="text-[11px] text-[#495057]">{client.phone}</p>
                       <div className="mt-2 flex gap-1 flex-wrap">
                         <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-100">{client.businessType || 'N/A'}</span>
                         <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">{client.entityType || 'N/A'}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : selectedMemberForClients.clients?.list ? (
                 <p className="text-[11px] text-gray-500 text-center py-6">No clients for this team member.</p>
               ) : (
                 <div className="flex flex-col items-center justify-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                   <p className="mt-3 text-[11px] text-gray-500">Loading...</p>
                 </div>
               )}
             </div>
             <div className="p-[10px] border-t border-gray-200">
               <button type="button" onClick={() => { setShowClientsModal(false); setSelectedMemberForClients(null); }} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">
                 Close
               </button>
             </div>
           </div>
         </>
       )}
     </div>
   );
 };

export default AnalyticsPage;
