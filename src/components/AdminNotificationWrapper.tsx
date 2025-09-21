'use client';

import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import AdminNotificationPopup from './AdminNotificationPopup';

export default function AdminNotificationWrapper() {
  const { 
    stats, 
    isLoading, 
    shouldShowPopup, 
    acknowledgeAlerts, 
    dismissPopup 
  } = useAdminNotifications();

  if (!shouldShowPopup || !stats) {
    return null;
  }

  return (
    <AdminNotificationPopup
      stats={stats}
      isLoading={isLoading}
      onAcknowledge={acknowledgeAlerts}
      onClose={dismissPopup}
    />
  );
}