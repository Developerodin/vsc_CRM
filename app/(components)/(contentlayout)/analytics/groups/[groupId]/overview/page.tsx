"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from '@/app/api/config/BaseUrl';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from "next/link";

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

interface Group {
  _id: string;
  name: string;
  branch: {
    _id: string;
    name: string;
  };
  numberOfClients: number;
}

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  taskCount: number;
  timelineCount: number;
}

interface TaskAnalytics {
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

interface TimelineAnalytics {
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

interface GroupAnalyticsResponse {
  group: Group;
  clients: Client[];
  taskAnalytics: TaskAnalytics;
  timelineAnalytics: TimelineAnalytics;
}

const GroupOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  
  const [groupData, setGroupData] = useState<GroupAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupOverview();
    }
  }, [groupId]);

  const fetchGroupOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${Base_url}groups/${groupId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Group analytics API response:', response.data);
      setGroupData(response.data);
    } catch (err) {
      console.error('Error fetching group overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch group analytics');
    } finally {
      setLoading(false);
    }
  };

  // Task Status Chart
  const getTaskStatusChartSeries = () => {
    if (!groupData?.taskAnalytics?.statusBreakdown) return [0, 0, 0, 0, 0, 0];
    const breakdown = groupData.taskAnalytics.statusBreakdown;
    const series = [
      Number(breakdown.pending) || 0,
      Number(breakdown.ongoing) || 0,
      Number(breakdown.completed) || 0,
      Number(breakdown.on_hold) || 0,
      Number(breakdown.delayed) || 0,
      Number(breakdown.cancelled) || 0
    ];
    return series;
  };

  const getTaskStatusChartOptions = () => {
    const series = getTaskStatusChartSeries();
    const total = series.reduce((a, b) => a + b, 0);
    const hasData = total > 0;
    
    return {
      chart: {
        type: 'donut' as const,
        height: 350,
        toolbar: { show: false },
        animations: {
          enabled: true,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      labels: ['Pending', 'Ongoing', 'Completed', 'On Hold', 'Delayed', 'Cancelled'],
      colors: ['#F59E0B', '#3B82F6', '#10B981', '#F97316', '#EF4444', '#6B7280'],
      legend: {
        position: 'bottom' as const,
        show: true,
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: 500,
        formatter: function(seriesName: string, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          return seriesName + ': ' + value;
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          if (value === 0) return '';
          return val.toFixed(1) + '%';
        },
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151'
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
                formatter: function(val: string) {
                  return total.toString();
                }
              },
              total: {
                show: true,
                label: 'Total Tasks',
                fontSize: '14px',
                fontWeight: 600,
                color: '#6B7280',
                formatter: function() {
                  return total.toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: function(val: number) {
            return val + ' tasks';
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            height: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };
  };

  // Task Priority Chart
  const getTaskPriorityChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 350
    },
    colors: ['#3B82F6'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['Low', 'Medium', 'High', 'Urgent', 'Critical']
    },
    yaxis: {
      title: {
        text: 'Number of Tasks'
      }
    }
  });

  const getTaskPriorityChartSeries = () => {
    if (!groupData?.taskAnalytics?.priorityBreakdown) return [];
    const breakdown = groupData.taskAnalytics.priorityBreakdown;
    return [{
      name: 'Tasks by Priority',
      data: [
        breakdown.low || 0,
        breakdown.medium || 0,
        breakdown.high || 0,
        breakdown.urgent || 0,
        breakdown.critical || 0
      ]
    }];
  };

  // Timeline Status Chart
  const getTimelineStatusChartSeries = () => {
    if (!groupData?.timelineAnalytics?.statusBreakdown) return [0, 0, 0, 0];
    const breakdown = groupData.timelineAnalytics.statusBreakdown;
    const series = [
      Number(breakdown.pending) || 0,
      Number(breakdown.ongoing) || 0,
      Number(breakdown.completed) || 0,
      Number(breakdown.delayed) || 0
    ];
    return series;
  };

  const getTimelineStatusChartOptions = () => {
    const series = getTimelineStatusChartSeries();
    const total = series.reduce((a, b) => a + b, 0);
    const hasData = total > 0;
    
    return {
      chart: {
        type: 'donut' as const,
        height: 350,
        toolbar: { show: false },
        animations: {
          enabled: true,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      labels: ['Pending', 'Ongoing', 'Completed', 'Delayed'],
      colors: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
      legend: {
        position: 'bottom' as const,
        show: true,
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: 500,
        formatter: function(seriesName: string, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          return seriesName + ': ' + value;
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          if (value === 0) return '';
          return val.toFixed(1) + '%';
        },
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151'
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
                formatter: function(val: string) {
                  return total.toString();
                }
              },
              total: {
                show: true,
                label: 'Total Timelines',
                fontSize: '14px',
                fontWeight: 600,
                color: '#6B7280',
                formatter: function() {
                  return total.toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: function(val: number) {
            return val + ' timelines';
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            height: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };
  };

  // Timeline Frequency Chart
  const getTimelineFrequencyChartOptions = () => ({
    chart: {
      type: 'bar' as const,
      height: 350
    },
    colors: ['#8B5CF6'],
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: '60%',
        borderRadius: 6
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      title: {
        text: 'Number of Timelines'
      }
    },
    yaxis: {
      categories: ['Yearly', 'Quarterly', 'Monthly', 'Weekly', 'Daily', 'Hourly', 'OneTime', 'None']
    }
  });

  const getTimelineFrequencyChartSeries = () => {
    if (!groupData?.timelineAnalytics?.frequencyBreakdown) return [];
    const breakdown = groupData.timelineAnalytics.frequencyBreakdown;
    return [{
      name: 'Timelines by Frequency',
      data: [
        breakdown.Yearly || 0,
        breakdown.Quarterly || 0,
        breakdown.Monthly || 0,
        breakdown.Weekly || 0,
        breakdown.Daily || 0,
        breakdown.Hourly || 0,
        breakdown.OneTime || 0,
        breakdown.None || 0
      ]
    }];
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin"></i>
            </div>
            <p className="text-gray-500">Loading group analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <p className="text-red-500 mb-4">Error loading group analytics</p>
            <button 
              onClick={fetchGroupOverview}
              className="ti-btn ti-btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500">No group data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Group Analytics - ${groupData.group.name}`} />

      {/* Page Header */}
      <div className="box !bg-transparent border-0 shadow-none mb-6">
        <div className="box-header flex justify-between items-center">
          <div>
            <h1 className="box-title text-3xl font-bold text-gray-900">{groupData.group.name}</h1>
            <p className="text-gray-600 mt-1">Comprehensive analytics and insights</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span><i className="ri-building-line mr-1"></i> {groupData.group.branch?.name || 'N/A'}</span>
              <span><i className="ri-user-line mr-1"></i> {groupData.group.numberOfClients} Clients</span>
            </div>
          </div>
          <Link href="/analytics/groups" className="ti-btn ti-btn-secondary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Groups
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold">{groupData.taskAnalytics?.total || 0}</p>
            </div>
            <i className="ri-task-line text-3xl text-blue-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed Tasks</p>
              <p className="text-3xl font-bold">{groupData.taskAnalytics?.statusBreakdown?.completed || 0}</p>
            </div>
            <i className="ri-check-double-line text-3xl text-green-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Timelines</p>
              <p className="text-3xl font-bold">{groupData.timelineAnalytics?.total || 0}</p>
            </div>
            <i className="ri-time-line text-3xl text-purple-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Completed Timelines</p>
              <p className="text-3xl font-bold">{groupData.timelineAnalytics?.statusBreakdown?.completed || 0}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-orange-200"></i>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
       

        {/* Task Priority Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Priority Breakdown</h2>
          {groupData.taskAnalytics && ReactApexChart ? (
            <ReactApexChart
              options={getTaskPriorityChartOptions()}
              series={getTaskPriorityChartSeries()}
              type="bar"
              height={350}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p className="text-gray-500">No priority data available</p>
            </div>
          )}
        </div>

    

        {/* Timeline Frequency Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline Frequency Breakdown</h2>
          {groupData.timelineAnalytics && ReactApexChart ? (
            <ReactApexChart
              options={getTimelineFrequencyChartOptions()}
              series={getTimelineFrequencyChartSeries()}
              type="bar"
              height={350}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p className="text-gray-500">No frequency data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Status Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Status Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <p className="text-2xl font-bold text-warning">{groupData.taskAnalytics?.statusBreakdown?.pending || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{groupData.taskAnalytics?.statusBreakdown?.ongoing || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Ongoing</p>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <p className="text-2xl font-bold text-success">{groupData.taskAnalytics?.statusBreakdown?.completed || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Completed</p>
          </div>
          <div className="text-center p-4 bg-orange-100 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{groupData.taskAnalytics?.statusBreakdown?.on_hold || 0}</p>
            <p className="text-sm text-gray-600 mt-1">On Hold</p>
          </div>
          <div className="text-center p-4 bg-danger/10 rounded-lg">
            <p className="text-2xl font-bold text-danger">{groupData.taskAnalytics?.statusBreakdown?.delayed || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Delayed</p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{groupData.taskAnalytics?.statusBreakdown?.cancelled || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Timeline Status Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline Status Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <p className="text-2xl font-bold text-warning">{groupData.timelineAnalytics?.statusBreakdown?.pending || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{groupData.timelineAnalytics?.statusBreakdown?.ongoing || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Ongoing</p>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <p className="text-2xl font-bold text-success">{groupData.timelineAnalytics?.statusBreakdown?.completed || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Completed</p>
          </div>
          <div className="text-center p-4 bg-danger/10 rounded-lg">
            <p className="text-2xl font-bold text-danger">{groupData.timelineAnalytics?.statusBreakdown?.delayed || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Delayed</p>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Clients in Group</h2>
          <span className="text-sm text-gray-600">{groupData.clients?.length || 0} clients</span>
        </div>

        {groupData.clients && groupData.clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timelines
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupData.clients.map((client) => (
                  <tr key={client._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/analytics/clients/${client._id}/overview`)}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                      >
                        {client.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.email}</div>
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.taskCount || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.timelineCount || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/analytics/clients/${client._id}/overview`)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Details
                      </button>
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
              <p className="text-gray-500">No clients in this group</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupOverviewPage;

