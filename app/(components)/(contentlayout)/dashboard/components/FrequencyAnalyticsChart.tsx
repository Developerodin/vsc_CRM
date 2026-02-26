"use client"
import React from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface FrequencyAnalyticsData {
  frequency: string;
  totalPeriods: number;
  pendingCount: number;
  completedCount: number;
  delayedCount: number;
  ongoingCount: number;
  completionRate: number;
}

interface FrequencyAnalyticsChartProps {
  data: FrequencyAnalyticsData[];
  isLoading: boolean;
}

const FrequencyAnalyticsChart: React.FC<FrequencyAnalyticsChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full animate-pulse">
        <div className="p-[10px] border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-36" />
        </div>
        <div className="p-[10px]">
          <div className="h-[350px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  // Validate data and provide fallbacks
  const validData = data && Array.isArray(data) && data.length > 0 ? data : [];

  if (validData.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
        <div className="p-[10px] border-b border-gray-100">
          <h2 className="text-[0.875rem] font-bold text-gray-800">Frequency Analytics</h2>
        </div>
        <div className="p-[10px]">
          <div className="flex items-center justify-center h-[350px] text-[#495057]">
            <div className="text-center">
              <i className="ri-bar-chart-line text-4xl text-gray-200 mb-4 block" />
              <p className="text-[12px] font-medium">No frequency analytics data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      },
      stacked: true
    },
    colors: ['#f5b849', '#23b7e5', '#26bf94', '#dc3545'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: validData.map(item => item?.frequency || 'Unknown'),
      labels: {
        style: {
          colors: '#8c9097',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Periods',
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
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return (val || 0) + ' periods';
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      labels: {
        colors: '#8c9097'
      }
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      }
    }
  };

  const series = [
    {
      name: 'Pending',
      data: validData.map(item => item?.pendingCount || 0)
    },
    {
      name: 'Ongoing',
      data: validData.map(item => item?.ongoingCount || 0)
    },
    {
      name: 'Completed',
      data: validData.map(item => item?.completedCount || 0)
    },
    {
      name: 'Delayed',
      data: validData.map(item => item?.delayedCount || 0)
    }
  ];

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
      <div className="p-[10px] border-b border-gray-100">
        <h2 className="text-[0.875rem] font-bold text-gray-800">Frequency Analytics</h2>
      </div>
      <div className="p-[10px]">
        <ReactApexChart
          options={chartOptions}
          series={series}
          type="bar"
          height={350}
        />
      </div>
    </div>
  );
};

export default FrequencyAnalyticsChart; 