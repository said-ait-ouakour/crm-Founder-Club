"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateMessageNotifications } from '@/hooks/use-candidate-message-notifications';
import { CandidateMessageNotificationToast } from '@/components/candidate-message-notification-toast';
import { useAuth } from '@/contexts/auth-context';

interface CandidateMessageNotificationManagerProps {
  maxNotifications?: number;
  autoCloseDelay?: number;
}

export function CandidateMessageNotificationManager({ 
  maxNotifications = 3,
  autoCloseDelay = 8000 
}: CandidateMessageNotificationManagerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [notificationQueue, setNotificationQueue] = useState<any[]>([]);

  // Memoize the callback to prevent hook re-initialization
  const handleNotification = useCallback((notification: any) => {
    console.log('New candidate message notification received:', notification);
    
    // Check if this notification is already in active notifications or queue
    setActiveNotifications(prev => {
      // Check if notification with same ID already exists
      const alreadyExists = prev.some(n => n.id === notification.id);
      if (alreadyExists) {
        console.log('Notification already shown, skipping:', notification.id);
        return prev;
      }
      
      if (prev.length >= maxNotifications) {
        // Check queue too before adding
        setNotificationQueue(queue => {
          const inQueue = queue.some(n => n.id === notification.id);
          if (inQueue) {
            console.log('Notification already in queue, skipping:', notification.id);
            return queue;
          }
          return [...queue, notification];
        });
        return prev;
      } else {
        return [...prev, notification];
      }
    });
  }, [maxNotifications]);

  const { isConnected, notifications, clearNotifications } = useCandidateMessageNotifications({
    onNotification: handleNotification
  });

  // Process notification queue when space becomes available
  useEffect(() => {
    if (activeNotifications.length < maxNotifications && notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0];
      setActiveNotifications(prev => [...prev, nextNotification]);
      setNotificationQueue(prev => prev.slice(1));
    }
  }, [activeNotifications.length, maxNotifications, notificationQueue]);

  const handleCloseNotification = (notificationId: string) => {
    setActiveNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  };

  const handleViewCandidate = (candidateId: string) => {
    router.push(`/candidates/${candidateId}`);
  };

  // Show connection status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Candidate message notifications connection status:', isConnected ? 'Connected' : 'Disconnected');
    }
  }, [isConnected]);

  return (
    <div className="fixed top-4 right-4 z-40 space-y-2">
      {activeNotifications.map((notification, index) => (
        <div 
          key={`${notification.candidateId}-${notification.timestamp}-${index}`}
          className="animate-in slide-in-from-right-full"
          style={{ 
            animationDelay: `${index * 100}ms`,
            zIndex: 50 - index 
          }}
        >
          <CandidateMessageNotificationToast
            notification={notification}
            onClose={() => handleCloseNotification(notification.id)}
            onViewCandidate={handleViewCandidate}
            autoClose={true}
            autoCloseDelay={autoCloseDelay}
          />
        </div>
      ))}
      
      {/* Connection status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-purple-800 text-white px-3 py-1 rounded text-xs">
          CM: {isConnected ? '🟢' : '🔴'} | Notifications: {notifications.length}
        </div>
      )}
    </div>
  );
}
