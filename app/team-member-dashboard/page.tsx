"use client"
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Base_url } from '@/app/api/config/BaseUrl'
import { getClientIdDisplay } from '@/app/(components)/(contentlayout)/timelines/utils/timelineClientId'
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
  title?: string
  status?: string
  period?: string
  referenceNumber?: string
  completedAt?: string | null
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

type TimelineUpdatePayload = {
  timelineId: string
  status?: string
  referenceNumber?: string
  completedAt?: string | null // allow null to clear
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
  const [sortBy, setSortBy] = useState<string>('createdAt:desc')
  
  // Task update modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    status: '',
    remarks: '',
    completedAt: '',
    referenceNumber: ''
  })
  const [timelineDetails, setTimelineDetails] = useState<any[]>([])
  const [isLoadingTimelineDetails, setIsLoadingTimelineDetails] = useState(false)
  const [timelineUpdatesMap, setTimelineUpdatesMap] = useState<Record<string, TimelineUpdatePayload>>({})
  const [selectedTimelineIds, setSelectedTimelineIds] = useState<Record<string, boolean>>({})

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
    timeline: [] as string[],
    completedAt: '',
    referenceNumber: ''
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
    subactivities?: Array<{
      _id: string
      id: string
      name: string
      frequency?: string
    }>
  }>>([])
  const [groups, setGroups] = useState<Array<{
    id: string
    name: string
    numberOfClients: number
  }>>([])
  const [selectedActivity, setSelectedActivity] = useState<string>("")
  const [selectedSubActivity, setSelectedSubActivity] = useState<string>("")
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  // Timeline filters for Assign/Edit timeline drawer – align with Timelines/Add Task
  const [timelineFilters, setTimelineFilters] = useState({
    activity: "",
    subActivity: "",
    frequency: "",
    period: "",
    status: "",
    client: ""
  })
  const [availablePeriods, setAvailablePeriods] = useState<Array<{
    period: string
    quarter?: string
    months: string[]
    startDate: string
    endDate: string
    displayName: string
    financialYear: string
  }>>([])
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false)
  const [timelineClients, setTimelineClients] = useState<Array<{
    id: string
    name: string
  }>>([])
  const [timelineClientSearchTerm, setTimelineClientSearchTerm] = useState("")

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
      
      const response = await axios.get(`${Base_url}activities?limit=1000`, {
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

  // Fetch clients for timeline filters (Assign/Edit drawers)
  const fetchTimelineClients = async (searchQuery?: string) => {
    try {
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return

      const params = new URLSearchParams({
        limit: '20',
      })
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await axios.get(`${Base_url}clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data && response.data.results) {
        setTimelineClients(response.data.results.map((c: any) => ({
          id: c._id || c.id,
          name: c.name || ''
        })))
      }
    } catch (error) {
      console.error('Error fetching timeline clients:', error)
    }
  }

  useEffect(() => {
    fetchTimelineClients()
  }, [])

  // Fetch frequency periods for timeline filters
  const fetchTimelineFrequencyPeriods = async (frequency: string) => {
    if (!frequency) {
      setAvailablePeriods([])
      return
    }

    try {
      setIsLoadingPeriods(true)
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return

      const response = await axios.get(`${Base_url}timelines/frequency-periods?frequency=${frequency}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data && response.data.periods) {
        setAvailablePeriods(response.data.periods)
      } else {
        setAvailablePeriods([])
      }
    } catch (error) {
      console.error('Error fetching timeline frequency periods:', error)
      setAvailablePeriods([])
    } finally {
      setIsLoadingPeriods(false)
    }
  }

  // Fetch timelines (Assign/Edit drawer) – use unified filters
  const fetchTimelines = async (page: number = 1, searchQueryParam?: string, forceClearFilters: boolean = false, itemsPerPageOverride?: number) => {
    try {
      setIsLoadingTimelines(true)
      const token = localStorage.getItem('teamMemberToken')
      if (!token) return
      
      // Use provided itemsPerPage or fall back to state value
      const limit = itemsPerPageOverride ?? timelineItemsPerPage

      const searchValue = forceClearFilters
        ? (searchQueryParam !== undefined ? searchQueryParam : '')
        : (searchQueryParam !== undefined ? searchQueryParam : timelineSearchQuery)

      // When forceClearFilters is true, do not use timelineFilters (state may not have updated yet)
      const useFilters = !forceClearFilters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: "activityName:asc",
        ...(searchValue && { search: searchValue }),
        ...(useFilters && timelineFilters.activity && { activity: timelineFilters.activity }),
        ...(useFilters && timelineFilters.subActivity && { subactivity: timelineFilters.subActivity }),
        ...(useFilters && timelineFilters.frequency && { frequency: timelineFilters.frequency }),
        ...(useFilters && timelineFilters.period && { period: timelineFilters.period }),
        ...(useFilters && timelineFilters.status && { status: timelineFilters.status }),
        ...(useFilters && timelineFilters.client && { client: timelineFilters.client })
      })

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

  // Refetch timelines when filters change in Assign/Edit drawer
  useEffect(() => {
    if (showTimelineModal || showEditTimelineModal) {
      setTimelineCurrentPage(1)
      fetchTimelines(1)
    }
  }, [
    showTimelineModal,
    showEditTimelineModal,
    timelineFilters.activity,
    timelineFilters.subActivity,
    timelineFilters.frequency,
    timelineFilters.period,
    timelineFilters.status,
    timelineFilters.client
  ])

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
      
      // Add sortBy parameter
      if (sortBy) params.append('sortBy', sortBy)
      
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
  }, [currentPage, itemsPerPage, statusFilter, priorityFilter, startDateFilter, endDateFilter, teamMemberFilter, viewAccessibleTasks, accessibleTeamMembers.length, loading, teamMemberData, sortBy])

  const handleRefreshTasks = () => {
    // Reset the fetching ref to allow immediate refresh
    isFetchingRef.current = false
    // Reset all filters
    setStatusFilter('all')
    setPriorityFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setTeamMemberFilter('all')
    setSortBy('createdAt:desc')
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
      localStorage.clear()
      sessionStorage.clear()
      // Clear cookies accessible to JS (httpOnly cookies must be cleared by server)
      if (typeof document !== 'undefined' && document.cookie) {
        document.cookie.split(';').forEach((c) => {
          const name = c.trim().split('=')[0]
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })
      }
      router.push('/team-member-login')
    }
  }

  const openUpdateModal = (task: Task) => {
    setSelectedTask(task)
    
    setUpdateForm({
      status: task.status,
      remarks: task.remarks,
      completedAt: '',
      referenceNumber: ''
    })

    // Reset timeline editor state
    setTimelineDetails([])
    setTimelineUpdatesMap({})
    setSelectedTimelineIds({})
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
      remarks: '',
      completedAt: '',
      referenceNumber: ''
    })
    setTimelineDetails([])
    setTimelineUpdatesMap({})
    setSelectedTimelineIds({})
  }

  const getTimelineId = (timeline: any): string | null => {
    const id = timeline?.id ?? timeline?._id ?? timeline?.timelineId ?? null
    return id && String(id).trim() ? String(id) : null
  }

  const getCompletedAtInputValue = (timeline: any): string => {
    const raw = timeline?.completedAt
    if (!raw) return ''
    try {
      return new Date(raw).toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  /** Register-style label: Activity - Client - ID label: ID value (GST/TIN/PAN/CIN by activity) */
  const getTimelineDisplayLabel = (timeline: any): string => {
    const activity = timeline?.activity?.name || timeline?.activity || 'Unknown Activity'
    const sub = timeline?.subactivity?.name || timeline?.subactivity
    const activityPart = sub ? `${activity} - ${sub}` : activity
    const clientName = timeline?.client?.name || timeline?.client || 'Unknown Client'
    const { idLabel, idValue } = getClientIdDisplay(timeline)
    const idPart = (idLabel && idValue) ? ` - ${idLabel}: ${idValue}` : ''
    const periodPart = timeline?.period ? ` (${timeline.period})` : ''
    return `${activityPart} - ${clientName}${idPart}${periodPart}`
  }

  /** Derived from reference + completed: both filled → completed, both empty → pending, else ongoing */
  const getDerivedTimelineStatus = (timeline: any): string => {
    const ref = (timeline?.referenceNumber ?? '').toString().trim()
    const completed = timeline?.completedAt
    const hasRef = ref.length > 0
    const hasCompleted = Boolean(completed)
    if (hasRef && hasCompleted) return 'completed'
    if (!hasRef && !hasCompleted) return 'pending'
    return 'ongoing'
  }

  const fetchTaskTimelineDetails = async (task: Task) => {
    const token = localStorage.getItem('teamMemberToken')
    if (!token) return
    if (!task.timeline || !Array.isArray(task.timeline) || task.timeline.length === 0) {
      setTimelineDetails([])
      return
    }

    // task.timeline can contain string IDs or populated objects
    const idsToFetch = task.timeline
      .map((t) => (typeof t === 'string' ? t : (t?._id || t?.id)))
      .filter((id): id is string => Boolean(id))

    if (idsToFetch.length === 0) {
      setTimelineDetails([])
      return
    }

    setIsLoadingTimelineDetails(true)
    try {
      const results = await Promise.all(
        idsToFetch.map(async (timelineId) => {
          try {
            const res = await axios.get(`${Base_url}timelines/${timelineId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            return res.data
          } catch {
            return null
          }
        })
      )
      const valid = results.filter((t): t is NonNullable<typeof t> => t !== null)
      setTimelineDetails(valid)
      // All loaded timelines are included in updates (no Select column)
      const idsAllTrue: Record<string, boolean> = {}
      valid.forEach((t) => {
        const id = t?.id ?? t?._id ?? t?.timelineId
        if (id) idsAllTrue[String(id)] = true
      })
      setSelectedTimelineIds(idsAllTrue)
    } finally {
      setIsLoadingTimelineDetails(false)
    }
  }

  // Load timeline details when opening update modal
  useEffect(() => {
    if (showUpdateModal && selectedTask) {
      fetchTaskTimelineDetails(selectedTask)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpdateModal, selectedTask?._id, selectedTask?.id])

  const toggleTimelineSelected = (timelineId: string) => {
    setSelectedTimelineIds(prev => ({ ...prev, [timelineId]: !prev[timelineId] }))
  }

  const setTimelineField = (timeline: any, field: 'referenceNumber' | 'completedAt', value: string) => {
    const timelineId = getTimelineId(timeline)
    if (!timelineId) return

    // Editing a row auto-selects it (so payload matches "selected timelines")
    setSelectedTimelineIds(prev => ({ ...prev, [timelineId]: true }))

    const newCompletedAt = field === 'completedAt' ? (value ? new Date(value).toISOString() : null) : (timeline?.completedAt ?? null)
    const newRef = field === 'referenceNumber' ? value : (timeline?.referenceNumber ?? '')
    const derivedStatus = (newRef && newCompletedAt) ? 'completed' : (!newRef && !newCompletedAt ? 'pending' : 'ongoing')

    // Update visible data immediately (Excel-like feel); status is derived, not edited
    setTimelineDetails(prev =>
      prev.map(t => {
        const tid = getTimelineId(t)
        if (tid !== timelineId) return t
        if (field === 'completedAt') {
          return { ...t, completedAt: newCompletedAt, status: derivedStatus }
        }
        return { ...t, referenceNumber: value, status: derivedStatus }
      })
    )

    // Track edits for payload; status is always derived from reference + completed
    setTimelineUpdatesMap(prev => {
      const existing = prev[timelineId] || { timelineId }
      const effectiveRef = field === 'referenceNumber' ? value : (existing.referenceNumber ?? timeline?.referenceNumber ?? '')
      const effectiveCompleted = field === 'completedAt' ? newCompletedAt : (existing.completedAt !== undefined ? existing.completedAt : (timeline?.completedAt ?? null))
      const effectiveStatus = (effectiveRef && effectiveCompleted) ? 'completed' : (!effectiveRef && !effectiveCompleted ? 'pending' : 'ongoing')
      const next: TimelineUpdatePayload = {
        ...existing,
        timelineId,
        referenceNumber: effectiveRef,
        completedAt: effectiveCompleted,
        status: effectiveStatus
      }
      return { ...prev, [timelineId]: next }
    })
  }

  const clearTimelineEdits = () => {
    setTimelineUpdatesMap({})
    setSelectedTimelineIds({})
    // Keep timelineDetails as-is (so user doesn't lose loaded data)
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
      // Team members can update task fields + selected timelines using timelineUpdates
      const updateData: any = {}

      // Task status (optional)
      if (updateForm.status) {
        updateData.status = updateForm.status
      }

      // Task remarks (optional)
      if (updateForm.remarks !== undefined && updateForm.remarks !== selectedTask.remarks) {
        updateData.remarks = updateForm.remarks || ''
      }

      // Timeline updates (only for selected timelines)
      const selectedIds = Object.entries(selectedTimelineIds)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)

      const timelineUpdates: TimelineUpdatePayload[] = selectedIds
        .map((id) => timelineUpdatesMap[id])
        .filter((u): u is TimelineUpdatePayload => Boolean(u && u.timelineId))

      if (timelineUpdates.length > 0) {
        updateData.timelineUpdates = timelineUpdates
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
    timeline: [] as string[],
    completedAt: '',
    referenceNumber: ''
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
      timeline: timelineIds,
      completedAt: (task as any).completedAt ? new Date((task as any).completedAt).toISOString().split('T')[0] : '',
      referenceNumber: (task as any).referenceNumber || ''
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
      timeline: [],
      completedAt: '',
      referenceNumber: ''
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
      
      const updateData: any = {
        teamMember: editTaskForm.teamMember,
        branch: editTaskForm.branch,
        remarks: editTaskForm.remarks || '',
        priority: editTaskForm.priority,
        status: editTaskForm.status,
        startDate: new Date(editTaskForm.startDate).toISOString(),
        endDate: new Date(editTaskForm.endDate).toISOString(),
        timeline: editTaskForm.timeline || []
      }

      // Add optional fields if provided
      if (editTaskForm.completedAt) {
        updateData.completedAt = new Date(editTaskForm.completedAt).toISOString()
      }
      if (editTaskForm.referenceNumber) {
        updateData.referenceNumber = editTaskForm.referenceNumber.trim()
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
      timeline: [],
      completedAt: '',
      referenceNumber: ''
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

  const clearTimelineFilters = () => {
    setTimelineFilters({
      activity: "",
      subActivity: "",
      frequency: "",
      period: "",
      status: "",
      client: ""
    })
    setTimelineClientSearchTerm("")
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

      const taskData: any = {
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

      // Add optional fields if provided
      if (assignTaskForm.completedAt) {
        taskData.completedAt = new Date(assignTaskForm.completedAt).toISOString()
      }
      if (assignTaskForm.referenceNumber) {
        taskData.referenceNumber = assignTaskForm.referenceNumber.trim()
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
  }, [statusFilter, priorityFilter, startDateFilter, endDateFilter, teamMemberFilter, viewAccessibleTasks, teamMemberData, loading, sortBy])

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
      {/* Header – spec: page title 14px bold gray-800, buttons 11px bold */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <h1 className="text-[14px] font-bold text-gray-800">
            Welcome, {teamMemberData?.name || 'Team Member'}
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
          >
            <i className="ri-logout-box-r-line text-xs"></i>
            <span>Logout</span>
          </button>
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
          <div className="p-[10px]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-gray-800">
                    {accessibleTeamMembers.length > 0 && viewAccessibleTasks ? 'Accessible Team Members\' Tasks' : 'My Tasks'}
                  </h2>
                  <p className="text-[11px] text-[#495057] mt-0.5">
                    {totalResults > 0 ? `${totalResults} task(s) found` : tasks.length > 0 ? `${tasks.length} task(s) found` : 'No tasks available'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {accessibleTeamMembers.length > 0 && (
                  <>
                    <button
                      onClick={openAssignTaskModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    >
                      <i className="ri-add-line text-xs"></i> Assign Task
                    </button>
                    <button
                      onClick={() => setViewAccessibleTasks(!viewAccessibleTasks)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded shadow-sm ${
                        viewAccessibleTasks ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`ri-${viewAccessibleTasks ? 'user-line' : 'team-line'} text-xs`}></i>
                      {viewAccessibleTasks ? 'My Tasks' : 'View All Accessible'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleRefreshTasks}
                  disabled={tasksLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                >
                  <i className="ri-refresh-line text-xs"></i>
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
            <div className="mb-6 flex flex-wrap items-end gap-3">
              <div className="flex-shrink-0 min-w-[160px]">
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
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
              
              <div className="flex-shrink-0 min-w-[160px]">
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="flex-shrink-0 min-w-[160px]">
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                />
              </div>
              <div className="flex-shrink-0 min-w-[160px]">
                <label className="block text-[11px] font-medium text-[#495057] mb-1">End Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                />
              </div>
              {viewAccessibleTasks && accessibleTeamMembers.length > 0 && (
                <div className="flex-shrink-0 min-w-[200px]">
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Team Member</label>
                  <select
                    value={teamMemberFilter}
                    onChange={(e) => setTeamMemberFilter(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
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

              {/* Sort Filter */}
              <div className="flex-shrink-0 min-w-[245px]">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1) }}
                  className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
                >
                  <option value="createdAt:desc">Newest First</option>
                  <option value="createdAt:asc">Oldest First</option>
                  <option value="endDate:asc">End Date (Earliest-Latest)</option>
                  <option value="endDate:desc">End Date (Latest-Earliest)</option>
                  <option value="priority:desc">Priority (High-Low)</option>
                  <option value="priority:asc">Priority (Low-High)</option>
                </select>
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
            <div className="overflow-x-auto min-h-[300px]">
              {tasksLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
                  <span className="mt-2 text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Loading Data</span>
                </div>
              ) : tasks.length > 0 ? (
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-3 pl-[10px] text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Task Details</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Clients & Activities</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status & Priority</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Timeline</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 pr-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task._id || task.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-1.5 py-2.5 pl-[10px] border border-gray-200">
                          <div className="text-[12px] font-medium text-gray-900">{task.remarks}</div>
                          {viewAccessibleTasks && (
                            <div className="text-[12px] text-gray-600 mt-1">
                              <i className="ri-user-line mr-1"></i>
                              Assigned to: <span className="font-medium">{getTeamMemberName(task)}</span>
                            </div>
                          )}
                          {hasAssignedBy(task) && (
                            <div className="text-[12px] text-gray-600 mt-1">
                              <i className="ri-user-add-line mr-1"></i>
                              Assigned by: <span className="font-medium">{getAssignedByName(task)}</span>
                            </div>
                          )}
                          <div className="text-[12px] text-gray-500">
                            Branch: {task.branch?.name || 'N/A'}
                          </div>
                          {task.attachments && task.attachments.length > 0 && (
                            <div className="text-[11px] text-purple-600 mt-1">
                              📎 {task.attachments.length} attachment(s)
                            </div>
                          )}
                          <div className="text-[11px] text-gray-400 mt-1">
                            Created: {formatDate(task.createdAt)}
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
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
                            <span className="text-gray-400 text-[12px]">No timeline data</span>
                          )}
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              {task.status === 'delayed' && (
                                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  <i className="ri-check-line mr-1"></i> Can Complete
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded w-fit ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200 text-[12px] text-gray-900">
                          <div>Start: {formatDate(task.startDate)}</div>
                          <div>End: {formatDate(task.endDate)}</div>
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200 pr-[10px]">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-wrap">
                            <button
                              onClick={() => openViewDetailsModal(task)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100"
                              title="View task details"
                            >
                              <i className="ri-eye-line text-xs"></i>
                            </button>
                            {viewAccessibleTasks && (
                              <button
                                onClick={() => openEditTaskModal(task)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                                title="Edit task"
                              >
                                <i className="ri-pencil-line text-xs"></i>
                              </button>
                            )}
                            <button
                              onClick={() => openUpdateModal(task)}
                              className={`w-7 h-7 flex items-center justify-center rounded ${
                                task.status === 'delayed'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                              }`}
                              title={task.status === 'delayed' ? 'Mark as completed' : 'Update task status'}
                            >
                              <i className={`${task.status === 'delayed' ? 'ri-check-line' : 'ri-edit-line'} text-xs`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <i className="ri-task-line text-xl text-gray-200"></i>
                  </div>
                  <p className="text-xs font-bold text-gray-400 mb-1">NO TASKS FOUND</p>
                  <p className="text-[11px] text-gray-500">You don't have any tasks assigned at the moment.</p>
                </div>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="p-[10px] pt-4 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="mr-2 text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
                  <select
                    className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1 || tasksLoading}
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-[11px] font-medium text-[#495057] tracking-tight">
                    {totalResults > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalResults)} of ${totalResults} entries` : "No results"}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0 || tasksLoading}
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Task Drawer */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-[60.48rem] bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Update Task Status</h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto flex-1">
              
              {/* Task Details (Read-Only) */}
              <div className="mb-4 p-3 bg-gray-50 rounded space-y-3">
                <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">Task Details (View Only)</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {viewAccessibleTasks && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Assigned To</label>
                      <p className="text-[12px] text-gray-900 font-medium">
                        <i className="ri-user-line mr-1"></i>
                        {getTeamMemberName(selectedTask)}
                      </p>
                    </div>
                  )}
                  {hasAssignedBy(selectedTask) && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Assigned By</label>
                      <p className="text-[12px] text-gray-900 font-medium">
                        <i className="ri-user-add-line mr-1"></i>
                        {getAssignedByName(selectedTask)}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Remarks</label>
                    <p className="text-[12px] text-gray-900">{selectedTask.remarks || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Start Date</label>
                    <p className="text-[12px] text-gray-900">{formatDate(selectedTask.startDate)}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">End Date</label>
                    <p className="text-[12px] text-gray-900">{formatDate(selectedTask.endDate)}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Branch</label>
                    <p className="text-[12px] text-gray-900">{selectedTask.branch?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1">Current Status</label>
                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Status Update Section — spec: 11px inputs/labels */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">Update Status <span className="text-red-500">*</span></label>
                  {selectedTask?.status === 'delayed' ? (
                    <div className="space-y-1.5">
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                        <div className="flex items-center gap-1.5">
                          <i className="ri-information-line text-amber-600 text-sm shrink-0"></i>
                          <span className="text-[11px] font-medium text-amber-800">
                            Delayed tasks can only be marked as completed
                          </span>
                        </div>
                      </div>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                        className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                      >
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Remarks <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={updateForm.remarks}
                    onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded bg-white text-[#495057] text-[11px] font-medium focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                    rows={3}
                    placeholder="Enter remarks..."
                  />
                </div>

                {/* Related Timelines (Excel) */}
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-medium text-[#495057]">
                      Related Timelines (Excel)
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchTaskTimelineDetails(selectedTask)}
                      disabled={isLoadingTimelineDetails}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                    >
                      <i className="ri-refresh-line text-xs"></i>
                      {isLoadingTimelineDetails ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {selectedTask.timeline && selectedTask.timeline.length === 0 ? (
                    <div className="text-[11px] text-[#495057] p-2 bg-gray-50 rounded border border-gray-200">
                      No related timelines available.
                    </div>
                  ) : isLoadingTimelineDetails ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : timelineDetails.length > 0 ? (
                    <>
                      <div className="overflow-auto border border-gray-200 dark:border-gray-600 rounded" style={{ maxHeight: '320px' }}>
                        <table className="w-full border-collapse border border-gray-200">
                          <thead>
                            <tr className="bg-gray-50/30">
                              <th className="border border-gray-200 px-1.5 py-3 pl-[10px] text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ minWidth: 140 }}>Activity</th>
                              <th className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ minWidth: 120 }}>Client</th>
                              <th className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ minWidth: 140 }}>Client ID (GST/TIN/PAN/CIN)</th>
                              <th className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ width: 100 }}>Status</th>
                              <th className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider" style={{ width: 140 }}>Reference</th>
                              <th className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider pr-[10px]" style={{ width: 120 }}>Completed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timelineDetails.map((timeline, idx) => {
                              const tid = getTimelineId(timeline) || `row-${idx}`
                              return (
                                <tr key={tid} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="border border-gray-200 px-1.5 py-2.5 pl-[10px] text-[12px] text-gray-900">
                                    <div className="font-medium">{timeline.activity?.name || timeline.activity || 'Unknown Activity'}</div>
                                    {timeline.subactivity?.name && <div className="text-[11px] text-gray-600 mt-0.5">{timeline.subactivity.name}</div>}
                                    {timeline.period && <div className="text-[11px] text-gray-500 mt-0.5">Period: {timeline.period}</div>}
                                  </td>
                                  <td className="border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900">{timeline.client?.name || timeline.client || 'Unknown Client'}</td>
                                  <td className="border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900">
                                    {(() => {
                                      const { idLabel, idValue } = getClientIdDisplay(timeline as Parameters<typeof getClientIdDisplay>[0])
                                      if (!idLabel && !idValue) return <span className="text-gray-400">–</span>
                                      return <span><span className="text-gray-500">{idLabel}:</span> <span className="font-mono">{idValue || '–'}</span></span>
                                    })()}
                                  </td>
                                  <td className="border border-gray-200 px-1.5 py-2.5">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${getStatusColor(getDerivedTimelineStatus(timeline))}`}>
                                      {getDerivedTimelineStatus(timeline)}
                                    </span>
                                  </td>
                                  <td className="border border-gray-200 px-1.5 py-2.5">
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-[11px] font-medium text-gray-900 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                                      value={timeline.referenceNumber || ''}
                                      onChange={(e) => setTimelineField(timeline, 'referenceNumber', e.target.value)}
                                      disabled={updatingTask}
                                      placeholder="REF-123"
                                    />
                                  </td>
                                  <td className="border border-gray-200 px-1.5 py-2.5 pr-[10px]">
                                    <input
                                      type="date"
                                      className="w-full px-2 py-1 border border-gray-200 rounded bg-white text-[11px] font-medium text-gray-900 focus:ring-0 focus:border-purple-300"
                                      value={getCompletedAtInputValue(timeline)}
                                      onChange={(e) => setTimelineField(timeline, 'completedAt', e.target.value)}
                                      disabled={updatingTask}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-1.5 text-[11px] text-[#495057]">
                        Status is derived from Reference + Completed. To clear: set Reference empty and clear Completed date (status becomes pending).
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-[#495057] p-2 bg-gray-50 rounded border border-gray-200">
                      Timeline details not loaded. Click Refresh.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                onClick={closeUpdateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm"
              >
                <i className="ri-close-line text-xs"></i> Cancel
              </button>
              <button
                onClick={handleUpdateTask}
                disabled={updatingTask || (selectedTask?.status === 'delayed' && updateForm.status === 'delayed')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
              >
                <i className="ri-save-line text-xs"></i>
                {updatingTask ? 'Updating...' : (selectedTask?.status === 'delayed' ? 'Mark as Completed' : 'Update Task')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Task Details Drawer */}
      {showViewDetailsModal && viewTaskDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-[60.48rem] bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Task Details (View Only)</h3>
              <button onClick={closeViewDetailsModal} className="p-1 text-gray-500 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto flex-1">
              
              <div className="space-y-6">
                {/* Basic Task Information */}
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-3">Task Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewAccessibleTasks && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Assigned To</label>
                        <p className="text-[12px] text-gray-900 font-medium">
                          <i className="ri-user-line mr-1"></i>
                          {getTeamMemberName(viewTaskDetails)}
                        </p>
                      </div>
                    )}
                    {hasAssignedBy(viewTaskDetails) && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Assigned By</label>
                        <p className="text-[12px] text-gray-900 font-medium">
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
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Priority</label>
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getPriorityColor(viewTaskDetails.priority)}`}>
                        {viewTaskDetails.priority}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Branch</label>
                      <p className="text-[12px] text-gray-900">
                        {viewTaskDetails.branch?.name || 'N/A'}
                        {viewTaskDetails.branch?.address && (
                          <span className="text-[11px] text-gray-500 block">
                            {viewTaskDetails.branch.address}, {viewTaskDetails.branch.city}, {viewTaskDetails.branch.state}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Start Date</label>
                      <p className="text-[12px] text-gray-900">{formatDate(viewTaskDetails.startDate)}</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">End Date</label>
                      <p className="text-[12px] text-gray-900">{formatDate(viewTaskDetails.endDate)}</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#495057] mb-1">Created At</label>
                      <p className="text-[12px] text-gray-900">{formatDate(viewTaskDetails.createdAt)}</p>
                    </div>
                    {viewTaskDetails.updatedAt && (
                    <div>
                        <label className="block text-[11px] font-medium text-[#495057] mb-1">Last Updated</label>
                        <p className="text-[12px] text-gray-900">{formatDate(viewTaskDetails.updatedAt)}</p>
                    </div>
                    )}
                  </div>
                </div>

                {/* Clients & Timeline Details */}
                {viewTaskDetails.timeline && viewTaskDetails.timeline.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-3">Clients & Timeline Details</h4>
                    <div className="space-y-4">
                      {viewTaskDetails.timeline.map((timeline, index) => {
                        const isPopulated = typeof timeline === 'object' && timeline !== null && 'client' in timeline
                        const timelineId = typeof timeline === 'string' ? timeline : (timeline._id || timeline.id || `timeline-${index}`)
                        
                        if (!isPopulated) {
                          return (
                            <div key={timelineId} className="p-3 bg-white rounded border border-gray-200">
                              <h5 className="text-[12px] font-bold text-gray-900 mb-1">Timeline ID: {timelineId}</h5>
                              <p className="text-[11px] text-gray-500">Timeline details are not loaded.</p>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={timelineId} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="text-[12px] font-bold text-gray-900 mb-0.5">{timeline.client?.name || 'N/A'}</h5>
                                {timeline.client && (
                                  <div className="text-[11px] text-gray-500 space-y-0.5">
                                    {timeline.client.email && <div className="flex items-center"><i className="ri-mail-line mr-1"></i>{timeline.client.email}</div>}
                                    {timeline.client.phone && <div className="flex items-center"><i className="ri-phone-line mr-1"></i>{timeline.client.phone}</div>}
                                  </div>
                                )}
                              </div>
                              {timeline.status && (
                                <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getStatusColor(timeline.status)}`}>{timeline.status}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
                              {timeline.activity?.name && (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Activity</label><p className="text-[12px] text-gray-900">{timeline.activity.name}</p></div>)}
                              {timeline.subactivity?.name && (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Subactivity</label><p className="text-[12px] text-gray-900">{timeline.subactivity.name}</p></div>)}
                              {(() => {
                                const { idLabel, idValue } = getClientIdDisplay(timeline as Parameters<typeof getClientIdDisplay>[0])
                                if (idLabel || idValue) {
                                  return (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Client ID ({idLabel})</label><p className="text-[12px] text-gray-900 font-mono">{idValue || '–'}</p></div>)
                                }
                                return null
                              })()}
                              {timeline.frequency && (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Frequency</label><p className="text-[12px] text-gray-900">{timeline.frequency}</p></div>)}
                              {timeline.startDate && (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Timeline Start</label><p className="text-[12px] text-gray-900">{formatDate(timeline.startDate)}</p></div>)}
                              {timeline.endDate && (<div><label className="block text-[11px] font-medium text-[#495057] mb-0.5">Timeline End</label><p className="text-[12px] text-gray-900">{formatDate(timeline.endDate)}</p></div>)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {viewTaskDetails.attachments && viewTaskDetails.attachments.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">Attachments</h4>
                    <div className="space-y-1.5">
                      {viewTaskDetails.attachments.map((attachment) => (
                        <div key={attachment._id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                          <span className="text-[12px] text-gray-900">{attachment.fileName}</span>
                          <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-purple-600 hover:text-purple-700">
                            <i className="ri-download-line mr-1"></i> Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {viewTaskDetails.metadata && Object.keys(viewTaskDetails.metadata).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">Additional Information</h4>
                    <div className="space-y-1">
                      {Object.entries(viewTaskDetails.metadata).map(([key, value]) => (
                        <div key={key} className="flex text-[11px]">
                          <span className="font-medium text-[#495057] w-28">{key}:</span>
                          <span className="text-gray-900 flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                onClick={closeViewDetailsModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm"
              >
                <i className="ri-close-line text-xs"></i> Close
              </button>
              {viewAccessibleTasks && (
                <button
                  onClick={() => { closeViewDetailsModal(); openEditTaskModal(viewTaskDetails); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  <i className="ri-edit-2-line text-xs"></i> Edit Task
                </button>
              )}
              <button
                onClick={() => { closeViewDetailsModal(); openUpdateModal(viewTaskDetails); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded shadow-sm ${
                  viewTaskDetails.status === 'delayed' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <i className={`ri-${viewTaskDetails.status === 'delayed' ? 'check-line' : 'edit-line'} text-xs`}></i>
                {viewTaskDetails.status === 'delayed' ? 'Mark Complete' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Drawer */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-[60.48rem] bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Edit Task</h3>
              <button onClick={closeEditTaskModal} className="p-1 text-gray-500 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto flex-1">
              
              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">Team Member <span className="text-red-500">*</span></label>
                  <select
                    value={editTaskForm.teamMember}
                    onChange={(e) => setEditTaskForm({...editTaskForm, teamMember: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={editTaskForm.startDate}
                    onChange={(e) => setEditTaskForm({...editTaskForm, startDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editTaskForm.endDate}
                    onChange={(e) => setEditTaskForm({...editTaskForm, endDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    min={editTaskForm.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTaskForm.priority}
                    onChange={(e) => setEditTaskForm({...editTaskForm, priority: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editTaskForm.branch}
                    onChange={(e) => setEditTaskForm({...editTaskForm, branch: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Related Timelines
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditTimelineModal(true)
                        setTimelineSearchQuery("")
                        setTimelineCurrentPage(1)
                        setSelectedActivity("")
                        setSelectedSubActivity("")
                        setSelectedGroup("")
                        setTimelineItemsPerPage(10)
                        fetchTimelines(1, "", true)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                    >
                      <i className="ri-add-line text-xs"></i>
                      Select Timelines ({editSelectedTimelines.length})
                    </button>
                    {editSelectedTimelines.length > 0 && (
                      <span className="text-[11px] text-[#495057]">
                        {editSelectedTimelines.length} timeline{editSelectedTimelines.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {editSelectedTimelines.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {editSelectedTimelines.map(timeline => (
                        <span key={timeline.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-50 text-gray-800 border border-gray-200">
                          {timeline.title || getTimelineDisplayLabel(timeline)}
                          <button
                            type="button"
                            className="ml-1.5 text-gray-500 hover:text-gray-700 p-0.5"
                            onClick={() => {
                              setEditSelectedTimelines(prev => prev.filter(t => t.id !== timeline.id))
                              setEditTaskForm(prev => ({
                                ...prev,
                                timeline: prev.timeline.filter(id => id !== timeline.id)
                              }))
                            }}
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    value={editTaskForm.remarks}
                    onChange={(e) => setEditTaskForm({...editTaskForm, remarks: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    rows={3}
                    placeholder="Enter task remarks..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Status
                  </label>
                  <select
                    value={editTaskForm.status}
                    onChange={(e) => setEditTaskForm({...editTaskForm, status: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>

                {/* Completed Date */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Completed Date <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={editTaskForm.completedAt}
                    onChange={(e) => setEditTaskForm({...editTaskForm, completedAt: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    max={editTaskForm.endDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Reference Number <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editTaskForm.referenceNumber}
                    onChange={(e) => setEditTaskForm({...editTaskForm, referenceNumber: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    placeholder="Enter reference number..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                onClick={closeEditTaskModal}
                disabled={isSavingEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm disabled:opacity-50"
              >
                <i className="ri-close-line text-xs"></i> Cancel
              </button>
              <button
                onClick={handleEditTask}
                disabled={isSavingEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                ) : (
                  <i className="ri-save-line text-xs"></i>
                )}
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Drawer */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-[60.48rem] bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Assign Task to Team Member</h3>
              <button onClick={closeAssignTaskModal} className="p-1 text-gray-500 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto flex-1 space-y-4">
                {/* Team Member Selection */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Team Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.teamMember}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, teamMember: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignTaskForm.startDate}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, startDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignTaskForm.endDate}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, endDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    min={assignTaskForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.priority}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, priority: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTaskForm.branch}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, branch: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
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
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Related Timelines
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimelineModal(true)
                        setTimelineSearchQuery("")
                        setTimelineCurrentPage(1)
                        setSelectedActivity("")
                        setSelectedSubActivity("")
                        setSelectedGroup("")
                        setTimelineItemsPerPage(10)
                        fetchTimelines(1, "", true)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                    >
                      <i className="ri-add-line text-xs"></i>
                      Select Timelines ({selectedTimelines.length})
                    </button>
                    {selectedTimelines.length > 0 && (
                      <span className="text-[11px] text-[#495057]">
                        {selectedTimelines.length} timeline{selectedTimelines.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {selectedTimelines.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedTimelines.map(timeline => (
                        <span key={timeline.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-50 text-gray-800 border border-gray-200">
                          {timeline.title || getTimelineDisplayLabel(timeline)}
                          <button
                            type="button"
                            className="ml-1.5 text-gray-500 hover:text-gray-700 p-0.5"
                            onClick={() => {
                              setSelectedTimelines(prev => prev.filter(t => t.id !== timeline.id))
                              setAssignTaskForm(prev => ({
                                ...prev,
                                timeline: prev.timeline.filter(id => id !== timeline.id)
                              }))
                            }}
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    value={assignTaskForm.remarks}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, remarks: e.target.value})}
                    rows={3}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                    placeholder="Enter task remarks..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Status
                  </label>
                  <select
                    value={assignTaskForm.status}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, status: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                {/* Completed Date */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Completed Date <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={assignTaskForm.completedAt}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, completedAt: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    max={assignTaskForm.endDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Reference Number <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={assignTaskForm.referenceNumber}
                    onChange={(e) => setAssignTaskForm({...assignTaskForm, referenceNumber: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300"
                    placeholder="Enter reference number..."
                  />
                </div>
            </div>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                onClick={closeAssignTaskModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm"
              >
                <i className="ri-close-line text-xs"></i> Cancel
              </button>
              <button
                onClick={handleAssignTask}
                disabled={assigningTask}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                <i className="ri-add-line text-xs"></i>
                {assigningTask ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Selection Drawer - Shared for Assign and Edit */}
      {(showTimelineModal || showEditTimelineModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-[80.64rem] bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">Select Timelines</h2>
              <button
                onClick={() => { setShowTimelineModal(false); setShowEditTimelineModal(false); }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-[10px] border-b border-gray-300 bg-gray-50/30">
              {/* Filters – Activity, Sub-Activity, Frequency, Period, Status, Client */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                {/* Activity */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Activity
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    value={timelineFilters.activity}
                    onChange={(e) => {
                      const value = e.target.value
                      setTimelineFilters(prev => ({
                        activity: value,
                        subActivity: "",
                        frequency: "",
                        period: "",
                        status: prev.status,
                        client: prev.client
                      }))
                      setAvailablePeriods([])
                    }}
                  >
                    <option value="">All Activities</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Activity */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Sub-Activity
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    value={timelineFilters.subActivity}
                    onChange={(e) => {
                      const selectedSubActivityId = e.target.value
                      const selectedActivity = activities.find(a => a.id === timelineFilters.activity)
                      const selectedSubActivity = selectedActivity?.subactivities?.find(sa => (sa._id || sa.id) === selectedSubActivityId)

                      setTimelineFilters(prev => ({
                        ...prev,
                        subActivity: selectedSubActivityId,
                        frequency: selectedSubActivity?.frequency || "",
                        period: ""
                      }))

                      if (selectedSubActivity?.frequency) {
                        fetchTimelineFrequencyPeriods(selectedSubActivity.frequency)
                      } else {
                        setAvailablePeriods([])
                      }
                    }}
                    disabled={!timelineFilters.activity}
                  >
                    <option value="">All Sub-Activities</option>
                    {timelineFilters.activity && activities.find(a => a.id === timelineFilters.activity)?.subactivities?.map((subActivity) => (
                      <option key={subActivity._id || subActivity.id} value={subActivity._id || subActivity.id}>
                        {subActivity.name}
                      </option>
                    ))}
                  </select>
                  {!timelineFilters.activity && (
                    <p className="text-[11px] text-gray-500 mt-1">Select an activity first</p>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Frequency
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    value={timelineFilters.frequency}
                    onChange={(e) => {
                      const freq = e.target.value
                      setTimelineFilters(prev => ({
                        ...prev,
                        frequency: freq,
                        period: ""
                      }))
                      fetchTimelineFrequencyPeriods(freq)
                    }}
                    disabled={!!timelineFilters.subActivity}
                  >
                    <option value="">All Frequencies</option>
                    <option value="OneTime">One Time</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  {timelineFilters.subActivity && (
                    <p className="text-[11px] text-gray-500 mt-1">Frequency auto-selected from sub-activity</p>
                  )}
                </div>

                {/* Period */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Period
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    value={timelineFilters.period}
                    onChange={(e) => setTimelineFilters(prev => ({ ...prev, period: e.target.value }))}
                    disabled={!timelineFilters.frequency}
                  >
                    <option value="">All Periods</option>
                    {isLoadingPeriods ? (
                      <option value="" disabled>Loading periods...</option>
                    ) : availablePeriods.length > 0 ? (
                      availablePeriods.map((period) => (
                        <option key={period.period} value={period.period}>
                          {period.displayName || period.period}
                        </option>
                      ))
                    ) : timelineFilters.frequency ? (
                      <option value="" disabled>No periods available for this frequency</option>
                    ) : (
                      <option value="" disabled>Select frequency first</option>
                    )}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Status
                  </label>
                  <select
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                    value={timelineFilters.status}
                    onChange={(e) => setTimelineFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>

                {/* Client (searchable) */}
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
                    Client
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 mb-1"
                    placeholder="Search client..."
                    value={timelineClientSearchTerm || (timelineFilters.client ? timelineClients.find(c => c.id === timelineFilters.client)?.name || "" : "")}
                    onChange={(e) => {
                      const value = e.target.value
                      setTimelineClientSearchTerm(value)
                      if (!value) {
                        setTimelineFilters(prev => ({ ...prev, client: "" }))
                        setTimelineClients([])
                      } else {
                        // Call API to get client suggestions
                        fetchTimelineClients(value)
                      }
                    }}
                  />
                  {timelineClientSearchTerm && (
                    <div className="max-h-40 overflow-auto border border-gray-300 rounded bg-white shadow-sm text-[11px]">
                      {timelineClients.length > 0 ? (
                        timelineClients.map(client => (
                          <div
                            key={client.id}
                            className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setTimelineFilters(prev => ({ ...prev, client: client.id }))
                              setTimelineClientSearchTerm(client.name)
                            }}
                          >
                            {client.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 text-gray-500">
                          No clients found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <i className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none ri-search-line"></i>
                  <input
                    type="text"
                    placeholder="Search timelines by title, activity, or client..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded bg-white text-[#495057] text-[11px] font-medium focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                    value={timelineSearchQuery}
                    onChange={handleTimelineSearchChange}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTimelineSearchClick() }}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 bg-purple-600 text-white hover:bg-purple-700 rounded-r text-[11px] font-bold"
                    onClick={handleTimelineSearchClick}
                  >
                    <i className="ri-search-line text-xs"></i>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={clearTimelineFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                  disabled={
                    !timelineFilters.activity &&
                    !timelineFilters.subActivity &&
                    !timelineFilters.frequency &&
                    !timelineFilters.period &&
                    !timelineFilters.status &&
                    !timelineFilters.client &&
                    !timelineSearchQuery
                  }
                >
                  <i className="ri-refresh-line text-xs"></i> Clear Filters
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-[10px]">
              {/* Active Filters Summary */}
              {(timelineFilters.activity || timelineFilters.subActivity || timelineFilters.status || timelineFilters.client) && (
                <div className="mb-3 p-2 bg-gray-50 border border-gray-300 rounded">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#495057]">Active Filters:</span>
                      {timelineFilters.activity && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          Activity: {activities.find(a => a.id === timelineFilters.activity)?.name}
                        </span>
                      )}
                      {timelineFilters.subActivity && timelineFilters.activity && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          Sub: {activities.find(a => a.id === timelineFilters.activity)?.subactivities?.find(sa => (sa._id || sa.id) === timelineFilters.subActivity)?.name}
                        </span>
                      )}
                      {timelineFilters.status && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          Status: {timelineFilters.status}
                        </span>
                      )}
                      {timelineFilters.client && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700 border border-green-100">
                          Client: {timelineClients.find(c => c.id === timelineFilters.client)?.name || timelineFilters.client}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={clearTimelineFilters} className="text-[11px] font-bold text-purple-600 hover:text-purple-700">
                      <i className="ri-close-line mr-1"></i> Clear All
                    </button>
                  </div>
                </div>
              )}

              {isLoadingTimelines ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
                  <span className="mt-2 text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Loading Data</span>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-1.5 py-3 pl-[10px] text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Select</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Activity</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Sub Activity</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Client</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Client ID (GST/TIN/PAN/CIN)</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Period</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 pr-[10px]">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelines.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-1.5 py-8 pr-[10px] text-center border border-gray-300">
                            <div className="flex flex-col items-center justify-center py-20">
                              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <i className="ri-search-line text-xl text-gray-200"></i>
                              </div>
                              <h3 className="text-xs font-bold text-gray-400 mb-1">NO TIMELINES FOUND</h3>
                              <p className="text-[11px] text-gray-500 mb-4">
                                {(timelineFilters.activity || timelineFilters.subActivity || timelineFilters.status || timelineFilters.client || timelineSearchQuery)
                                  ? "Try adjusting your filters or search criteria."
                                  : "No timelines available at the moment."}
                              </p>
                              {(timelineFilters.activity || timelineFilters.subActivity || timelineFilters.status || timelineFilters.client || timelineSearchQuery) && (
                                <button onClick={clearTimelineFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm">
                                  <i className="ri-refresh-line text-xs"></i> Clear Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        timelines.map((timeline) => (
                          <tr key={timeline.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-1.5 py-2.5 pl-[10px] whitespace-nowrap border border-gray-300">
                              <input
                                type="checkbox"
                                className="rounded border-2 border-gray-300 text-purple-600 focus:ring-0 focus:border-purple-500 h-3.5 w-3.5"
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
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300 text-[12px] text-gray-900">{timeline.activity?.name || 'Unknown Activity'}</td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300 text-[12px] text-gray-900">{timeline.subactivity?.name || '-'}</td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300 text-[12px] text-gray-900">{timeline.client?.name || 'Unknown Client'}</td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300">
                              {(() => {
                                const { idLabel, idValue } = getClientIdDisplay(timeline as Parameters<typeof getClientIdDisplay>[0])
                                if (!idLabel && !idValue) return <span className="text-[12px] text-gray-400">-</span>
                                return (
                                  <div className="text-[12px] text-gray-900">
                                    <span className="text-gray-500">{idLabel}:</span>{' '}
                                    <span className="font-mono">{idValue || '-'}</span>
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300 text-[12px] text-gray-900">{timeline.period || '-'}</td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300">
                              <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                                timeline.status === 'completed' ? 'bg-green-100 text-green-800' :
                                timeline.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                timeline.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {timeline.status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-1.5 py-2.5 whitespace-nowrap border border-gray-300 pr-[10px]">
                              <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                                timeline.priority === 'high' ? 'bg-red-100 text-red-800' :
                                timeline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
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
            <div className="p-[10px] pt-4 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center flex-wrap gap-2">
                <label className="mr-2 text-[11px] font-medium text-[#495057] whitespace-nowrap">Rows per page:</label>
                <select
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
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
                <button
                  onClick={() => handleTimelinePageChange(Math.max(timelineCurrentPage - 1, 1))}
                  disabled={timelineCurrentPage === 1 || timelines.length === 0}
                  className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-[11px] font-medium text-[#495057] tracking-tight">
                  {timelineTotalResults > 0 ? `Showing ${(timelineCurrentPage - 1) * timelineItemsPerPage + 1} to ${Math.min(timelineCurrentPage * timelineItemsPerPage, timelineTotalResults)} of ${timelineTotalResults} entries` : "No results"}
                </span>
                <button
                  onClick={() => handleTimelinePageChange(Math.min(timelineCurrentPage + 1, timelineTotalPages))}
                  disabled={timelineCurrentPage === timelineTotalPages || timelineTotalPages === 0 || timelines.length === 0}
                  className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowTimelineModal(false); setShowEditTimelineModal(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm"
                >
                  <i className="ri-close-line text-xs"></i> Cancel
                </button>
                <button
                  onClick={() => { if (showEditTimelineModal) handleEditTimelineModalSubmit(); else handleTimelineModalSubmit(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                >
                  Select ({showEditTimelineModal ? editSelectedTimelines.length : selectedTimelines.length})
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
