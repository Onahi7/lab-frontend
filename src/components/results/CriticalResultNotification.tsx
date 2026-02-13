import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, Phone, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { criticalResultsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function CriticalResultNotificationSystem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unacknowledged critical results
  const { data: criticalNotifications } = useQuery({
    queryKey: ['critical-notifications'],
    queryFn: async () => {
      return await criticalResultsAPI.getUnacknowledged();
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Acknowledge notification
  const acknowledgeNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      return await criticalResultsAPI.acknowledge(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['critical-notifications'] });
      toast.success('Notification acknowledged');
    }
  });

  // Show toast for new critical results
  useEffect(() => {
    if (criticalNotifications && criticalNotifications.length > 0) {
      const latestNotification = criticalNotifications[0];
      const timeSinceNotification = Date.now() - new Date(latestNotification.notifiedAt).getTime();
      
      // Only show toast if notification is less than 1 minute old
      if (timeSinceNotification < 60000) {
        toast.error(
          `Critical Result: ${latestNotification.result?.testCode} - ${latestNotification.result?.patient?.firstName} ${latestNotification.result?.patient?.lastName}`,
          {
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => {
                // Navigate to result or show details
              }
            }
          }
        );
      }
    }
  }, [criticalNotifications]);

  if (!criticalNotifications || criticalNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {criticalNotifications.slice(0, 3).map((notification: any) => (
        <Alert key={notification.id} variant="destructive" className="shadow-lg">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold">Critical Result Alert</p>
                <p className="text-sm mt-1">
                  Patient: {notification.result?.patient?.firstName} {notification.result?.patient?.lastName}
                </p>
                <p className="text-sm">
                  Test: {notification.result?.testCode} = {notification.result?.value} {notification.result?.unit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.notifiedAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeNotification.mutate(notification.id)}
                className="shrink-0"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Acknowledge
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// Hook to create critical result notification
export async function createCriticalResultNotification(resultId: string, userId: string) {
  // This would need to be implemented in the backend
  console.warn('createCriticalResultNotification not yet implemented in backend');
}
