"use client";

import React, { useMemo, useState } from "react";

export interface TeamMemberTaskDetail {
  taskId: string;
  taskName: string;
  clientName: string;
  clientId?: string | null;
  activityName: string;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  timelineId?: string | null;
}

interface TaskDetailsTableProps {
  tasks: TeamMemberTaskDetail[];
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const STATUS_FILTERS = ["all", "completed", "pending", "ongoing", "on_hold", "delayed", "cancelled"] as const;

/**
 * Displays team member tasks with client name, task name, and status.
 */
const TaskDetailsTable = ({ tasks, getStatusColor, formatDate }: TaskDetailsTableProps) => {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") {
      return tasks;
    }
    return tasks.filter((task) => task.status === statusFilter);
  }, [tasks, statusFilter]);

  const statusCounts = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      const status = task.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No task details available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks by status">
        {STATUS_FILTERS.map((status) => {
          const count = status === "all" ? tasks.length : statusCounts[status] || 0;
          if (status !== "all" && count === 0) {
            return null;
          }

          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
              aria-pressed={statusFilter === status}
            >
              {status === "all" ? "All" : status.replace("_", " ")} ({count})
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Client Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Task Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task, index) => (
                <tr key={`${task.taskId}-${task.timelineId || index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-200">
                    {task.clientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-200">
                    {task.taskName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border border-gray-200">
                    {task.activityName}
                  </td>
                  <td className="px-4 py-3 border border-gray-200">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full border capitalize ${getStatusColor(task.status)}`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize border border-gray-200">
                    {task.priority}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border border-gray-200">
                    {task.endDate ? formatDate(task.endDate) : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                  No tasks match the selected filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskDetailsTable;
