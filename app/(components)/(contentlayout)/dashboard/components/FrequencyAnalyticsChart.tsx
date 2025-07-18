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
      <div className="box h-full animate-pulse">
        <div className="box-header justify-between">
          <div className="h-6 bg-gray-300 rounded w-40"></div>
          <div className="w-[1.75rem] h-[1.75rem] bg-gray-300 rounded"></div>
        </div>
        <div className="box-body">
          <div className="h-[350px] bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // Validate data and provide fallbacks
  const validData = data && Array.isArray(data) && data.length > 0 ? data : [];
  
  if (validData.length === 0) {
    return (
      <div className="box h-full">
        <div className="box-header">
          <div className="box-title">
            <i className="ti ti-chart-bar text-primary me-2"></i>
            Frequency Analytics
          </div>
        </div>
        <div className="box-body">
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            <div className="text-center">
              <i className="ti ti-chart-bar text-4xl mb-4"></i>
              <p>No frequency analytics data available</p>
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
    <div className="box h-full">
      <div className="box-header">
        <div className="box-title">
          <i className="ti ti-chart-bar text-primary me-2"></i>
          Frequency Analytics
        </div>
      </div>
      <div className="box-body">
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