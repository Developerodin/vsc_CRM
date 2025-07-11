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
import { useRouter } from 'next/navigation';

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

const TableCardSkeleton = () => (
  <div className="box h-full animate-pulse">
    <div className="box-header justify-between">
      <div className="h-6 bg-gray-300 rounded w-32"></div>
      <div className="w-[1.75rem] h-[1.75rem] bg-gray-300 rounded"></div>
    </div>
    <div className="box-body">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="h-4 bg-gray-300 rounded w-16"></th>
              <th className="h-4 bg-gray-300 rounded w-24"></th>
              <th className="h-4 bg-gray-300 rounded w-20"></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="h-4 bg-gray-300 rounded w-8"></td>
                <td className="h-4 bg-gray-300 rounded w-32"></td>
                <td className="h-4 bg-gray-300 rounded w-12"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { branches, selectedBranch, setSelectedBranch, loading: contextLoading } = useBranchContext();
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);
  
  // Loading states
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [isLoadingTopClients, setIsLoadingTopClients] = useState(false);
  const [isLoadingTopActivities, setIsLoadingTopActivities] = useState(false);

  const fetchDashboardData = async (branchId?: string) => {
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

      // Prepare query parameters for branch-specific data
      const branchParams = branchId ? { branchId } : {};

      // Fetch all dashboard data in parallel using axios
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

      // Fetch assigned task counts for last 12 months in a single call
      const response = await axios.get(`${Base_url}dashboard/assigned-task-counts`, {
        headers,
        params: { branchId }
      });

      const assignedData = response.data;
      console.log(assignedData);

      // Use the data directly from the backend response
      setMonthlyTaskData({
        assigned: assignedData.assigned || Array(12).fill(0),
        months: assignedData.months || []
      });

    } catch (err) {
      console.error('Error fetching monthly task data:', err);
      toast.error('Failed to load monthly task data');
      setMonthlyTaskData({
        assigned: [],
        months: []
      });
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  const fetchTopClients = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTopClients(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${Base_url}dashboard/top-clients`, {
        headers,
        params: { branchId }
      });

      setTopClients(response.data || []);
    } catch (err) {
      console.error('Error fetching top clients:', err);
      toast.error('Failed to load top clients data');
      setTopClients([]);
    } finally {
      setIsLoadingTopClients(false);
    }
  };

  const fetchTopActivities = async (branchId: string) => {
    if (!branchId) return;
    
    setIsLoadingTopActivities(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${Base_url}dashboard/top-activities`, {
        headers,
        params: { branchId }
      });

      setTopActivities(response.data || []);
    } catch (err) {
      console.error('Error fetching top activities:', err);
      toast.error('Failed to load top activities data');
      setTopActivities([]);
    } finally {
      setIsLoadingTopActivities(false);
    }
  };

  // Fetch timeline counts and dashboard data when selected branch changes
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchTimelineCounts(selectedBranch.id);
      fetchMonthlyTaskData(selectedBranch.id);
      fetchDashboardData(selectedBranch.id);
      fetchTopClients(selectedBranch.id);
      fetchTopActivities(selectedBranch.id);
    }
  }, [selectedBranch]);


  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setSelectedBranch(branch);
    }
  };

  const handleStatusClick = (status: string) => {
    // Redirect to tasks page with status filter
    const queryParams = new URLSearchParams({
      status: status
    });
    
    router.push(`/tasks?${queryParams.toString()}`);
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
    colors: ['#23b7e5'], // Assigned tasks color
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
      show: false // Hide legend since we only have one series
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' assigned tasks';
        }
      }
    }
  });

  const taskChartOptions = getTaskChartOptions();

  // Show loading state while context is loading
  if (contextLoading) {
    return (
      <Fragment>
        <Seo title={"Crm"} />
        <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 ">Welcome back!</p>
            <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">Track your sales activity, leads and deals here.</p>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="flex flex-wrap gap-6 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 min-w-[200px]">
              <CardSkeleton />
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-12 gap-x-6 mb-6">
          <div className="lg:col-span-6 col-span-12">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-6 col-span-12">
            <LineChartSkeleton />
          </div>
        </div>
      </Fragment>
    );
  }

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

      {/* Second Row: Top Clients and Top Activities Cards */}
      <div className="grid grid-cols-12 gap-x-6 mb-6">
        <div className="lg:col-span-6 col-span-12">
          {isLoadingTopClients ? (
            <TableCardSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Top 5 Clients
                </div>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="table w-full [&_th]:!text-center [&_td]:!text-center">
                    <thead>
                      <tr>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-1/6">Rank</th>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-2/3">Client Name</th>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-1/6">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.length > 0 ? (
                        topClients.map((client) => (
                          <tr key={client.ranking}>
                            <td className="text-[0.875rem]">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                client.ranking === 1 ? 'bg-yellow-100 text-yellow-800' :
                                client.ranking === 2 ? 'bg-gray-100 text-gray-800' :
                                client.ranking === 3 ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {client.ranking}
                              </span>
                            </td>
                            <td className="text-[0.875rem] font-medium">{client.name}</td>
                            <td className="text-[0.875rem] text-[#8c9097] dark:text-white/50">{client.frequency}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-[0.875rem] text-[#8c9097] dark:text-white/50 py-4">
                            No clients data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-6 col-span-12">
          {isLoadingTopActivities ? (
            <TableCardSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Top 5 Activities
                </div>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="table w-full [&_th]:!text-center [&_td]:!text-center">
                    <thead>
                      <tr>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-1/6">Rank</th>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-2/3">Activity Name</th>
                        <th className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 w-1/6">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topActivities.length > 0 ? (
                        topActivities.map((activity) => (
                          <tr key={activity.ranking}>
                            <td className="text-[0.875rem]">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                activity.ranking === 1 ? 'bg-yellow-100 text-yellow-800' :
                                activity.ranking === 2 ? 'bg-gray-100 text-gray-800' :
                                activity.ranking === 3 ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {activity.ranking}
                              </span>
                            </td>
                            <td className="text-[0.875rem] font-medium">{activity.name}</td>
                            <td className="text-[0.875rem] text-[#8c9097] dark:text-white/50">{activity.frequency}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-[0.875rem] text-[#8c9097] dark:text-white/50 py-4">
                            No activities data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Third Row */}
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
        <div className="lg:col-span-6 col-span-12">
          {isLoadingMonthly ? (
            <LineChartSkeleton />
          ) : (
            <div className="box h-full">
              <div className="box-header justify-between">
                <div className="box-title">
                  Assigned Tasks by Month
                </div>
              </div>
              <div className="box-body !py-5">
                <div id="task-completion-chart">
                  <ReactApexChart 
                    options={taskChartOptions} 
                    series={[
                      { name: 'Assigned Tasks', data: monthlyTaskData.assigned }
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