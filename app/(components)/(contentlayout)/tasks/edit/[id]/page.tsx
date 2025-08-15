"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Base_url } from '@/app/api/config/BaseUrl';
import Seo from "@/shared/layout-components/seo/seo";

interface Task {
  id: string;
  teamMember: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  branch: {
    id: string;
    name: string;
    location?: string;
  };
  assignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  timeline?: Array<{
    id: string;
    activity: string;
    client: string;
    status: string;
  }>;
  remarks?: string;
  status: 'pending' | 'ongoing' | 'completed' | 'on_hold' | 'cancelled' | 'delayed';
  metadata?: any;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Branch {
  id: string;
  name: string;
  location?: string;
}

interface Timeline {
  id: string;
  activity: {
    name: string;
  };
  client: {
    name: string;
  };
}

const EditTaskPage = () => {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [formData, setFormData] = useState({
    teamMember: "",
    startDate: "",
    endDate: "",
    priority: "medium",
    branch: "",
    assignedBy: "",
    timeline: [] as string[],
    remarks: "",
    status: "pending",
    metadata: {}
  });

  useEffect(() => {
    if (taskId) {
      fetchTask();
      fetchTeamMembers();
      fetchBranches();
      fetchTimelines();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }
      
      const taskData: Task = await response.json();
      setTask(taskData);
      setFormData({
        teamMember: taskData.teamMember?.id || "",
        startDate: taskData.startDate ? new Date(taskData.startDate).toISOString().split('T')[0] : "",
        endDate: taskData.endDate ? new Date(taskData.endDate).toISOString().split('T')[0] : "",
        priority: taskData.priority,
        branch: taskData.branch?.id || "",
        assignedBy: taskData.assignedBy?.id || "",
        timeline: taskData.timeline?.map(t => t.id) || [],
        remarks: taskData.remarks || "",
        status: taskData.status,
        metadata: taskData.metadata || {}
      });
    } catch (error) {
      toast.error('Failed to fetch task');
      console.error('Error fetching task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${Base_url}team-members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${Base_url}branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchTimelines = async () => {
    try {
      const response = await fetch(`${Base_url}timelines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTimelines(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching timelines:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimelineChange = (timelineId: string) => {
    setFormData(prev => ({
      ...prev,
      timeline: prev.timeline.includes(timelineId)
        ? prev.timeline.filter(id => id !== timelineId)
        : [...prev.timeline, timelineId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamMember || !formData.startDate || !formData.endDate || !formData.branch) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${Base_url}tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }

      toast.success('Task updated successfully');
      router.push('/timelines');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="main-content">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium text-gray-600">Task not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Task" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Edit Task</h1>
            </div>
          </div>

          {/* Form */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Member */}
                  <div>
                    <label className="form-label">Team Member <span className="text-red-500">*</span></label>
                    <select
                      name="teamMember"
                      value={formData.teamMember}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Team Member</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="form-label">Branch <span className="text-red-500">*</span></label>
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} {branch.location && `(${branch.location})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="form-label">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="form-label">End Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                </div>

                {/* Timelines */}
                <div>
                  <label className="form-label">Related Timelines</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    {timelines.map(timeline => (
                      <label key={timeline.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.timeline.includes(timeline.id)}
                          onChange={() => handleTimelineChange(timeline.id)}
                          className="form-checkbox"
                        />
                        <span className="text-sm">
                          {timeline.activity.name} - {timeline.client.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="form-label">Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-control"
                    placeholder="Enter task details, notes, or instructions..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="ti-btn ti-btn-secondary"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskPage;
