"use client"

import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function NewContactFactFindPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main factfind creation page with contact_id parameter
    window.location.href =  `/factfinds/new?contact_id=${params.id}`
  }, [params.id, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
