"use client"
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import React, { Fragment, useState, useEffect } from 'react'
import * as Crmdata from "@/shared/data/dashboards/crmdata";
import dynamic from "next/dynamic";
import { toast } from 'react-hot-toast';
import { useBranchContext } from '@/shared/contextapi';
import { ApexOptions } from 'apexcharts';
import { useRouter } from 'next/navigation';
import DashboardService, { 
  FrequencyStatusData, 
  TimelinePeriodData, 
  FrequencyAnalyticsData, 
  StatusTrendsData, 
  CompletionRatesData,
  FrequencyStatusStats,
  TaskTrendsResponse,
  TaskAnalyticsResponse
} from './services/DashboardService';
import {
  FrequencyAnalyticsChart,
  StatusTrendsChart,
  CompletionRatesCard,
  TimelinePeriodTable,
  TaskTrendsChart,
  TaskAnalyticsCard
} from './components';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardData {
  totalBranches: number;
  totalCustomers: number;
  totalTeams: number;
  totalActivities: number;
  totalOngoingTasks: number;
}

interface TimelineCounts {
  branch: {
    id: string;
    name: string;
  };
  counts: {
    pending: number;
    ongoing: number;
    completed: number;
    delayed: number;
    total: number;
  };
}

interface MonthlyTaskData {
  assigned: number[];
  months: string[];
}

interface TopClient {
  ranking: number;
  name: string;
  frequency: number;
}

interface TopActivity {
  ranking: number;
  name: string;
  frequency: number;
}

const Dashboard = () => {
  const { branches, selectedBranch, setSelectedBranch, loading: contextLoading } = useBranchContext();
  const router = useRouter();
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalBranches: 0,
    totalCustomers: 0,
    totalTeams: 0,
    totalActivities: 0,
    totalOngoingTasks: 0
  });
  const [timelineCounts, setTimelineCounts] = useState<TimelineCounts | null>(null);
  const [monthlyTaskData, setMonthlyTaskData] = useState<MonthlyTaskData>({
    assigned: [],
    months: []
  });
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [topActivities, setTopActivities] = useState<TopActivity[]>([]);
  
  // New frequency-based data state
  const [frequencyStatusData, setFrequencyStatusData] = useState<FrequencyStatusData[]>([]);
  const [timelinePeriodData, setTimelinePeriodData] = useState<TimelinePeriodData[]>([]);
  const [frequencyAnalyticsData, setFrequencyAnalyticsData] = useState<FrequencyAnalyticsData[]>([]);
  const [statusTrendsData, setStatusTrendsData] = useState<StatusTrendsData[]>([]);
  const [completionRatesData, setCompletionRatesData] = useState<CompletionRatesData | null>(null);
  const [frequencyStatusStats, setFrequencyStatusStats] = useState<FrequencyStatusStats | null>(null);
  const [taskTrendsData, setTaskTrendsData] = useState<TaskTrendsResponse | null>(null);
  const [taskStatusAnalytics, setTaskStatusAnalytics] = useState<TaskAnalyticsResponse | null>(null);
  const [taskPriorityAnalytics, setTaskPriorityAnalytics] = useState<TaskAnalyticsResponse | null>(null);
  
  // Frequency selection state
  const [selectedFrequency, setSelectedFrequency] = useState<string>('Monthly');
  
  // Loading states
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [isLoadingTopClients, setIsLoadingTopClients] = useState(false);
  const [isLoadingTopActivities, setIsLoadingTopActivities] = useState(false);
  const [isLoadingFrequencyData, setIsLoadingFrequencyData] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isLoadingCompletionRates, setIsLoadingCompletionRates] = useState(false);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingFrequencyStats, setIsLoadingFrequencyStats] = useState(false);
  const [isLoadingTaskTrends, setIsLoadingTaskTrends] = useState(false);
  const [isLoadingTaskStatusAnalytics, setIsLoadingTaskStatusAnalytics] = useState(false);
  const [isLoadingTaskPriorityAnalytics, setIsLoadingTaskPriorityAnalytics] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch basic dashboard data
  const fetchDashboardData = async (branchId?: string) => {
    setError(null);
    setIsLoadingDashboard(true);
    
    try {
      const data = await DashboardService.getDashboardData(branchId);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Fetch timeline counts
  const fetchTimelineCounts = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTimeline(true);
    try {
      const data = await DashboardService.getTimelineCountsByBranch(branchId);
      setTimelineCounts(data);
    } catch (err) {
      toast.error('Failed to load timeline data');
      setTimelineCounts(null);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Fetch monthly task data
  const fetchMonthlyTaskData = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingMonthly(true);
    try {
      const data = await DashboardService.getAssignedTaskCounts(branchId);
      setMonthlyTaskData({
        assigned: data.assigned || Array(12).fill(0),
        months: data.months || []
      });
    } catch (err) {
      toast.error('Failed to load monthly task data');
      setMonthlyTaskData({ assigned: [], months: [] });
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  // Fetch top clients
  const fetchTopClients = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTopClients(true);
    try {
      const data = await DashboardService.getTopClients(branchId);
      setTopClients(data);
    } catch (err) {
      toast.error('Failed to load top clients data');
      setTopClients([]);
    } finally {
      setIsLoadingTopClients(false);
    }
  };

  // Fetch top activities
  const fetchTopActivities = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTopActivities(true);
    try {
      const data = await DashboardService.getTopActivities(branchId);
      setTopActivities(data);
    } catch (err) {
      toast.error('Failed to load top activities data');
      setTopActivities([]);
    } finally {
      setIsLoadingTopActivities(false);
    }
  };

  // Fetch frequency-based data (without filters)
  const fetchFrequencyData = async () => {
    setIsLoadingFrequencyData(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || ''
      };
      const data = await DashboardService.getTimelineStatusByFrequency(filters);
      setFrequencyStatusData(data);
    } catch (err) {
      toast.error('Failed to load frequency data');
      setFrequencyStatusData([]);
    } finally {
      setIsLoadingFrequencyData(false);
    }
  };

  // Fetch analytics data (without filters)
  const fetchAnalyticsData = async () => {
    setIsLoadingAnalytics(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || ''
      };
      const data = await DashboardService.getTimelineFrequencyAnalytics(filters);
      setFrequencyAnalyticsData(data);
    } catch (err) {
      toast.error('Failed to load analytics data');
      setFrequencyAnalyticsData([]);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Fetch trends data (without filters)
  const fetchTrendsData = async () => {
    setIsLoadingTrends(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || ''
      };
      const data = await DashboardService.getTimelineStatusTrends(filters);
      setStatusTrendsData(data);
    } catch (err) {
      toast.error('Failed to load trends data');
      setStatusTrendsData([]);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  // Fetch completion rates (without filters)
  const fetchCompletionRates = async () => {
    setIsLoadingCompletionRates(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || ''
      };
      const data = await DashboardService.getTimelineCompletionRates(filters);
      setCompletionRatesData(data);
    } catch (err) {
      toast.error('Failed to load completion rates');
      setCompletionRatesData(null);
    } finally {
      setIsLoadingCompletionRates(false);
    }
  };

  // Fetch frequency status stats
  const fetchFrequencyStatusStats = async () => {
    setIsLoadingFrequencyStats(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || ''
      };
      const data = await DashboardService.getFrequencyStatusStats(filters);
      setFrequencyStatusStats(data);
    } catch (err) {
      toast.error('Failed to load frequency status stats');
      setFrequencyStatusStats(null);
    } finally {
      setIsLoadingFrequencyStats(false);
    }
  };

  // Fetch task trends data
  const fetchTaskTrends = async () => {
    setIsLoadingTaskTrends(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || '',
        interval: 'month' // Default to monthly
      };
      const data = await DashboardService.getTaskTrends(filters);
      setTaskTrendsData(data);
    } catch (err) {
      toast.error('Failed to load task trends');
      setTaskTrendsData(null);
    } finally {
      setIsLoadingTaskTrends(false);
    }
  };

  // Fetch task status analytics
  const fetchTaskStatusAnalytics = async () => {
    setIsLoadingTaskStatusAnalytics(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || '',
        groupBy: 'status'
      };
      const data = await DashboardService.getTaskAnalytics(filters);
      setTaskStatusAnalytics(data);
    } catch (err) {
      toast.error('Failed to load task status analytics');
      setTaskStatusAnalytics(null);
    } finally {
      setIsLoadingTaskStatusAnalytics(false);
    }
  };

  // Fetch task priority analytics
  const fetchTaskPriorityAnalytics = async () => {
    setIsLoadingTaskPriorityAnalytics(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || '',
        groupBy: 'priority'
      };
      const data = await DashboardService.getTaskAnalytics(filters);
      setTaskPriorityAnalytics(data);
    } catch (err) {
      toast.error('Failed to load task priority analytics');
      setTaskPriorityAnalytics(null);
    } finally {
      setIsLoadingTaskPriorityAnalytics(false);
    }
  };

  // Global function to refresh frequency status stats (can be called from other components)
  const refreshFrequencyStatusStats = async () => {
    await fetchFrequencyStatusStats();
  };

  // Global function to refresh task trends (can be called from other components)
  const refreshTaskTrends = async (interval?: string) => {
    const filters = {
      branchId: selectedBranch?.id || '',
      interval: interval || 'month'
    };
    
    setIsLoadingTaskTrends(true);
    try {
      const data = await DashboardService.getTaskTrends(filters);
      setTaskTrendsData(data);
    } catch (err) {
      toast.error('Failed to refresh task trends');
    } finally {
      setIsLoadingTaskTrends(false);
    }
  };

  // Expose the refresh functions globally
  if (typeof window !== 'undefined') {
    (window as any).refreshFrequencyStatusStats = refreshFrequencyStatusStats;
    (window as any).refreshTaskTrends = refreshTaskTrends;
  }

  // Fetch period data (without filters)
  const fetchPeriodData = async () => {
    setIsLoadingPeriods(true);
    try {
      const filters = {
        branchId: selectedBranch?.id || '',
        frequency: selectedFrequency
      };
      const data = await DashboardService.getTimelineStatusByPeriod(filters);
      setTimelinePeriodData(data.periods || []);
    } catch (err) {
      toast.error('Failed to load period data');
      setTimelinePeriodData([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  // Handle branch change
  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setSelectedBranch(branch);
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (frequency: string) => {
    setSelectedFrequency(frequency);
  };

  // Fetch all data when selected branch changes
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchTimelineCounts(selectedBranch.id);
      fetchMonthlyTaskData(selectedBranch.id);
      fetchDashboardData(selectedBranch.id);
      fetchTopClients(selectedBranch.id);
      fetchTopActivities(selectedBranch.id);
      fetchFrequencyData();
      fetchAnalyticsData();
      fetchTrendsData();
      fetchCompletionRates();
      fetchFrequencyStatusStats();
      fetchPeriodData();
      fetchTaskTrends();
      fetchTaskStatusAnalytics();
      fetchTaskPriorityAnalytics();
    }
  }, [selectedBranch]);

  // Fetch period data when frequency changes
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPeriodData();
    }
  }, [selectedFrequency]);

  // Refetch task trends when frequency changes
  useEffect(() => {
    if (selectedBranch?.id) {
      // Map frequency to API interval format
      const frequencyToInterval: { [key: string]: string } = {
        'Daily': 'day',
        'Weekly': 'week',
        'Monthly': 'month'
      };
      const interval = frequencyToInterval[selectedFrequency] || 'month';
      refreshTaskTrends(interval);
    }
  }, [selectedFrequency]);

  const handleStatusClick = (status: string) => {
    const queryParams = new URLSearchParams({ status });
    router.push(`/tasks?${queryParams.toString()}`);
  };

  // Generate chart data from timeline counts
  const getTimelineChartData = () => {
    if (!timelineCounts || !timelineCounts.counts) {
      return {
        series: [0, 0, 0, 0],
        options: Crmdata.Sourcedata.options,
        total: 0
      };
    }

    const { counts } = timelineCounts;
    const series = [
      counts.pending || 0, 
      counts.ongoing || 0, 
      counts.completed || 0, 
      counts.delayed || 0
    ];
    
    return {
      series,
      options: {
        ...Crmdata.Sourcedata.options,
        colors: ["rgb(245, 184, 73)", "rgb(35, 183, 229)", "rgb(38, 191, 148)", "rgb(220, 53, 69)"],
        tooltip: {
          enabled: true,
          custom: function({ series, seriesIndex, w }: any) {
            const statusNames = ['Pending', 'Ongoing', 'Completed', 'Delayed'];
            const value = series[seriesIndex] || 0;
            const statusName = statusNames[seriesIndex];
            return `<div class="custom-tooltip p-2">
              <span style="color: ${w.config.colors[seriesIndex]}">●</span>
              <span style="font-weight: bold; margin-left: 5px;">${statusName}: ${value}</span>
            </div>`;
          }
        },
        plotOptions: {
          ...Crmdata.Sourcedata.options?.plotOptions,
          pie: {
            ...Crmdata.Sourcedata.options?.plotOptions?.pie,
            donut: {
              ...Crmdata.Sourcedata.options?.plotOptions?.pie?.donut,
              labels: {
                show: false,
                name: {
                  show: true,
                  fontSize: '20px',
                  color: '#495057',
                  offsetY: -4
                },
                value: {
                  show: true,
                  fontSize: '18px',
                  color: undefined,
                  offsetY: 8,
                  formatter: function (val: string) {
                    return val || '0';
                  }
                },
              }
            }
          }
        }
      },
      total: counts.total || 0
    };
  };

  const chartData = getTimelineChartData();

  // Generate chart options for assigned tasks chart
  const getTaskChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line' as const,
      height: 350,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    colors: ['#23b7e5'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      }
    },
    xaxis: {
      categories: monthlyTaskData.months || [],
      labels: {
        style: {
          colors: '#8c9097',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Assigned Tasks',
        style: {
          color: '#8c9097',
          fontSize: '12px'
        }
      },
      labels: {
        style: {
          colors: '#8c9097',
          fontSize: '12px'
        }
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return (val || 0) + ' assigned tasks';
        }
      }
    }
  });

  const taskChartOptions = getTaskChartOptions();

  // Show loading state while context is loading
  if (contextLoading) {
    return (
      <Fragment>
        <Seo title="Dashboard" />
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
          <div className="p-[10px] flex items-center gap-2">
            <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
            <h1 className="text-[0.875rem] font-bold text-gray-800">Dashboard</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-12" />
                </div>
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Dashboard" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded mb-6">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" aria-hidden />
            <div>
              <h1 className="text-[0.875rem] font-bold text-gray-800">Dashboard</h1>
              <p className="text-[11px] text-[#495057] mt-0.5">Track your sales activity, leads and deals here.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards – timelines-style */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {isLoadingDashboard ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-12" />
                </div>
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700">Total Branches</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData.totalBranches.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-building-line text-purple-600 text-sm" />
                </div>
              </div>
              <Link className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800" href="/branches" scroll={false}>View All <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-700">Total Customers</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData.totalCustomers.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-sky-600 text-sm" />
                </div>
              </div>
              <Link className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800" href="/clients" scroll={false}>View All <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700">Total Teams</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData.totalTeams.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                  <i className="ri-team-line text-emerald-600 text-sm" />
                </div>
              </div>
              <Link className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800" href="/teams" scroll={false}>View All <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700">Total Activities</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData.totalActivities.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                  <i className="ri-briefcase-line text-amber-600 text-sm" />
                </div>
              </div>
              <Link className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-800" href="/activities" scroll={false}>View All <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-violet-700">Ongoing Tasks</span>
                  <p className="text-lg font-bold text-[#323251] mt-0.5">{dashboardData.totalOngoingTasks.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-violet-600 text-sm" />
                </div>
              </div>
              <Link className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-800" href="/tasks" scroll={false}>View All <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
          </>
        )}
      </div>

      {/* Completion Rates Card - Commented out */}
      {/* <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-6 col-span-12">
          <CompletionRatesCard
            data={completionRatesData}
            isLoading={isLoadingCompletionRates}
          />
        </div>
        <div className="lg:col-span-6 col-span-12"> */}
      
      {/* Timeline by branches - Full width - Commented out */}
      {/* <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-12 col-span-12">
          {isLoadingTimeline ? (
            <ChartSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Timelines by branches
                </div>
              </div>
              <div className="box-body overflow-hidden">
                <div className="leads-source-chart flex items-center justify-center">
                  <ReactApexChart options={chartData.options} series={chartData.series} type="donut" width={"100%"} height={250} />
                  <div className="lead-source-value ">
                    <span className="block text-[0.875rem] ">Total</span>
                    <span className="block text-[1.5625rem] font-bold">{chartData.total}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 border-t border-dashed dark:border-defaultborder/10">
                <div className="col !p-0">
                  <div 
                    className="!ps-4 p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10 cursor-pointer hover:bg-warning/5 transition-colors"
                    onClick={() => handleStatusClick('pending')}
                  >
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend pending inline-block">Pending
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.pending || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div 
                    className="p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => handleStatusClick('ongoing')}
                  >
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend ongoing inline-block">Ongoing
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.ongoing || 0}</span></div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div 
                    className="p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10 cursor-pointer hover:bg-success/5 transition-colors"
                    onClick={() => handleStatusClick('completed')}
                  >
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend completed inline-block">Completed
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.completed || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div 
                    className="!pe-4 p-[0.95rem] text-center cursor-pointer hover:bg-danger/5 transition-colors"
                    onClick={() => handleStatusClick('delayed')}
                  >
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend delayed inline-block">Delayed
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.delayed || 0}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div> */}

      {/* Task Analytics - Tasks By Status and Tasks By Priority */}
      <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-6 col-span-12">
          <TaskAnalyticsCard
            data={taskStatusAnalytics}
            isLoading={isLoadingTaskStatusAnalytics}
            groupBy="status"
            title="Tasks By Status"
          />
        </div>
        <div className="lg:col-span-6 col-span-12">
          <TaskAnalyticsCard
            data={taskPriorityAnalytics}
            isLoading={isLoadingTaskPriorityAnalytics}
            groupBy="priority"
            title="Tasks By Priority"
          />
        </div>
      </div>



      {/* Frequency Analytics and Status Trends */}
      <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-12 col-span-12">
          <FrequencyAnalyticsChart
            data={frequencyAnalyticsData}
            isLoading={isLoadingAnalytics}
          />
        </div>
        {/* Status Trends Chart - Commented out */}
        {/* <div className="lg:col-span-12 col-span-12">
          <StatusTrendsChart
            data={statusTrendsData}
            isLoading={isLoadingTrends}
            interval="day"
          />
        </div> */}
      </div>

      {/* Top Clients and Top Activities – timelines-style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
          <div className="p-[10px] border-b border-gray-100">
            <h2 className="text-[0.875rem] font-bold text-gray-800">Top 5 Clients</h2>
          </div>
          <div className="p-[10px]">
            {isLoadingTopClients ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-16">Rank</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center">Client Name</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-20">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.length > 0 ? (
                      topClients.map((client) => (
                        <tr key={client.ranking} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 text-center border border-gray-200">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                              client.ranking === 1 ? 'bg-amber-100 text-amber-800' :
                              client.ranking === 2 ? 'bg-gray-100 text-gray-800' :
                              client.ranking === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>{client.ranking}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200 text-center">{client.name}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[#495057] border border-gray-200 text-center">{client.frequency}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-[12px] text-[#495057] py-8 border border-gray-200">No clients data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
          <div className="p-[10px] border-b border-gray-100">
            <h2 className="text-[0.875rem] font-bold text-gray-800">Top 5 Activities</h2>
          </div>
          <div className="p-[10px]">
            {isLoadingTopActivities ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-16">Rank</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center">Activity Name</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-20">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topActivities.length > 0 ? (
                      topActivities.map((activity) => (
                        <tr key={activity.ranking} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 text-center border border-gray-200">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                              activity.ranking === 1 ? 'bg-amber-100 text-amber-800' :
                              activity.ranking === 2 ? 'bg-gray-100 text-gray-800' :
                              activity.ranking === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>{activity.ranking}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[12px] font-medium text-[#323251] border border-gray-200 text-center">{activity.name}</td>
                          <td className="px-3 py-2.5 text-[12px] text-[#495057] border border-gray-200 text-center">{activity.frequency}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-[12px] text-[#495057] py-8 border border-gray-200">No activities data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Periods Table and Task Trends Chart */}
      <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-12 col-span-12">
          <TimelinePeriodTable
            data={timelinePeriodData}
            isLoading={isLoadingPeriods}
            frequency={selectedFrequency}
            onFrequencyChange={handleFrequencyChange}
          />
        </div>
        <div className="lg:col-span-12 col-span-12">
          <TaskTrendsChart
            data={taskTrendsData}
            isLoading={isLoadingTaskTrends}
            branchId={selectedBranch?.id}
            selectedFrequency={selectedFrequency}
          />
        </div>
      </div>

      {/* Monthly Tasks Chart – timelines-style */}
      <div className="mb-6">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded">
          <div className="p-[10px] border-b border-gray-100">
            <h2 className="text-[0.875rem] font-bold text-gray-800">Assigned Tasks by Month</h2>
          </div>
          <div className="p-[10px]">
            {isLoadingMonthly ? (
              <div className="h-[350px] bg-gray-50 rounded flex items-center justify-center animate-pulse">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 opacity-50" />
              </div>
            ) : (
              <div id="task-completion-chart" className="min-h-[350px]">
                <ReactApexChart
                  options={taskChartOptions}
                  series={[{ name: 'Assigned Tasks', data: monthlyTaskData.assigned }]}
                  type="line"
                  width="100%"
                  height={350}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Dashboard; 