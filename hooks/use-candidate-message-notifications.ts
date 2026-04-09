import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface CandidateMessageNotification {
  id: string;
  type: 'candidate_message_notification';
  candidateId: string;
  candidateName: string;
  status: string;
  messageId: string;
  timestamp: string;
  metadata?: any;
  replyContent?: string;
  redirectUrl: string;
  message: string;
  createdAt: string;
}

interface UseCandidateMessageNotificationsOptions {
  onNotification?: (notification: CandidateMessageNotification) => void;
  autoConnect?: boolean;
  pollInterval?: number;
}

export function useCandidateMessageNotifications({
  onNotification,
  autoConnect = true,
  pollInterval = 30000, // Poll every 30 seconds (matches email notification system)
}: UseCandidateMessageNotificationsOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<CandidateMessageNotification[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = useRef<number>(0); // Initialize to 0, not NaN
  const isPageVisibleRef = useRef<boolean>(true);
  const onNotificationRef = useRef(onNotification);
  const isInitialFetchRef = useRef<boolean>(true);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set()); // Track seen notification IDs

  // Update ref when callback changes (without causing re-renders)
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/candidate-message-notifications?userId=${user.id}&limit=50`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[Candidate Messages] Fetched notifications:', {
            count: data.notifications?.length || 0,
            isInitial: isInitialFetchRef.current,
            lastTime: lastNotificationTimeRef.current,
            lastTimeValid: !isNaN(lastNotificationTimeRef.current),
            sampleNotification: data.notifications?.[0] ? {
              timestamp: data.notifications[0].timestamp,
              timestampType: typeof data.notifications[0].timestamp
            } : null
          });
        }
        
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(prev => {
            const allNotifications = data.notifications as CandidateMessageNotification[];
            
            // Helper function to parse timestamp safely
            const parseTimestamp = (timestamp: string | number | undefined): number => {
              if (!timestamp) return 0;
              if (typeof timestamp === 'string') {
                const parsed = new Date(timestamp).getTime();
                return isNaN(parsed) ? 0 : parsed;
              }
              if (typeof timestamp === 'number') {
                // If it's already in milliseconds, use as is; otherwise multiply by 1000
                return timestamp > 1e12 ? timestamp : timestamp * 1000;
              }
              return 0;
            };

            // On initial fetch, treat all notifications as new
            // Otherwise, filter by ID (once seen, never show again) and timestamp
            const currentLastTime = isNaN(lastNotificationTimeRef.current) ? 0 : lastNotificationTimeRef.current;
            const newNotifications = isInitialFetchRef.current
              ? allNotifications
              : allNotifications.filter((notification: CandidateMessageNotification) => {
                  // If we've already seen this exact notification ID, never show it again
                  if (seenNotificationIdsRef.current.has(notification.id)) {
                    return false;
                  }
                  
                  // Use createdAt if available (most reliable), otherwise use timestamp
                  const notificationTime = parseTimestamp(notification.createdAt || notification.timestamp);
                  
                  if (notificationTime === 0) {
                    // Invalid timestamp, skip it
                    return false;
                  }
                  
                  // Only show notifications that are newer than the last seen time
                  // Use a buffer (10 seconds) to account for timing precision
                  const bufferTime = 10000; // 10 seconds in milliseconds
                  return notificationTime > (currentLastTime - bufferTime);
                });

            // Update last notification time to the latest notification (from all, not just new)
            // Use createdAt if available (more reliable), otherwise use timestamp
            if (allNotifications.length > 0) {
              const timestamps = allNotifications
                .map((n: CandidateMessageNotification) => {
                  // Prefer createdAt over timestamp for comparison
                  const timeSource = n.createdAt || n.timestamp;
                  if (typeof timeSource === 'string') {
                    const parsed = new Date(timeSource).getTime();
                    return isNaN(parsed) ? 0 : parsed;
                  } else if (typeof timeSource === 'number') {
                    // If it's already in milliseconds, use as is; otherwise multiply by 1000
                    return timeSource > 1e12 ? timeSource : timeSource * 1000;
                  }
                  return 0;
                })
                .filter(t => t > 0); // Filter out invalid timestamps
              
              if (timestamps.length > 0) {
                const latestTime = Math.max(...timestamps);
                if (!isNaN(latestTime) && latestTime > 0) {
                  lastNotificationTimeRef.current = Math.max(
                    isNaN(lastNotificationTimeRef.current) ? 0 : lastNotificationTimeRef.current,
                    latestTime
                  );
                }
              }
              
              // Track all notification IDs we've seen, but limit the set size to prevent memory issues
              // Keep only the most recent 100 notification IDs
              allNotifications.forEach(n => {
                seenNotificationIdsRef.current.add(n.id);
              });
              
              // Clean up old IDs if set gets too large (keep last 100)
              if (seenNotificationIdsRef.current.size > 100) {
                const idsArray = Array.from(seenNotificationIdsRef.current);
                // Keep the most recent 100 IDs (assuming they're added in order)
                seenNotificationIdsRef.current = new Set(idsArray.slice(-100));
              }
            }

            // Mark initial fetch as complete after first fetch
            if (isInitialFetchRef.current) {
              isInitialFetchRef.current = false;
            }

            // Call onNotification for each new notification using ref
            if (onNotificationRef.current && newNotifications.length > 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Candidate Messages] Triggering onNotification for', newNotifications.length, 'notifications', {
                  newNotifications: newNotifications.map(n => ({
                    id: n.id,
                    candidateName: n.candidateName,
                    timestamp: n.timestamp,
                    parsedTime: parseTimestamp(n.timestamp)
                  }))
                });
              }
              newNotifications.forEach(notification => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Candidate Messages] Calling onNotification for:', notification.id, notification.candidateName);
                }
                onNotificationRef.current?.(notification);
              });
            } else if (process.env.NODE_ENV === 'development') {
              console.log('[Candidate Messages] No new notifications to trigger', {
                newCount: newNotifications.length,
                hasCallback: !!onNotificationRef.current,
                allCount: allNotifications.length,
                isInitial: isInitialFetchRef.current
              });
            }

            // Merge with existing notifications, avoiding duplicates
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNew = newNotifications.filter((n: CandidateMessageNotification) => {
              const isNew = !existingIds.has(n.id);
              if (isNew && process.env.NODE_ENV === 'development') {
                console.log('[Candidate Messages] New notification detected:', {
                  id: n.id,
                  candidateName: n.candidateName,
                  timestamp: n.timestamp,
                  createdAt: n.createdAt
                });
              }
              return isNew;
            });
            
            return [...uniqueNew, ...prev].slice(0, 50); // Keep max 50 notifications
          });
        } else {
          // Mark initial fetch as complete even if no notifications
          isInitialFetchRef.current = false;
        }
      }
    } catch (error) {
      console.error('Error fetching candidate message notifications:', error);
    }
  }, [user?.id]);

  const connect = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsConnected(true);
    // Don't set lastNotificationTimeRef here - let initial fetch handle it
    isInitialFetchRef.current = true;

    // Initial fetch
    await fetchNotifications();

    // Start polling
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      // Only poll if page is visible
      if (isPageVisibleRef.current) {
        fetchNotifications();
      }
    }, pollInterval);

  }, [user?.id, fetchNotifications, pollInterval]);

  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect && user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user?.id, connect, disconnect]);

  // Handle page visibility to pause polling when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      // If page becomes visible and we're connected, fetch immediately
      if (!document.hidden && isConnected && user?.id) {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, user?.id, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    clearNotifications: () => setNotifications([]),
  };
}
