import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TaskAnalyticsResponse, TaskAnalyticsData } from '../services/DashboardService';
import { useRouter } from 'next/navigation';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface TaskAnalyticsCardProps {
  data: TaskAnalyticsResponse | null;
  isLoading: boolean;
  groupBy: 'status' | 'priority';
  title: string;
}

const TaskAnalyticsCard: React.FC<TaskAnalyticsCardProps> = ({ data, isLoading, groupBy, title }) => {
  const router = useRouter();

  // Handle status/priority click to navigate to tasks page
  const handleStatusClick = (statusOrPriority: string) => {
    const queryParams = new URLSearchParams();
    if (groupBy === 'status') {
      queryParams.set('status', statusOrPriority);
    } else {
      queryParams.set('priority', statusOrPriority);
    }
    router.push(`/tasks?${queryParams.toString()}`);
  };

  // Generate donut chart options (similar to Timelines by branches)
  const getChartOptions = () => ({
    chart: {
      type: 'donut' as const,
      height: 250,
      toolbar: {
        show: false
      }
    },
    colors: groupBy === 'status' 
      ? ["rgb(245, 184, 73)", "rgb(35, 183, 229)", "rgb(38, 191, 148)", "rgb(220, 53, 69)", "rgb(111, 66, 193)", "rgb(253, 126, 20)"]
      : ["rgb(38, 191, 148)", "rgb(245, 184, 73)", "rgb(253, 126, 20)", "rgb(220, 53, 69)", "rgb(111, 66, 193)"],
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        donut: {
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
    },
    legend: {
      show: false
    },
         tooltip: {
       enabled: true,
       custom: function({ series, seriesIndex, w }: any) {
         const displayData = getDisplayData();
         const value = series[seriesIndex] || 0;
         const categoryName = getDisplayValue(displayData[seriesIndex]);
         return `<div class="custom-tooltip p-2">
           <span style="color: ${w.config.colors[seriesIndex]}">●</span>
           <span style="font-weight: bold; margin-left: 5px;">${categoryName}: ${value}</span>
         </div>`;
       }
     }
  });

  // Generate donut chart series
  const getChartSeries = () => {
    return getDisplayData().map(item => item.count);
  };

  // Get total count for center display
  const getTotalCount = () => {
    return getDisplayData().reduce((sum, item) => sum + item.count, 0);
  };

  // Predefined statuses and priorities to show all possible values
  const getAllStatuses = () => {
    const statuses = ['pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed'];
    return statuses.map(status => {
      const found = data?.analytics.find(item => item.status === status);
      return {
        status,
        count: found ? found.count : 0
      };
    });
  };

  const getAllPriorities = () => {
    const priorities = ['low', 'medium', 'high', 'urgent', 'critical'];
    return priorities.map(priority => {
      const found = data?.analytics.find(item => item.priority === priority);
      return {
        priority,
        count: found ? found.count : 0
      };
    });
  };

  // Get data for display (all possible values with counts)
  const getDisplayData = () => {
    if (groupBy === 'status') {
      return getAllStatuses();
    } else {
      return getAllPriorities();
    }
  };

  // Helper function to get the value for display
  const getDisplayValue = (item: any) => {
    if (groupBy === 'status') {
      return item.status;
    } else {
      return item.priority;
    }
  };



  if (isLoading) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full animate-pulse">
        <div className="p-[10px] border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="p-[10px]">
          <div className="h-[280px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
      <div className="p-[10px] border-b border-gray-100">
        <h2 className="text-[0.875rem] font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-[10px]">
        <div className="space-y-4">
          <div className="leads-source-chart flex items-center justify-center">
            <ReactApexChart
              options={getChartOptions()}
              series={getChartSeries()}
              type="donut"
              width="100%"
              height={250}
            />
            <div className="lead-source-value">
              <span className="block text-[11px] font-bold text-[#495057]">Total</span>
              <span className="block text-lg font-bold text-[#323251]">{getTotalCount()}</span>
            </div>
          </div>
          <div className="grid grid-cols-6 border-t border-gray-100 pt-3">
            {getDisplayData().map((item, index) => (
              <div key={index}>
                <div
                  className="p-2 text-center cursor-pointer hover:bg-gray-50 rounded transition-colors border-r border-gray-100 last:border-r-0"
                  onClick={() => handleStatusClick(getDisplayValue(item))}
                >
                  <span className="text-[10px] font-bold text-[#495057] uppercase block mb-0.5">
                    {getDisplayValue(item)}
                  </span>
                  <span className="text-[12px] font-bold text-[#323251]">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAnalyticsCard;
