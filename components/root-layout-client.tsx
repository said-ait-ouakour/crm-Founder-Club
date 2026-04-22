'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/auth-context'
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import ProtectedRoute from '@/components/protected-route'
import { Toaster } from '@/components/ui/toaster'
import { NotificationManager } from '@/components/notification-manager'
import { CandidateMessageNotificationManager } from '@/components/candidate-message-notification-manager'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/unauthorized'

  if (isAuthPage) {
    return <>{children}</>
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="h-screen w-full flex overflow-hidden">
          <Navigation />
          <main className="flex-1 h-screen overflow-y-auto md:pt-0 pt-16">
            <Suspense fallback={<div>Loading...</div>}>
              <ProtectedLayout>{children}</ProtectedLayout>
            </Suspense>
          </main>
        </div>
        <Toaster />
        <NotificationManager maxNotifications={3} autoCloseDelay={8000} />
        <CandidateMessageNotificationManager maxNotifications={3} autoCloseDelay={8000} />
      </ThemeProvider>
    </AuthProvider>
  )
}
