import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { TaskTrendsResponse, TaskTrendsData } from '../services/DashboardService';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface TaskTrendsChartProps {
  data: TaskTrendsResponse | null;
  isLoading: boolean;
  branchId?: string;
  selectedFrequency?: string;
}

const TaskTrendsChart: React.FC<TaskTrendsChartProps> = ({ data, isLoading, branchId, selectedFrequency }) => {
  const [selectedInterval, setSelectedInterval] = useState<string>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filteredData, setFilteredData] = useState<TaskTrendsData[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Set default date range (last 6 months)
  useEffect(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Helper function to convert interval to display format
  const getIntervalDisplayName = (interval: string) => {
    const intervalDisplayNames: { [key: string]: string } = {
      'day': 'Daily',
      'week': 'Weekly',
      'month': 'Monthly'
    };
    return intervalDisplayNames[interval] || interval;
  };

  // Sync selectedInterval with selectedFrequency prop
  useEffect(() => {
    if (selectedFrequency) {
      // Map frequency to API interval format
      const frequencyToInterval: { [key: string]: string } = {
        'Daily': 'day',
        'Weekly': 'week',
        'Monthly': 'month'
      };
      const interval = frequencyToInterval[selectedFrequency] || 'month';
      setSelectedInterval(interval);
    }
  }, [selectedFrequency]);

  // Filter data based on selected interval and date range
  useEffect(() => {
    if (data?.trends) {
      let filtered = data.trends;
      
      // Filter by date range if dates are selected
      if (startDate && endDate) {
        filtered = data.trends.filter(trend => {
          const trendDate = new Date(trend.interval);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return trendDate >= start && trendDate <= end;
        });
      }
      
      setFilteredData(filtered);
    }
  }, [data, startDate, endDate, selectedInterval]);

  const handleIntervalChange = (interval: string) => {
    setSelectedInterval(interval);
    // Trigger parent component to refetch data with new interval
    if ((window as any).refreshTaskTrends) {
      (window as any).refreshTaskTrends(interval);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    
    // Trigger parent component to refetch data with new date range
    if ((window as any).refreshTaskTrends) {
      (window as any).refreshTaskTrends();
    }
  };

  const clearDateFilters = () => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    // Trigger parent component to refetch data
    if ((window as any).refreshTaskTrends) {
      (window as any).refreshTaskTrends();
    }
  };

  // Generate chart options
  const getChartOptions = () => ({
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
    colors: ['#23b7e5', '#38bf94', '#f5b849', '#dc3545', '#6f42c1', '#fd7e14'],
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
      categories: filteredData.map(item => item.interval),
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
      shared: true,
      intersect: false,
      y: {
        formatter: function (val: number) {
          return (val || 0) + ' tasks';
        }
      }
    }
  });

  // Generate chart series for status breakdown
  const getStatusSeries = () => {
    if (!filteredData.length) return [];

    return [
      {
        name: 'Pending',
        data: filteredData.map(item => item.statusBreakdown.pending)
      },
      {
        name: 'Ongoing',
        data: filteredData.map(item => item.statusBreakdown.ongoing)
      },
      {
        name: 'Completed',
        data: filteredData.map(item => item.statusBreakdown.completed)
      },
      {
        name: 'On Hold',
        data: filteredData.map(item => item.statusBreakdown.on_hold)
      },
      {
        name: 'Cancelled',
        data: filteredData.map(item => item.statusBreakdown.cancelled)
      },
      {
        name: 'Delayed',
        data: filteredData.map(item => item.statusBreakdown.delayed)
      }
    ];
  };

  // Generate chart series for priority breakdown
  const getPrioritySeries = () => {
    if (!filteredData.length) return [];

    return [
      {
        name: 'Low',
        data: filteredData.map(item => item.priorityBreakdown.low)
      },
      {
        name: 'Medium',
        data: filteredData.map(item => item.priorityBreakdown.medium)
      },
      {
        name: 'High',
        data: filteredData.map(item => item.priorityBreakdown.high)
      },
      {
        name: 'Urgent',
        data: filteredData.map(item => item.priorityBreakdown.urgent)
      },
      {
        name: 'Critical',
        data: filteredData.map(item => item.priorityBreakdown.critical)
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full animate-pulse">
        <div className="p-[10px] border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-40" />
        </div>
        <div className="p-[10px]">
          <div className="h-[350px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded overflow-hidden h-full">
      {showFilters && (
        <div className="p-[10px] border-b border-gray-100 bg-gray-50">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[11px] font-medium text-[#495057]">Start:</label>
            <input type="date" value={startDate} onChange={(e) => handleDateChange('start', e.target.value)} className="bg-white border border-gray-200 text-[11px] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" />
            <label className="text-[11px] font-medium text-[#495057]">End:</label>
            <input type="date" value={endDate} onChange={(e) => handleDateChange('end', e.target.value)} className="bg-white border border-gray-200 text-[11px] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300" />
            <button onClick={clearDateFilters} className="px-3 py-1.5 text-[11px] font-bold rounded bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200">
              Reset Dates
            </button>
            {(startDate || endDate) && (
              <span className="text-[10px] text-[#495057]">
                {startDate && `From: ${new Date(startDate).toLocaleDateString()}`}
                {endDate && ` To: ${new Date(endDate).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-[10px]">
        {filteredData.length > 0 ? (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-[0.875rem] font-bold text-gray-800">
                  Task Status Trends ({getIntervalDisplayName(selectedInterval)})
                </h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">
                    <i className={showFilters ? 'ri-filter-off-line' : 'ri-filter-line'} />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                  <select value={selectedInterval} onChange={(e) => handleIntervalChange(e.target.value)} className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 min-w-[100px]">
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              </div>
              <div id="task-status-trends-chart">
                <ReactApexChart options={getChartOptions()} series={getStatusSeries()} type="line" width="100%" height={350} />
              </div>
            </div>

            <div>
              <h4 className="text-[0.875rem] font-bold text-gray-800 mb-3">Task Priority Trends ({getIntervalDisplayName(selectedInterval)})</h4>
              <div id="task-priority-trends-chart">
                <ReactApexChart options={{ ...getChartOptions(), colors: ['#38bf94', '#f5b849', '#fd7e14', '#dc3545', '#6f42c1'] }} series={getPrioritySeries()} type="line" width="100%" height={350} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-100 rounded">
              <div className="text-center">
                <div className="text-lg font-bold text-sky-600">{filteredData.reduce((sum, item) => sum + item.totalTasks, 0)}</div>
                <div className="text-[11px] font-medium text-[#495057]">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{filteredData.reduce((sum, item) => sum + item.statusBreakdown.completed, 0)}</div>
                <div className="text-[11px] font-medium text-[#495057]">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{filteredData.reduce((sum, item) => sum + item.statusBreakdown.ongoing, 0)}</div>
                <div className="text-[11px] font-medium text-[#495057]">Ongoing</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{filteredData.reduce((sum, item) => sum + item.statusBreakdown.delayed, 0)}</div>
                <div className="text-[11px] font-medium text-[#495057]">Delayed</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[12px] font-medium text-[#495057] mb-1">No task trends data available</p>
            <p className="text-[11px] text-gray-400">
              {startDate && endDate ? `No data for ${startDate} to ${endDate}` : 'Select a date range to view task trends'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskTrendsChart;
