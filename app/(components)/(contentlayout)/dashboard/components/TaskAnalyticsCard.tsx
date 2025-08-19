import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TaskAnalyticsResponse, TaskAnalyticsData } from '../services/DashboardService';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface TaskAnalyticsCardProps {
  data: TaskAnalyticsResponse | null;
  isLoading: boolean;
  groupBy: 'status' | 'priority';
  title: string;
}

const TaskAnalyticsCard: React.FC<TaskAnalyticsCardProps> = ({ data, isLoading, groupBy, title }) => {

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
        const categories = data?.analytics.map(item => 
          groupBy === 'status' ? item.status : item.priority
        ) || [];
        const value = series[seriesIndex] || 0;
        const categoryName = categories[seriesIndex];
        return `<div class="custom-tooltip p-2">
          <span style="color: ${w.config.colors[seriesIndex]}">●</span>
          <span style="font-weight: bold; margin-left: 5px;">${categoryName}: ${value}</span>
        </div>`;
      }
    }
  });

  // Generate donut chart series
  const getChartSeries = () => {
    if (!data?.analytics.length) return [];
    return data.analytics.map(item => item.count);
  };

  // Get total count for center display
  const getTotalCount = () => {
    if (!data?.analytics.length) return 0;
    return data.analytics.reduce((sum, item) => sum + item.count, 0);
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
        {data && data.analytics.length > 0 ? (
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
             <div className="grid grid-cols-4 border-t border-dashed dark:border-defaultborder/10">
               {data.analytics.slice(0, 4).map((item, index) => (
                 <div key={index} className="col !p-0">
                   <div className={`p-[0.95rem] text-center ${index < 3 ? 'border-e border-dashed dark:border-defaultborder/10' : ''}`}>
                     <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1 inline-block">
                       {groupBy === 'status' ? item.status : item.priority}
                     </span>
                     <div>
                       <span className="text-[1rem] font-semibold">{item.count}</span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        ) : (
                     <div className="text-center py-8">
             <div className="text-gray-500 text-lg mb-2">No task analytics data available</div>
             <div className="text-gray-400 text-sm">
               No data available for the current selection
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default TaskAnalyticsCard;
