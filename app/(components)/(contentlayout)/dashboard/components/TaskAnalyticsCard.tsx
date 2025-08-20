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
  }

  return (
    <div className="box h-full">
             <div className="box-header">
         <div className="box-title">
           {title}
         </div>
       </div>

             <div className="box-body !pt-0">
         <div className="space-y-6">
           {/* Chart */}
           <div className="leads-source-chart flex items-center justify-center">
             <ReactApexChart 
               options={getChartOptions()} 
               series={getChartSeries()} 
               type="donut" 
               width="100%" 
               height={250} 
             />
             <div className="lead-source-value">
               <span className="block text-[0.875rem]">Total</span>
               <span className="block text-[1.5625rem] font-bold">{getTotalCount()}</span>
             </div>
           </div>

           {/* Summary Statistics */}
           <div className="grid grid-cols-6 border-t border-dashed dark:border-defaultborder/10">
             {getDisplayData().map((item, index) => (
               <div key={index} className="col !p-0">
                 <div 
                   className={`p-[0.95rem] text-center cursor-pointer hover:bg-gray-50 transition-colors ${index < 5 ? 'border-e border-dashed dark:border-defaultborder/10' : ''}`}
                   onClick={() => handleStatusClick(getDisplayValue(item))}
                 >
                   <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 inline-block">
                     {getDisplayValue(item).toUpperCase()}
                   </span>
                   <div>
                     <span className="text-[1rem] font-semibold">{item.count}</span>
                   </div>
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
