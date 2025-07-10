"use client"
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import React, { Fragment, useState, useEffect } from 'react'
import * as Crmdata from "@/shared/data/dashboards/crmdata";
import dynamic from "next/dynamic";
import { Base_url } from '@/app/api/config/BaseUrl';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useBranchContext } from '@/shared/contextapi';
import { ApexOptions } from 'apexcharts';

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
  pending: number[];
  delayed: number[];
  completed: number[];
  assigned: number[];
  months: string[];
}

// Skeleton Components
const CardSkeleton = () => (
  <div className="box overflow-hidden h-full animate-pulse">
    <div className="box-body flex flex-col justify-between">
      <div className='flex flex-col'>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="w-[2.5rem] h-[2.5rem] rounded-full bg-gray-300"></div>
          </div>
        </div>
        <div className="mb-4">
          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-4 bg-gray-300 rounded w-16"></div>
      </div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="box h-full animate-pulse">
    <div className="box-header justify-between">
      <div className="h-6 bg-gray-300 rounded w-32"></div>
      <div className="w-[1.75rem] h-[1.75rem] bg-gray-300 rounded"></div>
    </div>
    <div className="box-body overflow-hidden">
      <div className="flex items-center justify-center h-[250px]">
        <div className="w-48 h-48 bg-gray-300 rounded-full"></div>
      </div>
    </div>
    <div className="grid grid-cols-4 border-t border-dashed dark:border-defaultborder/10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col !p-0">
          <div className={`p-[0.95rem] text-center ${i < 4 ? 'border-e border-dashed dark:border-defaultborder/10' : ''}`}>
            <div className="h-3 bg-gray-300 rounded w-12 mb-1 mx-auto"></div>
            <div className="h-5 bg-gray-300 rounded w-8 mx-auto"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LineChartSkeleton = () => (
  <div className="box h-full animate-pulse">
    <div className="box-header justify-between">
      <div className="h-6 bg-gray-300 rounded w-40"></div>
      <div className="w-[1.75rem] h-[1.75rem] bg-gray-300 rounded"></div>
    </div>
    <div className="box-body !py-5">
      <div className="h-[350px] bg-gray-300 rounded"></div>
    </div>
  </div>
);

const Dashboard = () => {
  const { branches } = useBranchContext();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalBranches: 0,
    totalCustomers: 0,
    totalTeams: 0,
    totalActivities: 0,
    totalOngoingTasks: 0
  });
  const [timelineCounts, setTimelineCounts] = useState<TimelineCounts | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [monthlyTaskData, setMonthlyTaskData] = useState<MonthlyTaskData>({
    pending: [],
    delayed: [],
    completed: [],
    assigned: [],
    months: []
  });
  const [error, setError] = useState<string | null>(null);
  
  // Loading states
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  const fetchDashboardData = async () => {
    setError(null);
    setIsLoadingDashboard(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all dashboard data in parallel using axios
      const [
        branchesResponse,
        customersResponse,
        teamsResponse,
        activitiesResponse,
        tasksResponse
      ] = await Promise.all([
        axios.get(`${Base_url}dashboard/total-branches`, { headers }),
        axios.get(`${Base_url}dashboard/total-clients`, { headers }),
        axios.get(`${Base_url}dashboard/total-teams`, { headers }),
        axios.get(`${Base_url}dashboard/total-activities`, { headers }),
        axios.get(`${Base_url}dashboard/total-ongoing-tasks`, { headers })
      ]);

      setDashboardData({
        totalBranches: branchesResponse.data.total || 0,
        totalCustomers: customersResponse.data.total || 0,
        totalTeams: teamsResponse.data.total || 0,
        totalActivities: activitiesResponse.data.total || 0,
        totalOngoingTasks: tasksResponse.data.total || 0
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const fetchTimelineCounts = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTimeline(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${Base_url}dashboard/timeline-counts-by-branch`, { 
        headers,
        params: { branchId }
      });
      setTimelineCounts(response.data);
    } catch (err) {
      console.error('Error fetching timeline counts:', err);
      toast.error('Failed to load timeline data');
      setTimelineCounts(null);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const fetchMonthlyTaskData = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingMonthly(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get last 12 months
      const months = [];
      const pendingData = [];
      const delayedData = [];
      const completedData = [];
      const assignedData = [];

      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthName = startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months.push(monthName);

        // Fetch timeline counts for the month
        const timelineResponse = await axios.get(`${Base_url}dashboard/timeline-counts-by-branch`, {
          headers,
          params: { 
            branchId
          }
        });

        // Fetch assigned task count for the month
        const assignedResponse = await axios.get(`${Base_url}dashboard/assigned-task-counts`, {
          headers,
          params: {
            branchId,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        });

        pendingData.push(timelineResponse.data.counts?.pending || 0);
        delayedData.push(timelineResponse.data.counts?.delayed || 0);
        completedData.push(timelineResponse.data.counts?.completed || 0);
        assignedData.push(assignedResponse.data.count || 0);
      }

      setMonthlyTaskData({
        pending: pendingData,
        delayed: delayedData,
        completed: completedData,
        assigned: assignedData,
        months: months
      });

    } catch (err) {
      console.error('Error fetching monthly task data:', err);
      toast.error('Failed to load monthly task data');
      setMonthlyTaskData({
        pending: [],
        delayed: [],
        completed: [],
        assigned: [],
        months: []
      });
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  // Initialize branch selection when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      const firstBranch = branches[0];
      setSelectedBranchId(firstBranch.id);
      fetchTimelineCounts(firstBranch.id);
      fetchMonthlyTaskData(firstBranch.id);
    }
  }, [branches]);

  // Fetch timeline counts when branch selection changes
  useEffect(() => {
    if (selectedBranchId) {
      fetchTimelineCounts(selectedBranchId);
      fetchMonthlyTaskData(selectedBranchId);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
  };

  // Generate chart data from timeline counts
  const getTimelineChartData = () => {
    if (!timelineCounts) {
      return {
        series: [0, 0, 0, 0],
        options: Crmdata.Sourcedata.options,
        total: 0
      };
    }

    const { counts } = timelineCounts;
    const series = [counts.pending, counts.ongoing, counts.completed, counts.delayed];
    
    return {
      series,
      options: {
        ...Crmdata.Sourcedata.options,
        colors: ["rgb(245, 184, 73)", "rgb(35, 183, 229)", "rgb(38, 191, 148)", "rgb(220, 53, 69)"],
        tooltip: {
          enabled: true,
          custom: function({ series, seriesIndex, w }: any) {
            const statusNames = ['Pending', 'Ongoing', 'Completed', 'Delayed'];
            const value = series[seriesIndex];
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
                     return val;
                   }
                 },
              }
            }
          }
        }
      },
      total: counts.total
    };
  };

  const chartData = getTimelineChartData();

  // Generate chart options for all task types on one chart
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
    colors: ['#f5b849', '#dc3545', '#26bf94', '#23b7e5'], // Pending, Delayed, Completed, Assigned
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
      categories: monthlyTaskData.months,
      labels: {
        style: {
          colors: '#8c9097',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Tasks',
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
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      fontSize: '12px',
      labels: {
        colors: '#8c9097'
      }
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' tasks';
        }
      }
    }
  });

  const taskChartOptions = getTaskChartOptions();

  console.log(branches);

  return (
    <Fragment>
      <Seo title={"Crm"} />
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 ">Welcome back!</p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">Track your sales activity, leads and deals here.</p>
        </div>
      </div>
      
      {/* First Row: Five Cards */}
      <div className="flex flex-wrap gap-6 mb-6">
        {isLoadingDashboard ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 min-w-[200px]">
                <CardSkeleton />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex-1 min-w-[200px]">
              <div className="box overflow-hidden h-full">
                <div className="box-body flex flex-col justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span
                          className="!text-[0.8rem]  !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center bg-primary">
                          <i className="ti ti-building text-[1rem] text-white"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-2">Total Branches</p>
                      <h4 className="font-semibold text-[1.5rem] !mb-0">
                        {dashboardData.totalBranches.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link className="text-primary text-[0.813rem] hover:underline" href="/branches" scroll={false}>
                      View All<i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="box overflow-hidden h-full">
                <div className="box-body flex flex-col justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span
                          className="!text-[0.8rem]  !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center bg-secondary">
                          <i className="ti ti-users text-[1rem] text-white"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-2">Total Customers</p>
                      <h4 className="font-semibold text-[1.5rem] !mb-0">
                        {dashboardData.totalCustomers.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link className="text-secondary text-[0.813rem] hover:underline" href="/clients" scroll={false}>
                      View All<i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="box overflow-hidden h-full">
                <div className="box-body flex flex-col justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span
                          className="!text-[0.8rem]  !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center bg-success">
                          <i className="ti ti-share text-[1rem] text-white"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-2">Total Team</p>
                      <h4 className="font-semibold text-[1.5rem] !mb-0">
                        {dashboardData.totalTeams.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link className="text-success text-[0.813rem] hover:underline" href="/teams" scroll={false}>
                      View All<i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="box overflow-hidden h-full">
                <div className="box-body flex flex-col justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span
                          className="!text-[0.8rem]  !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center bg-warning">
                          <i className="ti ti-briefcase text-[1rem] text-white"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-2">Total Activities</p>
                      <h4 className="font-semibold text-[1.5rem] !mb-0">
                        {dashboardData.totalActivities.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link className="text-warning text-[0.813rem] hover:underline" href="/activities" scroll={false}>
                      View All<i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="box overflow-hidden h-full">
                <div className="box-body flex flex-col justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span
                          className="!text-[0.8rem]  !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !rounded-full inline-flex items-center justify-center bg-info">
                          <i className="ti ti-checklist text-[1rem] text-white"></i>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[#8c9097] dark:text-white/50 text-[0.813rem] mb-2">Ongoing Tasks</p>
                      <h4 className="font-semibold text-[1.5rem] !mb-0">
                        {dashboardData.totalOngoingTasks.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link className="text-info text-[0.813rem] hover:underline" href="/tasks" scroll={false}>
                      View All<i className="ti ti-arrow-narrow-right ms-2 font-semibold inline-block"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-6 col-span-12">
          {isLoadingTimeline ? (
            <ChartSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Timelines by branches
                </div>
                <div className="hs-dropdown ti-dropdown">
                  <Link aria-label="anchor" href="#!" scroll={false}
                    className="flex items-center justify-center w-[1.75rem] h-[1.75rem] ! !text-[0.8rem] !py-1 !px-2 rounded-sm bg-light border-light shadow-none !font-medium"
                    aria-expanded="false">
                    <i className="fe fe-more-vertical text-[0.8rem]"></i>
                  </Link>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                    {branches.map((branch) => (
                      <li key={branch.id}>
                        <button 
                          className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left ${selectedBranchId === branch.id ? 'bg-primary/10 text-primary' : ''}`}
                          onClick={() => handleBranchChange(branch.id)}
                        >
                          {branch.name}
                        </button>
                      </li>
                    ))}
                  </ul>
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
                  <div className="!ps-4 p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend pending inline-block">Pending
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.pending || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div className="p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend ongoing inline-block">Ongoing
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.ongoing || 0}</span></div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div className="p-[0.95rem] text-center border-e border-dashed dark:border-defaultborder/10">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend completed inline-block">Completed
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.completed || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="col !p-0">
                  <div className="!pe-4 p-[0.95rem] text-center">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 crm-lead-legend delayed inline-block">Delayed
                    </span>
                    <div><span className="text-[1rem]  font-semibold">{timelineCounts?.counts.delayed || 0}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-6 col-span-12">
          {isLoadingMonthly ? (
            <LineChartSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Task Completion by Branches
                </div>
                <div className="hs-dropdown ti-dropdown">
                  <Link aria-label="anchor" href="#!" scroll={false}
                    className="flex items-center justify-center w-[1.75rem] h-[1.75rem] ! !text-[0.8rem] !py-1 !px-2 rounded-sm bg-light border-light shadow-none !font-medium"
                    aria-expanded="false">
                    <i className="fe fe-more-vertical text-[0.8rem]"></i>
                  </Link>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                    {branches.map((branch) => (
                      <li key={branch.id}>
                        <button 
                          className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left ${selectedBranchId === branch.id ? 'bg-primary/10 text-primary' : ''}`}
                          onClick={() => handleBranchChange(branch.id)}
                        >
                          {branch.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="box-body !py-5">
                <div id="task-completion-chart">
                  <ReactApexChart 
                    options={taskChartOptions} 
                    series={[
                      { name: 'Pending', data: monthlyTaskData.pending },
                      { name: 'Delayed', data: monthlyTaskData.delayed },
                      { name: 'Completed', data: monthlyTaskData.completed },
                      { name: 'Assigned', data: monthlyTaskData.assigned }
                    ]} 
                    type="line" 
                    width="100%" 
                    height={350} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  )
}
export default Dashboard; 