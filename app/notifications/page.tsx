"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWebSocket } from '@/hooks/use-websocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bell, 
  BellRing, 
  Mail, 
  Eye, 
  MousePointer, 
  MessageSquare,
  ExternalLink,
  Clock,
  Building2,
  Search,
  Filter,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  leadId: string
  eventType: string
  status?: string
  leadName: string
  businessName?: string
  leadStatus: string
  timestamp: string
  metadata?: any
  redirectUrl: string
  message: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isClearing, setIsClearing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { isConnected, clearNotifications } = useWebSocket({
    onNotification: (notification) => {
      // Add new notification to the list
      setNotifications(prev => [notification, ...prev])
    }
  })

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return
    
    setRefreshing(true)
    try {
      const response = await fetch(`/api/email-notifications?userId=${user.id}&limit=100`)
      const data = await response.json()
      
      if (response.ok && data.notifications) {
        const formattedNotifications = data.notifications.map((notification: any) => ({
          id: notification.id,
          leadId: notification.lead_id,
          eventType: notification.event_type,
          status: notification.status,
          leadName: notification.leads?.contact_first_name && notification.leads?.contact_last_name 
            ? `${notification.leads.contact_first_name} ${notification.leads.contact_last_name}`
            : 'Unknown Lead',
          businessName: notification.leads?.business_name,
          leadStatus: notification.leads?.current_status || 'Unknown',
          timestamp: notification.created_at,
          metadata: notification.metadata,
          redirectUrl: `/leads/${notification.lead_id}`,
          message: getNotificationMessage(notification.event_type, notification.leads, notification.status)
        }))
        
        setNotifications(formattedNotifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Get notification message
  const getNotificationMessage = (eventType: string, lead: any, status?: string): string => {
    const leadName = `${lead?.contact_first_name || 'Unknown'} ${lead?.contact_last_name || 'Lead'}`
    const businessName = lead?.business_name ? ` (${lead.business_name})` : ''
    
    // Handle status-based messages first
    if (status) {
      switch (status) {
        case 'open':
          return `📬 ${leadName}${businessName} email is ready to be sent`
        case 'processed':
          return `⚙️ ${leadName}${businessName} email is being processed`
        case 'delivered':
          return `✅ ${leadName}${businessName} email has been delivered`
        case 'not_delivered':
          return `❌ ${leadName}${businessName} email could not be delivered`
        case 'bounce':
          return `🔄 ${leadName}${businessName} email bounced back`
        case 'reply':
          return `💬 ${leadName}${businessName} replied to your email`
      }
    }
    
    // Handle event-based messages
    switch (eventType) {
      case 'opened':
        return `📧 ${leadName}${businessName} opened your email`
      case 'clicked':
        return `🔗 ${leadName}${businessName} clicked a link in your email`
      case 'replied':
        return `💬 ${leadName}${businessName} replied to your email`
      case 'seen':
        return `👁️ ${leadName}${businessName} has seen your message`
      default:
        return `📧 ${leadName}${businessName} email activity update`
    }
  }

  // Get event icon
  const getEventIcon = (eventType: string, status?: string) => {
    // Handle status-based icons first
    if (status) {
      switch (status) {
        case 'open':
          return <Mail className="h-4 w-4 text-blue-600" />
        case 'processed':
          return <Clock className="h-4 w-4 text-yellow-600" />
        case 'delivered':
          return <Mail className="h-4 w-4 text-green-600" />
        case 'not_delivered':
          return <Mail className="h-4 w-4 text-red-600" />
        case 'bounce':
          return <Mail className="h-4 w-4 text-orange-600" />
        case 'reply':
          return <MessageSquare className="h-4 w-4 text-purple-600" />
      }
    }
    
    // Handle event-based icons
    switch (eventType) {
      case 'opened':
        return <Eye className="h-4 w-4 text-blue-600" />
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-green-600" />
      case 'replied':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'seen':
        return <Eye className="h-4 w-4 text-orange-600" />
      default:
        return <Mail className="h-4 w-4 text-gray-600" />
    }
  }

  // Get event color
  const getEventColor = (eventType: string, status?: string) => {
    // Handle status-based colors first
    if (status) {
      switch (status) {
        case 'open':
          return 'border-blue-200 bg-blue-50'
        case 'processed':
          return 'border-yellow-200 bg-yellow-50'
        case 'delivered':
          return 'border-green-200 bg-green-50'
        case 'not_delivered':
          return 'border-red-200 bg-red-50'
        case 'bounce':
          return 'border-orange-200 bg-orange-50'
        case 'reply':
          return 'border-purple-200 bg-purple-50'
      }
    }
    
    // Handle event-based colors
    switch (eventType) {
      case 'opened':
        return 'border-blue-200 bg-blue-50'
      case 'clicked':
        return 'border-green-200 bg-green-50'
      case 'replied':
        return 'border-purple-200 bg-purple-50'
      case 'seen':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  // Filter notifications
  useEffect(() => {
    let filtered = notifications

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter - map "open" to "opened" event type
    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        // Map "open" status to "opened" event type
        filtered = filtered.filter(notification => notification.eventType === 'opened')
      } else {
        // For other statuses, filter by status field
        filtered = filtered.filter(notification => notification.status === statusFilter)
      }
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchTerm, statusFilter])

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications()
  }, [user?.id])

  const handleViewLead = (leadId: string) => {
    router.push(`/leads/${leadId}`)
  }

  const handleClearAll = async () => {
    if (notifications.length === 0) return
    
    setIsClearing(true)
    try {
      await clearNotifications()
      setNotifications([])
      setFilteredNotifications([])
    } catch (error) {
      console.error('Error clearing notifications:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleRefresh = () => {
    fetchNotifications()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading notifications...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <BellRing className="h-6 w-6 text-green-600" />
            ) : (
              <Bell className="h-6 w-6 text-gray-400" />
            )}
            <h1 className="text-2xl font-bold">All Notifications</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            {notifications.length} total
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            disabled={isClearing || notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Opened</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="not_delivered">Not Delivered</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="reply">Reply</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Notifications ({filteredNotifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-2 p-4">
                {filteredNotifications.map((notification, index) => (
                  <div
                    key={`${notification.leadId}-${notification.timestamp}-${index}`}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer",
                      getEventColor(notification.eventType, notification.status)
                    )}
                    onClick={() => handleViewLead(notification.leadId)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(notification.eventType, notification.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {notification.leadName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.leadStatus}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-3"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewLead(notification.leadId)
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Lead
                            </Button>
                          </div>
                        </div>
                        
                        {notification.businessName && (
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {notification.businessName}
                            </span>
                          </div>
                        )}
                        
                        <p className="text-base text-gray-700 mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {notification.status && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.status}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {notification.eventType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more notifications'
                    : 'Email activity will appear here when notifications are received'
                  }
                </p>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
