'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case 'OAuthSignin':
        return 'Error in OAuth sign in process';
      case 'OAuthCallback':
        return 'Error in OAuth callback';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth user';
      case 'EmailCreateAccount':
        return 'Could not create email user';
      case 'Callback':
        return 'Error in the OAuth callback handler';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account';
      case 'EmailSignin':
        return 'Error sending sign-in email';
      case 'CredentialsSignin':
        return 'Sign in failed. Check your credentials';
      case 'SessionRequired':
        return 'Please sign in to access this page';
      case 'Default':
      default:
        return 'An error occurred during authentication';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-gray-600">
            We couldn't sign you in. Please try again or contact support if the problem persists.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {getErrorMessage(error)}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col space-y-3">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return Home
          </Button>
          <Button
            onClick={() => window.location.href = '/auth/login'}
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}