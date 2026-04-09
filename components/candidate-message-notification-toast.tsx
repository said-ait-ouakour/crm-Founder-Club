"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  ExternalLink, 
  X,
  Clock,
  User,
  Reply
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateMessageNotificationToastProps {
  notification: {
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
  };
  onClose: () => void;
  onViewCandidate: (candidateId: string) => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function CandidateMessageNotificationToast({ 
  notification, 
  onClose, 
  onViewCandidate,
  autoClose = true,
  autoCloseDelay = 8000
}: CandidateMessageNotificationToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(autoCloseDelay / 1000);

  // Auto-close functionality
  useEffect(() => {
    if (!autoClose) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(onClose, 300); // Allow fade out animation
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoClose, onClose]);

  const handleViewCandidate = () => {
    onViewCandidate(notification.candidateId);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reply':
        return 'border-purple-200 bg-purple-50';
      case 'sent':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reply':
        return 'bg-purple-100 text-purple-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "w-96 shadow-lg border-l-4 transition-all duration-300",
      getStatusColor(notification.status),
      "animate-in slide-in-from-right-full"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {notification.candidateName}
                </h4>
                <Badge variant="outline" className={getStatusBadge(notification.status)}>
                  {notification.status}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">
                {notification.message}
              </p>

              {notification.replyContent && (
                <div className="mb-2 p-2 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Reply className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Reply:</span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2">
                    {notification.replyContent}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {autoClose && timeRemaining > 0 && (
                  <div className="text-xs text-gray-400">
                    Auto-close in {timeRemaining}s
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewCandidate}
              className="text-xs h-7 px-2"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar for auto-close */}
        {autoClose && timeRemaining > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gray-400 h-1 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(timeRemaining / (autoCloseDelay / 1000)) * 100}%` 
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
