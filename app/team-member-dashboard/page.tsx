"use client"
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Base_url } from '@/app/api/config/BaseUrl'
import { toast } from 'react-hot-toast'

interface TeamMemberData {
  id: string
  _id?: string
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
  accessibleTeamMembers?: Array<{
    _id?: string
    id?: string
    name: string
    email: string
    phone?: string
  }>
}

interface TimelineItem {
  _id?: string
  id?: string
  status?: string
  client?: {
    _id?: string
    id?: string
    name: string
    email: string
    phone: string
  }
  activity?: {
    _id?: string
    id?: string
    name: string
  }
  subactivity?: {
    _id?: string
    id?: string
    name: string
    frequency?: string
  }
  startDate?: string
  endDate?: string
  frequency?: string
}

interface Task {
  _id?: string
  id?: string
  status: string
  priority: string
  startDate: string
  endDate: string
  remarks: string
  teamMember: string | {
    _id?: string
    id?: string
    name: string
    email: string
    phone?: string
  }
  branch: {
    _id?: string
    id?: string
    name: string
    address?: string
    city?: string
    state?: string
  }
  timeline: Array<string | TimelineItem>
  attachments: Array<{
    _id?: string
    id?: string
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
  createdAt: string
  updatedAt?: string
  metadata?: any
  assignedBy?: any
  assignedByTeamMember?: {
    _id?: string
    id?: string
    name: string
    email: string
  }
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
  const isFetchingRef = useRef(false)
  
  // Task filters and pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>('all')
  const [viewAccessibleTasks, setViewAccessibleTasks] = useState(false)
  
  // Task update modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    status: '',
    remarks: ''
  })

  // View details modal
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false)
  const [viewTaskDetails, setViewTaskDetails] = useState<Task | null>(null)

  // Assign task modal state
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false)
  const [assigningTask, setAssigningTask] = useState(false)
  const [accessibleTeamMembers, setAccessibleTeamMembers] = useState<Array<{
    _id?: string
    id?: string
    name: string
    email: string
    phone?: string
  }>>([])
  const [assignTaskForm, setAssignTaskForm] = useState({
    teamMember: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    branch: '',
    remarks: '',
    status: 'pending',
    timeline: [] as string[]
  })
  const [branches, setBranches] = useState<Array<{
    _id: string
    id: string
    name: string
  }>>([])

  // Timeline selection state for assign task modal
  const [timelines, setTimelines] = useState<Array<{
    id: string
    title?: string
    activity?: {
      id: string
      name: string
    }
    subactivity?: {
      id: string
      name: string
    }
    client?: {
      id: string
      name: string
    }
    status?: string
    priority?: string
    period?: string
  }>>([])
  const [selectedTimelines, setSelectedTimelines] = useState<Array<{
    id: string
    title?: string
    activity?: {
      id: string
      name: string
    }
    subactivity?: {
      id: string
      name: string
    }
    client?: {
      id: string
      name: string
    }
    period?: string
  }>>([])
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [showEditTimelineModal, setShowEditTimelineModal] = useState(false)
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false)
  const [timelineSearchQuery, setTimelineSearchQuery] = useState("")
  const [timelineCurrentPage, setTimelineCurrentPage] = useState(1)
  const [timelineTotalPages, setTimelineTotalPages] = useState(1)
  const [timelineItemsPerPage, setTimelineItemsPerPage] = useState(10)
  const [timelineTotalResults, setTimelineTotalResults] = useState(0)
  const [activities, setActivities] = useState<Array<{
    id: string
    name: string
  }>>([])
  const [groups, setGroups] = useState<Array<{
    id: string
    name: string
    numberOfClients: number
  }>>([])
  const [selectedActivity, setSelectedActivity] = useState<string>("")
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

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
      
      // Extract accessible team members from the profile
      if (teamMember.accessibleTeamMembers && Array.isArray(teamMember.accessibleTeamMembers)) {
        const accessibleMembers: Array<{
          _id?: string
          id?: string
          name: string
          email: string
          phone?: string
        }> = teamMember.accessibleTeamMembers.map((tm: any) => ({
          _id: tm._id || tm.id,
          id: tm.id || tm._id,
          name: tm.name || '',
          email: tm.email || '',
          phone: tm.phone || ''
        }))
        setAccessibleTeamMembers(accessibleMembers)
        
        // If any members are missing name/email (just IDs), fetch full profile
        const needsFetch = accessibleMembers.some((m: { _id?: string; id?: string; name: string; email: string; phone?: string }) => !m.name || !m.email)
        if (needsFetch && token) {
          fetchAccessibleTeamMembersFromProfile(token)
        }
      } else {
        // If accessibleTeamMembers not in login data, try fetching from profile
        if (token) {
          fetchAccessibleTeamMembersFromProfile(token)
        }
      }
      
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

  // Fetch accessible team members from profile if needed
  const fetchAccessibleTeamMembersFromProfile = async (token: string) => {
    try {
      const response = await axios.get(`${Base_url}team-member-auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data && response.data.data) {
        const profile = response.data.data
        if (profile.accessibleTeamMembers && Array.isArray(profile.accessibleTeamMembers)) {
          const accessibleMembers = profile.accessibleTeamMembers.map((tm: any) => ({
            _id: tm._id || tm.id,
            id: tm.id || tm._id,
            name: tm.name || '',
            email: tm.email || '',
            phone: tm.phone || ''
          }))
          setAccessibleTeamMembers(accessibleMembers)
        }
      }
    } catch (error) {
      console.error('Error fetching accessible team members from profile:', error)
    }
  }

  // Fetch branches for task assignment
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('teamMemberToken')
        if (!token) return
        
        const response = await axios.get(`${Base_url}branches`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && response.data.results) {
          setBranches(response.data.results)
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
      }
    }
    
    if (teamMemberData && !loading) {
      fetchBranches()
      fetchActivities()
      fetchGroups()
    }
  }, [teamMemberData, loading])

  // Fetch activities
  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true)
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return
      
      const response = await axios.get(`${Base_url}activities`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data && response.data.results) {
        setActivities(response.data.results)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoadingActivities(false)
    }
  }

  // Fetch groups
  const fetchGroups = async () => {
    try {
      setIsLoadingGroups(true)
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return
      
      const response = await axios.get(`${Base_url}groups`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data && response.data.results) {
        setGroups(response.data.results)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }

  // Fetch timelines
  const fetchTimelines = async (page: number = 1, searchQueryParam?: string, forceClearFilters: boolean = false, itemsPerPage?: number) => {
    try {
      setIsLoadingTimelines(true)
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return
      
      // Get activity name if activity filter is selected
      const selectedActivityData = selectedActivity && !forceClearFilters
        ? activities.find(a => a.id === selectedActivity)
        : null
      const activityName = selectedActivityData?.name
      
      // Get group name if group filter is selected
      const selectedGroupData = selectedGroup && !forceClearFilters
        ? groups.find(g => g.id === selectedGroup)
        : null
      const groupName = selectedGroupData?.name
      
      // Use provided itemsPerPage or fall back to state value
      const limit = itemsPerPage ?? timelineItemsPerPage
      
      // Build query parameters with proper pagination
      const searchValue = forceClearFilters 
        ? (searchQueryParam !== undefined ? searchQueryParam : "")
        : (searchQueryParam !== undefined ? searchQueryParam : timelineSearchQuery)
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: activityName ? "activityName:asc" : "title:asc",
        ...(searchValue && { search: searchValue })
      })

      // Add activity filter using activityName parameter
      if (activityName && !forceClearFilters) {
        queryParams.append('activityName', activityName)
      }

      // Add group filter using group parameter
      if (groupName && !forceClearFilters) {
        queryParams.append('group', groupName)
      }

      const response = await axios.get(`${Base_url}timelines?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data) {
        setTimelines(response.data.results || [])
        setTimelineTotalResults(response.data.totalResults || 0)
        setTimelineTotalPages(response.data.totalPages || 1)
        setTimelineCurrentPage(page)
      }
    } catch (err) {
      console.error('Error fetching timelines:', err)
      toast.error('Failed to fetch timelines')
    } finally {
      setIsLoadingTimelines(false)
    }
  }

  // Refetch timelines when filters change
  useEffect(() => {
    if (showTimelineModal || showEditTimelineModal) {
      setTimelineCurrentPage(1)
      fetchTimelines(1, timelineSearchQuery)
    }
  }, [selectedActivity, selectedGroup, showTimelineModal, showEditTimelineModal])

  const fetchTasks = useCallback(async () => {
    // Don't fetch if still loading or no team member data
    if (loading || !teamMemberData) {
      console.log('Skipping fetchTasks - still loading or no team member data')
      return
    }
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Skipping fetchTasks - already fetching')
      return
    }
    
    isFetchingRef.current = true
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
      
      // Add team member filter for accessible team members tasks
      if (viewAccessibleTasks && accessibleTeamMembers.length > 0 && teamMemberFilter !== 'all') {
        params.append('teamMember', teamMemberFilter)
      }
      
      // Use accessible team members endpoint if enabled and there are accessible team members
      const apiUrl = (viewAccessibleTasks && accessibleTeamMembers.length > 0)
        ? `${Base_url}team-member-auth/tasks/accessible-team-members?${params}`
        : `${Base_url}team-member-auth/tasks?${params}`
      
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        // Handle both response formats
        let tasksList: Task[] = []
        
        // Check if response.data.data is an array (accessible-team-members format)
        if (Array.isArray(response.data.data)) {
          tasksList = response.data.data
        } else {
          // Handle nested data structure
          const taskData = response.data.data || response.data
          
          if (taskData.tasks) {
            // Own tasks format
            tasksList = taskData.tasks
          } else if (taskData.results) {
            // Accessible team members tasks format
            tasksList = taskData.results
          } else if (Array.isArray(taskData)) {
            // If taskData itself is an array
            tasksList = taskData
          }
        }
        
        // Normalize task IDs and ensure timeline is handled correctly
        const normalizedTasks = tasksList.map((task: any) => ({
          ...task,
          _id: task._id || task.id,
          id: task.id || task._id,
          timeline: task.timeline || []
        }))
        
        setTasks(normalizedTasks)
        
        // Extract pagination data - check multiple possible locations
        // Priority: response.data root level > response.data.pagination > taskData.pagination > taskData root
        const responsePage = response.data.page || response.data.pagination?.page || (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data) ? (response.data.data.pagination?.page || response.data.data.page) : undefined) || currentPage
        
        // Only update currentPage if it's actually different to prevent infinite loops
        if (responsePage !== currentPage) {
          setCurrentPage(responsePage)
        }
        
        if (response.data.totalPages !== undefined || response.data.totalResults !== undefined) {
          // Pagination at root level of response.data (for accessible-team-members endpoint)
          setTotalPages(response.data.totalPages || 1)
          setTotalResults(response.data.totalResults || 0)
        } else if (response.data.pagination) {
          // Pagination nested in response.data
          setTotalPages(response.data.pagination.totalPages || 1)
          setTotalResults(response.data.pagination.totalResults || response.data.pagination.totalTasks || 0)
        } else {
          // Check in taskData if it exists and is an object
          const taskData = response.data.data || response.data
          if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
            if (taskData.pagination) {
              // Pagination nested in data object
              setTotalPages(taskData.pagination.totalPages || 1)
              setTotalResults(taskData.pagination.totalResults || taskData.pagination.totalTasks || 0)
            } else if (taskData.totalPages !== undefined || taskData.totalResults !== undefined) {
              // Pagination at root level of taskData
              setTotalPages(taskData.totalPages || 1)
              setTotalResults(taskData.totalResults || 0)
            } else {
              // Fallback: if no pagination data, assume single page
              setTotalPages(1)
              setTotalResults(normalizedTasks.length)
            }
          } else {
            // Fallback: if no pagination data, assume single page
            setTotalPages(1)
            setTotalResults(normalizedTasks.length)
          }
        }
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
      isFetchingRef.current = false
    }
  }, [currentPage, itemsPerPage, statusFilter, priorityFilter, startDateFilter, endDateFilter, teamMemberFilter, viewAccessibleTasks, accessibleTeamMembers.length, loading, teamMemberData])

  const handleRefreshTasks = () => {
    // Reset the fetching ref to allow immediate refresh
    isFetchingRef.current = false
    // Reset all filters
    setStatusFilter('all')
    setPriorityFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setTeamMemberFilter('all')
    setCurrentPage(1)
    // Call fetchTasks after a brief delay to ensure state updates are processed
    // This ensures the refresh happens even if useEffect doesn't trigger immediately
    setTimeout(() => {
      fetchTasks()
    }, 100)
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

  const openViewDetailsModal = (task: Task) => {
    setViewTaskDetails(task)
    setShowViewDetailsModal(true)
  }

  const closeViewDetailsModal = () => {
    setShowViewDetailsModal(false)
    setViewTaskDetails(null)
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
      // Team members can only update status, not remarks
      const updateData: any = {
        status: updateForm.status,
      }
      
      const taskId = selectedTask._id || selectedTask.id
      const response = await axios.patch(`${Base_url}team-member-auth/tasks/${taskId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        toast.success(selectedTask.status === 'delayed' ? 'Task marked as completed!' : 'Task status updated successfully!', {
          duration: 3000,
          position: 'top-right'
        })
        closeUpdateModal()
        fetchTasks() // Refresh tasks
      }
    } catch (error: any) {
      console.error('Error updating task:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update task'
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right'
      })
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

  // Helper function to get team member name from task
  const getTeamMemberName = (task: Task): string => {
    if (!task.teamMember) return 'N/A'
    if (typeof task.teamMember === 'string') {
      // If it's just an ID, try to find the name from accessibleTeamMembers
      const member = accessibleTeamMembers.find(m => (m._id || m.id) === task.teamMember)
      return member?.name || task.teamMember
    }
    // If it's an object, return the name
    return task.teamMember.name || 'N/A'
  }

  // Helper function to get assigned by name from task
  const getAssignedByName = (task: Task): string => {
    // Check assignedByTeamMember first
    if (task.assignedByTeamMember) {
      return task.assignedByTeamMember.name || task.assignedByTeamMember.email || 'Admin'
    }
    
    // Fallback to assignedBy
    if (!task.assignedBy) return 'Admin'
    if (typeof task.assignedBy === 'string') {
      // If it's just an ID, try to find the name from accessibleTeamMembers
      const member = accessibleTeamMembers.find(m => (m._id || m.id) === task.assignedBy)
      return member?.name || task.assignedBy
    }
    // If it's an object, return the name
    if (task.assignedBy && typeof task.assignedBy === 'object') {
      return task.assignedBy.name || task.assignedBy.email || 'Admin'
    }
    return 'Admin'
  }

  // Helper function to get assigned by email from task
  const getAssignedByEmail = (task: Task): string | null => {
    // Check assignedByTeamMember first
    if (task.assignedByTeamMember) {
      return task.assignedByTeamMember.email || null
    }
    
    // Fallback to assignedBy
    if (task.assignedBy && typeof task.assignedBy === 'object') {
      return task.assignedBy.email || null
    }
    return null
  }

  // Helper function to check if task has assigned by info
  // Always return true since we show "Admin" as default
  const hasAssignedBy = (task: Task): boolean => {
    return true // Always show assigned by, defaulting to "Admin" if no data
  }

  // Edit task modal state
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editTaskForm, setEditTaskForm] = useState({
    teamMember: '',
    branch: '',
    remarks: '',
    priority: 'medium',
    status: 'pending',
    startDate: '',
    endDate: '',
    timeline: [] as string[]
  })
  const [editSelectedTimelines, setEditSelectedTimelines] = useState<Array<{
    id: string
    title?: string
    activity?: {
      id: string
      name: string
    }
    subactivity?: {
      id: string
      name: string
    }
    client?: {
      id: string
      name: string
    }
    period?: string
  }>>([])

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task)
    // Get team member ID from task (could be string or object)
    let teamMemberId = ''
    if (typeof task.teamMember === 'string') {
      teamMemberId = task.teamMember
    } else if (task.teamMember && typeof task.teamMember === 'object') {
      teamMemberId = task.teamMember._id || task.teamMember.id || ''
    }
    
    // Get branch ID
    const branchId = task.branch?._id || task.branch?.id || ''
    
    // Get timeline IDs - handle both string IDs and populated objects
    let timelineIds: string[] = []
    let timelineObjects: Array<{
      id: string
      title?: string
      activity?: {
        id: string
        name: string
      }
      subactivity?: {
        id: string
        name: string
      }
      client?: {
        id: string
        name: string
      }
      period?: string
    }> = []
    
    if (task.timeline && Array.isArray(task.timeline)) {
      task.timeline.forEach((timeline) => {
        if (typeof timeline === 'string') {
          timelineIds.push(timeline)
        } else if (timeline && typeof timeline === 'object') {
          const timelineId = timeline._id || timeline.id || ''
          if (timelineId) {
            timelineIds.push(timelineId)
            timelineObjects.push({
              id: timelineId,
              title: timeline.title,
              activity: timeline.activity ? {
                id: timeline.activity._id || timeline.activity.id || '',
                name: timeline.activity.name || ''
              } : undefined,
              subactivity: timeline.subactivity ? {
                id: timeline.subactivity._id || timeline.subactivity.id || '',
                name: timeline.subactivity.name || ''
              } : undefined,
              client: timeline.client ? {
                id: timeline.client._id || timeline.client.id || '',
                name: timeline.client.name || ''
              } : undefined,
              period: timeline.period || undefined
            })
          }
        }
      })
    }
    
    setEditTaskForm({
      teamMember: teamMemberId,
      branch: branchId,
      remarks: task.remarks || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      timeline: timelineIds
    })
    setEditSelectedTimelines(timelineObjects)
    setShowEditTaskModal(true)
  }

  const closeEditTaskModal = () => {
    setShowEditTaskModal(false)
    setEditingTask(null)
    setEditTaskForm({
      teamMember: '',
      branch: '',
      remarks: '',
      priority: 'medium',
      status: 'pending',
      startDate: '',
      endDate: '',
      timeline: []
    })
    setEditSelectedTimelines([])
  }

  const handleEditTask = async () => {
    if (!editingTask) return

    if (!editTaskForm.teamMember) {
      toast.error('Please select a team member', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }

    if (!editTaskForm.branch) {
      toast.error('Please select a branch', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }

    if (!editTaskForm.startDate || !editTaskForm.endDate) {
      toast.error('Start date and end date are required', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }

    if (new Date(editTaskForm.startDate) > new Date(editTaskForm.endDate)) {
      toast.error('End date must be after start date', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }

    setIsSavingEdit(true)
    try {
      const token = localStorage.getItem('teamMemberToken')
      const taskId = editingTask._id || editingTask.id
      
      const updateData = {
        teamMember: editTaskForm.teamMember,
        branch: editTaskForm.branch,
        remarks: editTaskForm.remarks || '',
        priority: editTaskForm.priority,
        status: editTaskForm.status,
        startDate: new Date(editTaskForm.startDate).toISOString(),
        endDate: new Date(editTaskForm.endDate).toISOString(),
        timeline: editTaskForm.timeline || []
      }

      const response = await axios.patch(
        `${Base_url}team-member-auth/tasks/accessible/${taskId}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        toast.success('Task updated successfully!', {
          duration: 3000,
          position: 'top-right'
        })
        closeEditTaskModal()
        fetchTasks()
      }
    } catch (error: any) {
      console.error('Error editing task:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update task'
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right'
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Timeline selection handlers for edit modal
  const handleEditTimelineSelect = (timeline: typeof timelines[0]) => {
    setEditSelectedTimelines(prev => {
      const isSelected = prev.some(t => t.id === timeline.id)
      if (isSelected) {
        return prev.filter(t => t.id !== timeline.id)
      } else {
        return [...prev, timeline]
      }
    })
  }

  const handleEditTimelineModalSubmit = () => {
    setEditTaskForm(prev => ({
      ...prev,
      timeline: editSelectedTimelines.map(timeline => timeline.id)
    }))
    setShowEditTimelineModal(false)
  }

  const openAssignTaskModal = () => {
    // Set default branch from team member's branch if available
    if (teamMemberData?.branch?.id) {
      setAssignTaskForm(prev => ({
        ...prev,
        branch: teamMemberData.branch!.id
      }))
    }
    setShowAssignTaskModal(true)
  }

  const closeAssignTaskModal = () => {
    setShowAssignTaskModal(false)
    setAssignTaskForm({
      teamMember: '',
      startDate: '',
      endDate: '',
      priority: 'medium',
      branch: teamMemberData?.branch?.id || '',
      remarks: '',
      status: 'pending',
      timeline: []
    })
    setSelectedTimelines([])
    setTimelineSearchQuery("")
    setSelectedActivity("")
    setSelectedGroup("")
    setTimelineCurrentPage(1)
  }

  // Timeline selection handlers
  const handleTimelineSelect = (timeline: typeof timelines[0]) => {
    setSelectedTimelines(prev => {
      const isSelected = prev.some(t => t.id === timeline.id)
      if (isSelected) {
        return prev.filter(t => t.id !== timeline.id)
      } else {
        return [...prev, timeline]
      }
    })
  }

  const handleTimelineModalSubmit = () => {
    setAssignTaskForm(prev => ({
      ...prev,
      timeline: selectedTimelines.map(timeline => timeline.id)
    }))
    setShowTimelineModal(false)
  }

  const handleTimelineSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setTimelineSearchQuery(query)
    if (showTimelineModal) {
      debouncedTimelineSearch(query)
    }
  }

  const handleTimelineSearchClick = () => {
    if (showTimelineModal) {
      setTimelineCurrentPage(1)
      fetchTimelines(1, timelineSearchQuery)
    }
  }

  const handleTimelinePageChange = (newPage: number) => {
    setTimelineCurrentPage(newPage)
    fetchTimelines(newPage, timelineSearchQuery)
  }

  // Debounced search function for timelines
  const debouncedTimelineSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (searchQuery: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setTimelineCurrentPage(1)
          fetchTimelines(1, searchQuery)
        }, 500)
      }
    })(),
    []
  )

  // Filter change handlers
  const handleActivityFilterChange = (activityId: string) => {
    setSelectedActivity(activityId)
  }

  const handleGroupFilterChange = (groupId: string) => {
    setSelectedGroup(groupId)
  }

  const clearTimelineFilters = () => {
    setSelectedActivity("")
    setSelectedGroup("")
    setTimelineSearchQuery("")
    setTimelineCurrentPage(1)
    fetchTimelines(1, "", true)
  }

  const handleAssignTask = async () => {
    if (!assignTaskForm.teamMember) {
      toast.error('Please select a team member', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }
    if (!assignTaskForm.startDate) {
      toast.error('Please select a start date', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }
    if (!assignTaskForm.endDate) {
      toast.error('Please select an end date', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }
    if (!assignTaskForm.branch) {
      toast.error('Please select a branch', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }
    if (new Date(assignTaskForm.startDate) > new Date(assignTaskForm.endDate)) {
      toast.error('End date must be after start date', {
        duration: 3000,
        position: 'top-right'
      })
      return
    }

    setAssigningTask(true)
    try {
      const token = localStorage.getItem('teamMemberToken')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      const taskData = {
        teamMember: assignTaskForm.teamMember,
        startDate: new Date(assignTaskForm.startDate).toISOString(),
        endDate: new Date(assignTaskForm.endDate).toISOString(),
        priority: assignTaskForm.priority,
        branch: assignTaskForm.branch,
        remarks: assignTaskForm.remarks || '',
        status: assignTaskForm.status,
        timeline: assignTaskForm.timeline || [],
        metadata: {},
        attachments: []
      }

      const response = await axios.post(
        `${Base_url}team-member-auth/tasks/assign`,
        taskData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data && response.data.success) {
        toast.success('Task assigned successfully!', {
          duration: 3000,
          position: 'top-right'
        })
        closeAssignTaskModal()
        // Refresh tasks to show the newly assigned task
        // Reset the fetching ref to allow immediate refresh
        isFetchingRef.current = false
        // Refresh tasks - if viewing accessible team members' tasks, show new task
        // If viewing own tasks, also refresh in case the assigned task is for current user
        fetchTasks()
      } else {
        toast.error(response.data?.message || 'Failed to assign task', {
          duration: 3000,
          position: 'top-right'
        })
      }
    } catch (error: any) {
      console.error('Error assigning task:', error)
      const errorMessage = error.response?.data?.message || 'Failed to assign task'
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right'
      })
    } finally {
      setAssigningTask(false)
    }
  }

  // Ensure viewAccessibleTasks is false when there are no accessible team members
  useEffect(() => {
    if (accessibleTeamMembers.length === 0) {
      setViewAccessibleTasks(false)
      setTeamMemberFilter('all')
    }
  }, [accessibleTeamMembers.length])

  // Reset team member filter when switching to "My Tasks" view
  useEffect(() => {
    if (!viewAccessibleTasks) {
      setTeamMemberFilter('all')
    }
  }, [viewAccessibleTasks])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (teamMemberData && !loading) {
      setCurrentPage(1)
    }
  }, [statusFilter, priorityFilter, startDateFilter, endDateFilter, teamMemberFilter, viewAccessibleTasks, teamMemberData, loading])

  // Refresh tasks when filters or pagination change
  useEffect(() => {
    if (teamMemberData && !loading) {
      fetchTasks()
    }
  }, [fetchTasks, teamMemberData, loading])

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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {accessibleTeamMembers.length > 0 && viewAccessibleTasks ? 'Accessible Team Members\' Tasks' : 'My Tasks'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {totalResults > 0 ? `${totalResults} task(s) found` : tasks.length > 0 ? `${tasks.length} task(s) found` : 'No tasks available'}
                </p>
              </div>
              <div className="flex gap-2">
                {accessibleTeamMembers.length > 0 && (
                  <>
                    <button
                      onClick={openAssignTaskModal}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Assign Task
                    </button>
                    <button
                      onClick={() => setViewAccessibleTasks(!viewAccessibleTasks)}
                      className={`px-4 py-2 rounded-md transition-colors text-sm ${
                        viewAccessibleTasks
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <i className={`ri-${viewAccessibleTasks ? 'user-line' : 'team-line'} mr-1`}></i>
                      {viewAccessibleTasks ? 'My Tasks' : 'View All Accessible'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleRefreshTasks}
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
            <div className={`mb-6 grid grid-cols-1 sm:grid-cols-2 ${viewAccessibleTasks && accessibleTeamMembers.length > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
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

              {/* Team Member Filter - Only show when viewing accessible tasks */}
              {viewAccessibleTasks && accessibleTeamMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Member</label>
                  <select
                    value={teamMemberFilter}
                    onChange={(e) => setTeamMemberFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Team Members</option>
                    {accessibleTeamMembers.map((member) => (
                      <option key={member._id || member.id} value={member._id || member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                      <tr key={task._id || task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{task.remarks}</div>
                          {viewAccessibleTasks && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              <i className="ri-user-line mr-1"></i>
                              Assigned to: <span className="font-medium">{getTeamMemberName(task)}</span>
                            </div>
                          )}
                          {hasAssignedBy(task) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              <i className="ri-user-add-line mr-1"></i>
                              Assigned by: <span className="font-medium">{getAssignedByName(task)}</span>
                            </div>
                          )}
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
                              {task.timeline.slice(0, 3).map((timeline, index) => {
                                // Check if timeline is an ID (string) or populated object
                                const isPopulated = typeof timeline === 'object' && timeline !== null && 'client' in timeline
                                const timelineId = typeof timeline === 'string' ? timeline : (timeline._id || timeline.id || `timeline-${index}`)
                                
                                if (!isPopulated) {
                                  return (
                                    <div key={timelineId} className="border-l-2 border-gray-200 pl-2">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        Timeline ID: {timelineId.substring(0, 8)}...
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Click "View" to see details
                                      </div>
                                    </div>
                                  )
                                }
                                
                                return (
                                  <div key={timelineId} className="border-l-2 border-gray-200 pl-2">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {timeline.client?.name || 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {timeline.activity?.name || 'N/A'}
                                      {timeline.subactivity?.name && ` • ${timeline.subactivity.name}`}
                                      {timeline.frequency && ` • ${timeline.frequency}`}
                                    </div>
                                    {timeline.status && (
                                      <div className="text-xs text-gray-400 dark:text-gray-500">
                                        {timeline.status}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              {task.timeline.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  +{task.timeline.length - 3} more timeline{task.timeline.length - 3 !== 1 ? 's' : ''}
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
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => openViewDetailsModal(task)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                              title="View task details"
                            >
                              <i className="ri-eye-line mr-1"></i>
                              View
                            </button>
                            {viewAccessibleTasks && (
                              <button
                                onClick={() => openEditTaskModal(task)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                title="Edit task"
                              >
                                <i className="ri-edit-2-line mr-1"></i>
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => openUpdateModal(task)}
                              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                task.status === 'delayed' 
                                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
                                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                              }`}
                              title={task.status === 'delayed' ? 'Click to mark as completed' : 'Click to update task status'}
                            >
                              <i className={task.status === 'delayed' ? 'ri-check-line mr-1' : 'ri-edit-line mr-1'}></i>
                              {task.status === 'delayed' ? 'Mark Complete' : 'Update Status'}
                            </button>
                          </div>
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

            {/* Pagination Controls */}
            {tasks.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <label className="mr-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Rows per page:</label>
                    <select
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={itemsPerPage}
                      onChange={(e) => {
                        const newItemsPerPage = Number(e.target.value)
                        setItemsPerPage(newItemsPerPage)
                        setCurrentPage(1)
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1 || tasksLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {totalResults > 0 ? (
                      `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalResults)} of ${totalResults} entries`
                    ) : (
                      "No results"
                    )}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0 || tasksLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Task Modal */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Update Task Status</h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              {/* Task Details (Read-Only) */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Task Details (View Only)</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {viewAccessibleTasks && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        <i className="ri-user-line mr-1"></i>
                        {getTeamMemberName(selectedTask)}
                      </p>
                    </div>
                  )}
                  {hasAssignedBy(selectedTask) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned By</label>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        <i className="ri-user-add-line mr-1"></i>
                        {getAssignedByName(selectedTask)}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Remarks</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedTask.remarks || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedTask.startDate)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedTask.endDate)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedTask.branch?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Clients & Timeline (Read-Only) */}
                {selectedTask.timeline && selectedTask.timeline.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Clients & Timeline</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedTask.timeline.map((timeline, index) => {
                        const isPopulated = typeof timeline === 'object' && timeline !== null && 'client' in timeline
                        const timelineId = typeof timeline === 'string' ? timeline : (timeline._id || timeline.id || `timeline-${index}`)
                        
                        if (!isPopulated) {
                          return (
                            <div key={timelineId} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Timeline ID: {timelineId}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Timeline details not loaded. Please contact administrator for more information.
                              </div>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={timelineId} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{timeline.client?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {timeline.client?.email && <div>Email: {timeline.client.email}</div>}
                              {timeline.client?.phone && <div>Phone: {timeline.client.phone}</div>}
                              {timeline.activity?.name && <div>Activity: {timeline.activity.name}</div>}
                              {timeline.subactivity?.name && <div>Subactivity: {timeline.subactivity.name}</div>}
                              {timeline.frequency && <div>Frequency: {timeline.frequency}</div>}
                              {timeline.status && <div>Status: {timeline.status}</div>}
                              {timeline.startDate && timeline.endDate && (
                                <div>Timeline: {formatDate(timeline.startDate)} - {formatDate(timeline.endDate)}</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Update Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update Status <span className="text-red-500">*</span></label>
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

      {/* View Task Details Modal */}
      {showViewDetailsModal && viewTaskDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Task Details (View Only)</h3>
                <button
                  onClick={closeViewDetailsModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Task Information */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Task Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewAccessibleTasks && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          <i className="ri-user-line mr-1"></i>
                          {getTeamMemberName(viewTaskDetails)}
                        </p>
                      </div>
                    )}
                    {hasAssignedBy(viewTaskDetails) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned By</label>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          <i className="ri-user-add-line mr-1"></i>
                          {getAssignedByName(viewTaskDetails)}
                          {getAssignedByEmail(viewTaskDetails) && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                              {getAssignedByEmail(viewTaskDetails)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Remarks</label>
                      <p className="text-sm text-gray-900 dark:text-white">{viewTaskDetails.remarks || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewTaskDetails.status)}`}>
                        {viewTaskDetails.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(viewTaskDetails.priority)}`}>
                        {viewTaskDetails.priority}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {viewTaskDetails.branch?.name || 'N/A'}
                        {viewTaskDetails.branch?.address && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            {viewTaskDetails.branch.address}, {viewTaskDetails.branch.city}, {viewTaskDetails.branch.state}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                      <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewTaskDetails.startDate)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                      <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewTaskDetails.endDate)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</label>
                      <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewTaskDetails.createdAt)}</p>
                    </div>
                    {viewTaskDetails.updatedAt && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</label>
                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewTaskDetails.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clients & Timeline Details */}
                {viewTaskDetails.timeline && viewTaskDetails.timeline.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Clients & Timeline Details</h4>
                    <div className="space-y-4">
                      {viewTaskDetails.timeline.map((timeline, index) => {
                        const isPopulated = typeof timeline === 'object' && timeline !== null && 'client' in timeline
                        const timelineId = typeof timeline === 'string' ? timeline : (timeline._id || timeline.id || `timeline-${index}`)
                        
                        if (!isPopulated) {
                          return (
                            <div key={timelineId} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                    Timeline ID: {timelineId}
                                  </h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Timeline details are not loaded. Please contact administrator for more information.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={timelineId} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  {timeline.client?.name || 'N/A'}
                                </h5>
                                {timeline.client && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    {timeline.client.email && (
                                      <div className="flex items-center">
                                        <i className="ri-mail-line mr-1"></i>
                                        {timeline.client.email}
                                      </div>
                                    )}
                                    {timeline.client.phone && (
                                      <div className="flex items-center">
                                        <i className="ri-phone-line mr-1"></i>
                                        {timeline.client.phone}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {timeline.status && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timeline.status)}`}>
                                  {timeline.status}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              {timeline.activity?.name && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Activity</label>
                                  <p className="text-sm text-gray-900 dark:text-white">{timeline.activity.name}</p>
                                </div>
                              )}
                              {timeline.subactivity?.name && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subactivity</label>
                                  <p className="text-sm text-gray-900 dark:text-white">{timeline.subactivity.name}</p>
                                </div>
                              )}
                              {timeline.frequency && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Frequency</label>
                                  <p className="text-sm text-gray-900 dark:text-white">{timeline.frequency}</p>
                                </div>
                              )}
                              {timeline.startDate && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeline Start</label>
                                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(timeline.startDate)}</p>
                                </div>
                              )}
                              {timeline.endDate && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeline End</label>
                                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(timeline.endDate)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {viewTaskDetails.attachments && viewTaskDetails.attachments.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Attachments</h4>
                    <div className="space-y-2">
                      {viewTaskDetails.attachments.map((attachment) => (
                        <div key={attachment._id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center">
                            <i className="ri-file-line text-gray-400 mr-2"></i>
                            <span className="text-sm text-gray-900 dark:text-white">{attachment.fileName}</span>
                          </div>
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          >
                            <i className="ri-download-line mr-1"></i>
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {viewTaskDetails.metadata && Object.keys(viewTaskDetails.metadata).length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Additional Information</h4>
                    <div className="space-y-2">
                      {Object.entries(viewTaskDetails.metadata).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-32">{key}:</span>
                          <span className="text-sm text-gray-900 dark:text-white flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeViewDetailsModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Close
                </button>
                {viewAccessibleTasks && (
                  <button
                    onClick={() => {
                      closeViewDetailsModal()
                      openEditTaskModal(viewTaskDetails)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    <i className="ri-edit-2-line mr-1"></i>
                    Edit Task
                  </button>
                )}
                <button
                  onClick={() => {
                    closeViewDetailsModal()
                    openUpdateModal(viewTaskDetails)
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    viewTaskDetails.status === 'delayed' 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <i className={`ri-${viewTaskDetails.status === 'delayed' ? 'check-line' : 'edit-line'} mr-1`}></i>
                  {viewTaskDetails.status === 'delayed' ? 'Mark Complete' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Task</h3>
                <button
                  onClick={closeEditTaskModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTaskForm.teamMember}
                    onChange={(e) => setEditTaskForm({...editTaskForm, teamMember: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a team member</option>
                    {accessibleTeamMembers.map((member) => (
                      <option key={member._id || member.id} value={member._id || member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editTaskForm.startDate}
                    onChange={(e) => setEditTaskForm({...editTaskForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editTaskForm.endDate}
                    onChange={(e) => setEditTaskForm({...editTaskForm, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={editTaskForm.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTaskForm.priority}
                    onChange={(e) => setEditTaskForm({...editTaskForm, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTaskForm.branch}
                    onChange={(e) => setEditTaskForm({...editTaskForm, branch: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch._id || branch.id} value={branch._id || branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Timelines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Related Timelines
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditTimelineModal(true)
                        setTimelineSearchQuery("")
                        setTimelineCurrentPage(1)
                        setSelectedActivity("")
                        setSelectedGroup("")
                        setTimelineItemsPerPage(10)
                        fetchTimelines(1, "", true)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Select Timelines ({editSelectedTimelines.length} selected)
                    </button>
                    {editSelectedTimelines.length > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {editSelectedTimelines.length} timeline{editSelectedTimelines.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {editSelectedTimelines.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editSelectedTimelines.map(timeline => (
                        <span key={timeline.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          {timeline.title || `${timeline.activity?.name || 'Unknown Activity'}${timeline.subactivity?.name ? ` - ${timeline.subactivity.name}` : ''} - ${timeline.client?.name || 'Unknown Client'}${timeline.period ? ` (${timeline.period})` : ''}`}
                          <button
                            type="button"
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => {
                              setEditSelectedTimelines(prev => prev.filter(t => t.id !== timeline.id))
                              setEditTaskForm(prev => ({
                                ...prev,
                                timeline: prev.timeline.filter(id => id !== timeline.id)
                              }))
                            }}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={editTaskForm.remarks}
                    onChange={(e) => setEditTaskForm({...editTaskForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter task remarks..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editTaskForm.status}
                    onChange={(e) => setEditTaskForm({...editTaskForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeEditTaskModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTask}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line mr-1"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Assign Task to Team Member</h3>
                <button
                  onClick={closeAssignTaskModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Team Member Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.teamMember}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, teamMember: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a team member</option>
                    {accessibleTeamMembers.map((member) => (
                      <option key={member._id || member.id} value={member._id || member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignTaskForm.startDate}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignTaskForm.endDate}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={assignTaskForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.priority}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.branch}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, branch: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch._id || branch.id} value={branch._id || branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Timelines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Related Timelines
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimelineModal(true)
                        setTimelineSearchQuery("")
                        setTimelineCurrentPage(1)
                        setSelectedActivity("")
                        setSelectedGroup("")
                        setTimelineItemsPerPage(10)
                        fetchTimelines(1, "", true)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Select Timelines ({selectedTimelines.length} selected)
                    </button>
                    {selectedTimelines.length > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedTimelines.length} timeline{selectedTimelines.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {selectedTimelines.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTimelines.map(timeline => (
                        <span key={timeline.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          {timeline.title || `${timeline.activity?.name || 'Unknown Activity'}${timeline.subactivity?.name ? ` - ${timeline.subactivity.name}` : ''} - ${timeline.client?.name || 'Unknown Client'}${timeline.period ? ` (${timeline.period})` : ''}`}
                          <button
                            type="button"
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => {
                              setSelectedTimelines(prev => prev.filter(t => t.id !== timeline.id))
                              setAssignTaskForm(prev => ({
                                ...prev,
                                timeline: prev.timeline.filter(id => id !== timeline.id)
                              }))
                            }}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={assignTaskForm.remarks}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, remarks: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task remarks..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={assignTaskForm.status}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeAssignTaskModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTask}
                  disabled={assigningTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {assigningTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Selection Modal - Shared for Assign and Edit */}
      {(showTimelineModal || showEditTimelineModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Timelines</h2>
              <button
                onClick={() => {
                  setShowTimelineModal(false)
                  setShowEditTimelineModal(false)
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {/* Activity Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Activity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Activity
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedActivity}
                    onChange={(e) => handleActivityFilterChange(e.target.value)}
                  >
                    <option value="">All Activities</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearTimelineFilters}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                    disabled={!selectedActivity && !timelineSearchQuery}
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <div className="flex items-center">
                    <i className="ri-search-line text-gray-400 text-xl mr-3"></i>
                    <input
                      type="text"
                      placeholder="Search timelines by title, activity, or client..."
                      className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={timelineSearchQuery}
                      onChange={handleTimelineSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTimelineSearchClick()
                        }
                      }}
                    />
                  </div>
                  <button 
                    className="absolute end-0 top-0 px-6 h-full bg-blue-600 text-white hover:bg-blue-700 rounded-r-md"
                    onClick={handleTimelineSearchClick}
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {/* Active Filters Summary */}
              {selectedActivity && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Active Filters:</span>
                      {selectedActivity && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          Activity: {activities.find(a => a.id === selectedActivity)?.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={clearTimelineFilters}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      <i className="ri-close-line mr-1"></i>
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {isLoadingTimelines ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Sub Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {timelines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                                <i className="ri-search-line text-2xl text-gray-400"></i>
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No timelines found
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                                {selectedActivity 
                                  ? "Try adjusting your filters or search criteria."
                                  : "No timelines available at the moment."
                                }
                              </p>
                              {selectedActivity && (
                                <button
                                  onClick={clearTimelineFilters}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                  <i className="ri-refresh-line mr-2"></i>
                                  Clear Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        timelines.map((timeline) => (
                          <tr key={timeline.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                checked={
                                  showEditTimelineModal
                                    ? editSelectedTimelines.some(t => t.id === timeline.id)
                                    : selectedTimelines.some(t => t.id === timeline.id)
                                }
                                onChange={() => {
                                  if (showEditTimelineModal) {
                                    handleEditTimelineSelect(timeline)
                                  } else {
                                    handleTimelineSelect(timeline)
                                  }
                                }}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{timeline.activity?.name || 'Unknown Activity'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{timeline.subactivity?.name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{timeline.client?.name || 'Unknown Client'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{timeline.period || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                timeline.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                timeline.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                timeline.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                              }`}>
                                {timeline.status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                timeline.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                                timeline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              }`}>
                                {timeline.priority || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="flex items-center mr-4">
                  <label className="mr-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Rows per page:</label>
                  <select
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={timelineItemsPerPage}
                    onChange={(e) => {
                      const newItemsPerPage = Number(e.target.value)
                      setTimelineItemsPerPage(newItemsPerPage)
                      setTimelineCurrentPage(1)
                      fetchTimelines(1, timelineSearchQuery, false, newItemsPerPage)
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <button
                  onClick={() => handleTimelinePageChange(Math.max(timelineCurrentPage - 1, 1))}
                  disabled={timelineCurrentPage === 1 || timelines.length === 0}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {timelineTotalResults > 0 ? (
                    `Showing ${(timelineCurrentPage - 1) * timelineItemsPerPage + 1} to ${Math.min(timelineCurrentPage * timelineItemsPerPage, timelineTotalResults)} of ${timelineTotalResults} entries`
                  ) : (
                    "No results"
                  )}
                </span>
                <button
                  onClick={() => handleTimelinePageChange(Math.min(timelineCurrentPage + 1, timelineTotalPages))}
                  disabled={timelineCurrentPage === timelineTotalPages || timelineTotalPages === 0 || timelines.length === 0}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowTimelineModal(false)
                    setShowEditTimelineModal(false)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showEditTimelineModal) {
                      handleEditTimelineModalSubmit()
                    } else {
                      handleTimelineModalSubmit()
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Select ({
                    showEditTimelineModal
                      ? editSelectedTimelines.length
                      : selectedTimelines.length
                  })
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
