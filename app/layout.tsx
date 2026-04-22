import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import RootLayoutClient from "@/components/root-layout-client"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Founder Club CRM",
    template: "%s | Founder Club CRM",
  },
  description:
    "Founder Club CRM for managing leads, contacts, opportunities, policies, and advisor workflows.",
  applicationName: "Founder Club CRM",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Founder Club CRM",
    description:
      "Founder Club CRM for managing leads, contacts, opportunities, policies, and advisor workflows.",
    url: "/",
    siteName: "Founder Club CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Founder Club CRM",
    description:
      "Founder Club CRM for managing leads, contacts, opportunities, policies, and advisor workflows.",
  },
  icons: {
    icon: "/tab-logo.png",
    apple: "/tab-logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}
