'use client'

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '@/contexts/auth-context';
import { FullScreenLoading } from '@/components/ui/loading';

type ProtectedRouteProps = {
  children: React.ReactNode
  /**
   * Required role to access this route
   * If not provided, any authenticated user can access
   */
  requiredRole?: UserRole
  /**
   * If true, only admin managers can access this route
   * Shortcut for requiredRole="manager"
   */
  adminOnly?: boolean
  /**
   * If true, only advisors can access this route
   * Shortcut for requiredRole="advisor"
   */
  advisorOnly?: boolean
}

export default function ProtectedRoute({
  children,
  requiredRole,
  adminOnly = false,
  advisorOnly = false,
}: ProtectedRouteProps) {
  const { user, profile, loading, hasRole } = useAuth();
  const router = useRouter();

  // Determine the required role based on props
  const role = useMemo(() => {
    if (adminOnly) return 'manager' as const;
    if (advisorOnly) return 'advisor' as const;
    return requiredRole;
  }, [requiredRole, adminOnly, advisorOnly]);

  // Check if user has the required role
  const hasRequiredRole = useMemo(() => {
    if (!role) return true; // No role requirement
    if (!user || !profile) return false; // Not authenticated
    return hasRole(role);
  }, [role, user, profile, hasRole]);

  // Handle authentication and authorization
  useEffect(() => {
    // If we're still loading, don't do anything yet
    if (loading) {
      return;
    }
    
    // If there's no user, redirect to login
    if (!user) {
      // Store the current URL to redirect back after login
      const redirectUrl = window.location.pathname + window.location.search;
      localStorage.setItem('redirect_url', redirectUrl);
      router.push('/auth/login');
      return;
    }
    
    // If we have a user but no profile yet, wait for it (profile loads in background after auth)
    if (user && !profile) {
      const timeout = setTimeout(() => {
        console.warn("[ProtectedRoute] Profile fetch timeout - redirecting to login");
        router.push('/auth/login');
      }, 15000); // 15s for background profile fetch
      return () => clearTimeout(timeout);
    }
    
    // Check if user has the required role
    if (role && !hasRequiredRole) {
      router.push('/unauthorized');
      return;
    }
  }, [user, profile, loading, router, role, hasRequiredRole]);

  // Single loading state: auth + profile load together, so one message is enough
  if (loading) {
    return <FullScreenLoading text="Loading..." />;
  }

  // If no user, show loading while redirecting
  if (!user) {
    return <FullScreenLoading text="Redirecting to login..." />;
  }

  // Edge case: user but profile failed to load (rare)
  if (user && !profile) {
    return <FullScreenLoading text="Loading..." />;
  }

  // Check role-based access
  if (role && !hasRequiredRole) {
    return <FullScreenLoading text="Checking permissions..." />;
  }

  // User is authenticated and authorized, render the children
  return <>{children}</>;
}
