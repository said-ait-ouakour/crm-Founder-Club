// In-memory store for candidate message notifications
// Key: recruiter user_id (from users table), Value: array of notifications
export const candidateMessageNotifications = new Map<string, any[]>();

// Clean up old notifications (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  candidateMessageNotifications.forEach((notifications, userId) => {
    const filtered = notifications.filter((n: any) => {
      const timestamp = typeof n.timestamp === 'string' 
        ? new Date(n.timestamp).getTime() 
        : (n.timestamp * 1000); // Convert Unix timestamp to milliseconds
      return timestamp > oneHourAgo;
    });
    if (filtered.length === 0) {
      candidateMessageNotifications.delete(userId);
    } else {
      candidateMessageNotifications.set(userId, filtered);
    }
  });
}, 5 * 60 * 1000); // Clean up every 5 minutes
