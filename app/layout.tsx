'use client';

import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { Suspense } from "react";
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Toaster } from "@/components/ui/toaster";
import { NotificationManager } from "@/components/notification-manager";
import { CandidateMessageNotificationManager } from "@/components/candidate-message-notification-manager";
import HubstaffTokenInitializer from "@/components/hubstaff-token-initializer";

// export const metadata: Metadata = {
//   title: "People Manager CRM",
//   description: "Comprehensive CRM for Lead, Contact, and Policy Management",
//   generator: 'peoplemanager.co',
//   viewport: 'width=device-width, initial-scale=1',
// }

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if the current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/unauthorized';
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        {/* <SessionProvider> */}
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div className="h-screen w-full flex overflow-hidden">
                <Navigation />
                <main className="flex-1 h-screen overflow-y-auto md:pt-0 pt-16">
                  <Suspense fallback={<div>Loading...</div>}>
                    <ProtectedLayout>
                      {children}
                    </ProtectedLayout>
                  </Suspense>
                </main>
              </div>
              <Toaster />
              <NotificationManager maxNotifications={3} autoCloseDelay={8000} />
              <CandidateMessageNotificationManager maxNotifications={3} autoCloseDelay={8000} />
              {/* <HubstaffTokenInitializer /> */}
            </ThemeProvider>
          </AuthProvider>
        {/* </SessionProvider> */}
      </body>
    </html>
  )
}
