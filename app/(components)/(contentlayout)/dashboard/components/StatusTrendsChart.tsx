"use client"
import React from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface StatusTrendsData {
  interval: string;
  totalCount: number;
  statusBreakdown: {
    pending: number;
    completed: number;
    delayed: number;
    ongoing: number;
  };
}

interface StatusTrendsChartProps {
  data: StatusTrendsData[];
  isLoading: boolean;
  interval: string;
}

const StatusTrendsChart: React.FC<StatusTrendsChartProps> = ({ data, isLoading, interval }) => {
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
            <i className="ti ti-trending-up text-primary me-2"></i>
            Status Trends
          </div>
        </div>
        <div className="box-body">
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            <div className="text-center">
              <i className="ti ti-trending-up text-4xl mb-4"></i>
              <p>No status trends data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    colors: ['#f5b849', '#23b7e5', '#26bf94', '#dc3545'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
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
      categories: validData.map(item => item?.interval || 'Unknown'),
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
      position: 'top',
      horizontalAlign: 'center',
      labels: {
        colors: '#8c9097'
      }
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return (val || 0) + ' tasks';
        }
      }
    },
    markers: {
      size: 5,
      hover: {
        size: 7
      }
    }
  };

  const series = [
    {
      name: 'Pending',
      data: validData.map(item => item?.statusBreakdown?.pending || 0)
    },
    {
      name: 'Ongoing',
      data: validData.map(item => item?.statusBreakdown?.ongoing || 0)
    },
    {
      name: 'Completed',
      data: validData.map(item => item?.statusBreakdown?.completed || 0)
    },
    {
      name: 'Delayed',
      data: validData.map(item => item?.statusBreakdown?.delayed || 0)
    }
  ];

  const getIntervalLabel = () => {
    switch (interval) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      default: return 'Daily';
    }
  };

  return (
    <div className="box h-full">
      <div className="box-header">
        <div className="box-title">
          <i className="ti ti-trending-up text-primary me-2"></i>
          Status Trends ({getIntervalLabel()})
        </div>
      </div>
      <div className="box-body">
        <ReactApexChart
          options={chartOptions}
          series={series}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
};

export default StatusTrendsChart; 