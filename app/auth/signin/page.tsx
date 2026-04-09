'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Supabase login page
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Redirecting...</h2>
          <p className="mt-2 text-sm text-gray-600">Please wait while we redirect you to the login page.</p>
        </div>
      </div>
    </div>
  );
}
