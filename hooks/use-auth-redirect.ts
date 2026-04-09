import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export function useAuthRedirect(redirectTo?: string) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user && redirectTo) {
      // Clear the stored redirect URL
      localStorage.removeItem('redirect_url');
      router.push(redirectTo);
    }
  }, [user, loading, redirectTo, router]);

  return { user, loading };
}

export function useRedirectAfterAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Check if there's a stored redirect URL
      const redirectUrl = localStorage.getItem('redirect_url');
      if (redirectUrl) {
        localStorage.removeItem('redirect_url');
        router.push(redirectUrl);
      } else {
        // Default redirect to dashboard
        router.push('/');
      }
    }
  }, [user, loading, router]);

  return { user, loading };
}
