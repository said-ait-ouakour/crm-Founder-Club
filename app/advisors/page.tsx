'use client';

import AdvisorActivityDashboard from '@/components/advisor-activity-dashboard';
import { useAuth, useIsAdmin, useIsAdvisor, useIsRecruiter } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdvisorsPage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const isAdvisor = useIsAdvisor();
  const isRecruiter = useIsRecruiter();
  const router = useRouter();

  // Check if user has access to performance page (managers, advisors, and recruiters)
  const hasAccess = isAdmin || isAdvisor || isRecruiter;

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // If user doesn't have access, redirect to unauthorized
    if (!hasAccess) {
      router.push('/unauthorized');
      return;
    }
  }, [user, loading, hasAccess, router]);

  // Show loading while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have access, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the performance page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <AdvisorActivityDashboard />
    </div>
  );
}
