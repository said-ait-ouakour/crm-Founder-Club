"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * LinkedIn is now a channel on the lead page. Redirect to the lead detail page
 * with the LinkedIn channel tab selected.
 */
export default function LeadLinkedInRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params?.id as string

  useEffect(() => {
    if (leadId) {
      router.replace(`/leads/${leadId}?channel=linkedin`)
    }
  }, [leadId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-muted-foreground">Redirecting to lead…</p>
    </div>
  )
}
