'use client';

import { useEffect } from 'react';
import { HubstaffTokenManager } from '@/lib/hubstaff-token-manager';

export default function HubstaffTokenInitializer() {
  useEffect(() => {
    // Initialize token when component mounts
    const initializeToken = async () => {
      try {
        // This will automatically get a valid token (either from storage or by refreshing)
        await HubstaffTokenManager.getValidAccessToken();
        console.log('Hubstaff token initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Hubstaff token:', error);
      }
    };

    initializeToken();
  }, []);

  // This component doesn't render anything
  return null;
}
