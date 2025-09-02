"use client"
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Base_url } from '@/app/api/config/BaseUrl'
import { toast } from 'react-hot-toast'

interface TeamMemberData {
  id: string
  name: string
  email?: string
  phone?: string
  branch?: {
    id: string
    name: string
    address: string
    city: string
    state: string
    country: string
  }
  skills?: Array<{
    id: string
    name: string
    description: string
    category: string
  }>
}

interface Task {
  _id: string
  status: string
  priority: string
  startDate: string
  endDate: string
  remarks: string
  teamMember: string
  branch: {
    _id: string
    name: string
    address: string
    city: string
    state: string
  }
  timeline: Array<{
    _id: string
    status: string
    client: {
      _id: string
      name: string
      email: string
      phone: string
    }
    activity: {
      _id: string
      name: string
    }
    startDate: string
    endDate: string
    frequency: string
  }>
  attachments: Array<{
    _id: string
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
  createdAt: string
  updatedAt: string
  metadata: any
}

interface TaskResponse {
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    totalTasks: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const TeamMemberDashboard = () => {
  const router = useRouter()
  const [teamMemberData, setTeamMemberData] = useState<TeamMemberData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Task filters and pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')
  
  // Task update modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    status: '',
    remarks: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('teamMemberToken')
    const teamMemberDataStr = localStorage.getItem('teamMemberData')
    
    if (!token || !teamMemberDataStr) {
      router.push('/team-member-login')
      return
    }

    try {
      const teamMember = JSON.parse(teamMemberDataStr)
      console.log('Team member data loaded:', teamMember)
      setTeamMemberData(teamMember)
      setLoading(false)
      // Don't call fetchTasks here - let the other useEffect handle it
    } catch (error) {
      console.error('Error parsing team member data:', error)
      setError('Invalid team member data')
      setLoading(false)
      setTimeout(() => {
        router.push('/team-member-login')
      }, 2000)
    }
  }, [router])

  const fetchTasks = async () => {
    // Don't fetch if still loading or no team member data
    if (loading || !teamMemberData) {
      console.log('Skipping fetchTasks - still loading or no team member data')
      return
    }
    
    setTasksLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('teamMemberToken')
      if (!token) {
        setError('No authentication token found')
        return
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (startDateFilter) params.append('startDate', startDateFilter)
      if (endDateFilter) params.append('endDate', endDateFilter)
      
      const apiUrl = `${Base_url}team-member-auth/tasks?${params}`
      console.log('Fetching tasks with URL:', apiUrl)
      console.log('Token:', token)
      console.log('Base_url:', Base_url)
      
      // First, let's test if the token is valid by calling the profile endpoint
      try {
        const profileResponse = await axios.get(`${Base_url}team-member-auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('Profile test successful:', profileResponse.data)
      } catch (profileError: any) {
        console.error('Profile test failed:', profileError.response?.data)
        console.error('Profile error status:', profileError.response?.status)
      }
      
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('Tasks API response:', response.data)
      
      if (response.data.success) {
        const taskData: TaskResponse = response.data.data
        setTasks(taskData.tasks)
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error message:', error.message)
      
      if (error.response?.status === 401) {
        localStorage.removeItem('teamMemberToken')
        localStorage.removeItem('teamMemberData')
        localStorage.removeItem('teamMemberRefreshToken')
        router.push('/team-member-login')
      } else if (error.response?.status === 404) {
        setError('Tasks endpoint not found. Please check the API configuration.')
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.')
      } else {
        setError(`Failed to load tasks: ${error.response?.data?.message || error.message}`)
      }
    } finally {
      setTasksLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('teamMemberToken')
      const refreshToken = localStorage.getItem('teamMemberRefreshToken')
      if (token && refreshToken) {
        await axios.post(`${Base_url}team-member-auth/logout`, { 
          refreshToken: refreshToken 
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('teamMemberToken')
      localStorage.removeItem('teamMemberData')
      localStorage.removeItem('teamMemberRefreshToken')
      router.push('/team-member-login')
    }
  }

  const openUpdateModal = (task: Task) => {
    setSelectedTask(task)
    setUpdateForm({
      status: task.status,
      remarks: task.remarks
    })
    setShowUpdateModal(true)
  }

  const closeUpdateModal = () => {
    setShowUpdateModal(false)
    setSelectedTask(null)
    setUpdateForm({
      status: '',
      remarks: ''
    })
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return
    
    // For delayed tasks, only allow status change to completed
    if (selectedTask.status === 'delayed' && updateForm.status !== 'completed') {
      toast.error('Delayed tasks can only be marked as completed', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      return;
    }
    
    setUpdatingTask(true)
    try {
      const token = localStorage.getItem('teamMemberToken')
      const updateData: any = {
        status: updateForm.status,
      }
      
      // Only include remarks if the task is not delayed
      if (selectedTask.status !== 'delayed') {
        updateData.remarks = updateForm.remarks
      }
      
      const response = await axios.patch(`${Base_url}team-member-auth/tasks/${selectedTask._id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setSuccess(selectedTask.status === 'delayed' ? 'Task marked as completed!' : 'Task updated successfully!')
        closeUpdateModal()
        fetchTasks() // Refresh tasks
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error: any) {
      console.error('Error updating task:', error)
      setError('Failed to update task')
      setTimeout(() => setError(''), 3000)
    } finally {
      setUpdatingTask(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      case 'ongoing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
      case 'delayed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
      case 'critical': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Refresh tasks when filters change
  useEffect(() => {
    if (teamMemberData && !loading) {
      fetchTasks()
    }
  }, [currentPage, itemsPerPage, statusFilter, priorityFilter, startDateFilter, endDateFilter, teamMemberData, loading])

  if (loading || !teamMemberData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300">
              Welcome, {teamMemberData?.name || 'Team Member'}
            </h1>
            {/* {teamMemberData?.branch && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Branch: {teamMemberData.branch.name}
              </p>
            )} */}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="sm:hidden text-xs text-gray-600 dark:text-gray-300">
              {teamMemberData?.name || 'Team Member'}
            </span>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <span className="hidden sm:inline">Logout</span>
              <i className="sm:hidden ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
          <div className="flex items-center justify-between">
            <span className="truncate">{error}</span>
            <button onClick={() => setError('')} className="ml-2 sm:ml-4 text-red-500 hover:text-red-700 flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
          <div className="flex items-center justify-between">
            <span className="truncate">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-2 sm:ml-4 text-green-500 hover:text-green-700 flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Tasks</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {tasks.length > 0 ? `${tasks.length} task(s) found` : 'No tasks available'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchTasks}
                  disabled={tasksLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {tasksLoading ? 'Loading...' : 'Refresh Tasks'}
                </button>
                {/* <button
                  onClick={() => {
                    console.log('Testing API connectivity...')
                    console.log('Base_url:', Base_url)
                    console.log('Full tasks URL:', `${Base_url}team-member-auth/tasks`)
                    console.log('Token:', localStorage.getItem('teamMemberToken'))
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                >
                  Debug API
                </button> */}
              </div>
            </div>
            
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Delayed Tasks Warning */}
            {tasks.some(task => task.status === 'delayed') && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <i className="ri-information-line text-yellow-500 text-xl mr-3"></i>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Delayed Tasks Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Tasks marked as "Delayed" can only be updated to "Completed" status. Click the "Update" button to mark them as completed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Table */}
            <div className="overflow-x-auto">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : tasks.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Task Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Clients & Activities</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status & Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timeline</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{task.remarks}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Branch: {task.branch?.name || 'N/A'}
                          </div>
                          {task.attachments && task.attachments.length > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              📎 {task.attachments.length} attachment(s)
                            </div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Created: {formatDate(task.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {task.timeline && task.timeline.length > 0 ? (
                            <div className="space-y-2">
                              {task.timeline.slice(0, 3).map((timeline, index) => (
                                <div key={timeline._id} className="border-l-2 border-gray-200 pl-2">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {timeline.client.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {timeline.activity.name} • {timeline.frequency}
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {timeline.status}
                                  </div>
                                </div>
                              ))}
                              {task.timeline.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  +{task.timeline.length - 3} more clients
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No timeline data</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              {task.status === 'delayed' && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                  <i className="ri-check-line mr-1"></i>
                                  Can Complete
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>Start: {formatDate(task.startDate)}</div>
                            <div>End: {formatDate(task.endDate)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openUpdateModal(task)}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              task.status === 'delayed' 
                                ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                            }`}
                            title={task.status === 'delayed' ? 'Click to mark as completed' : 'Click to update task'}
                          >
                            <i className={task.status === 'delayed' ? 'ri-check-line mr-1' : 'ri-edit-line mr-1'}></i>
                            {task.status === 'delayed' ? 'Mark Complete' : 'Update'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <i className="ri-task-line text-4xl mb-3 opacity-50"></i>
                  <p className="text-lg font-medium">No tasks found</p>
                  <p className="text-sm">You don't have any tasks assigned at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update Task Modal */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Update Task</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  {selectedTask?.status === 'delayed' ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center">
                          <i className="ri-information-line text-yellow-500 text-lg mr-2"></i>
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">
                            Delayed tasks can only be marked as completed
                          </span>
                        </div>
                      </div>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remarks</label>
                  {selectedTask?.status === 'delayed' ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center">
                          <i className="ri-information-line text-gray-500 text-lg mr-2"></i>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Remarks cannot be modified for delayed tasks
                          </span>
                        </div>
                      </div>
                      <textarea
                        value={updateForm.remarks}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        placeholder="Remarks are locked for delayed tasks"
                        disabled
                        readOnly
                      />
                    </div>
                  ) : (
                    <textarea
                      value={updateForm.remarks}
                      onChange={(e) => setUpdateForm({...updateForm, remarks: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Update task remarks..."
                    />
                  )}
                </div>
                

              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeUpdateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTask}
                  disabled={updatingTask || (selectedTask?.status === 'delayed' && updateForm.status === 'delayed')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingTask ? 'Updating...' : (selectedTask?.status === 'delayed' ? 'Mark as Completed' : 'Update Task')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamMemberDashboard
